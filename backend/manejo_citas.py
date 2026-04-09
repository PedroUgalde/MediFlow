from pydantic import BaseModel
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import Dict, List, Any, Optional
import re
import unicodedata
from connectionManager import manager # Importamos la instancia única


def normalize_area_key(area: str) -> str:
    normalized = unicodedata.normalize("NFKD", area).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower().strip()
    normalized = re.sub(r"[_]+", " ", normalized)
    normalized = re.sub(r"[^a-z0-9\s-]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized)

    aliases = {
        "laboratorio sangre": "sangre",
        "laboratorio de sangre": "sangre",
        "analisis de sangre": "sangre",
        "rayos x": "rayos-x",
        "rayos-x": "rayos-x",
        "cardiologia": "cardiologia",
        "consulta general": "general",
        "ultrasonido": "ultrasonido",
        "general": "general",
        "sangre": "sangre",
    }

    if normalized in aliases:
        return aliases[normalized]

    return normalized.replace(" ", "-")

# --- SCHEMAS ---
class ReporteRetraso(BaseModel):
    motivo: str
    area: str
    estudio_id: Optional[int] = None

class LlamadoPacienteRequest(BaseModel):
    id_paciente: str
    id_doctor: str
    nombre_doctor: str
    consultorio: str
    mensaje: Optional[str] = None

class EstadoCitaRequest(BaseModel):
    appointment_id: str
    id_paciente: str
    id_doctor: str
    nombre_doctor: str
    consultorio: Optional[str] = None

# --- ROUTER CONFIG ---
router = APIRouter()

# --- WEBSOCKET ENDPOINTS ---

@router.websocket("/ws/pacientes/{id_paciente}")
async def gestionar_fila(websocket: WebSocket, id_paciente: str):
    await manager.connect(manager.pacientes, id_paciente, websocket)
    try:
        while True:
            # Mantenemos la conexión abierta
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(manager.pacientes, id_paciente, websocket)

@router.websocket("/ws/estudios/{estudio_id}")
async def ws_estudio(websocket: WebSocket, estudio_id: int):
    await manager.connect(manager.estudios, estudio_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(manager.estudios, estudio_id, websocket)

@router.websocket("/ws/areas/{area}")
async def ws_area(websocket: WebSocket, area: str):
    area_key = normalize_area_key(area)
    await manager.connect(manager.areas, area_key, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(manager.areas, area_key, websocket)

# --- AUXILIAR BROADCAST LOGIC ---

async def _broadcast_estado_cita(data: EstadoCitaRequest, estado: str, message: str, progress: int) -> Dict[str, Any]:
    payload = {
        "type": "appointment_status_changed",
        "appointment_id": data.appointment_id,
        "id_paciente": data.id_paciente,
        "id_doctor": data.id_doctor,
        "nombre_doctor": data.nombre_doctor,
        "consultorio": data.consultorio,
        "status": estado,
        "progress": progress,
        "message": message,
    }

    # Usamos el manager para enviar al paciente específico
    enviados = 0
    if data.id_paciente in manager.pacientes:
        enviados = await manager.broadcast(manager.pacientes[data.id_paciente], payload)
    
    return {
        "ok": True,
        "enviados": enviados,
        "evento": payload,
    }

# --- HTTP POST ENDPOINTS ---

@router.post("/citas/tomar")
async def tomar_cita(data: EstadoCitaRequest):
    consultorio = data.consultorio or "consultorio asignado"
    return await _broadcast_estado_cita(
        data,
        estado="in-progress",
        message=f"Pase con {data.nombre_doctor} al {consultorio}",
        progress=20,
    )

@router.post("/citas/finalizar")
async def finalizar_cita(data: EstadoCitaRequest):
    return await _broadcast_estado_cita(
        data,
        estado="completed",
        message=f"Tu cita con {data.nombre_doctor} fue completada.",
        progress=100,
    )

@router.post("/citas/devolver")
async def devolver_cita(data: EstadoCitaRequest):
    return await _broadcast_estado_cita(
        data,
        estado="waiting",
        message=f"Tu cita con {data.nombre_doctor} volvió a la fila.",
        progress=0,
    )