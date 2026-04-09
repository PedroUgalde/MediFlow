from typing import Dict, List, Any
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.pacientes: Dict[str, List[WebSocket]] = {}
        self.estudios: Dict[int, List[WebSocket]] = {}
        self.areas: Dict[str, List[WebSocket]] = {}

    async def connect(self, target_dict: dict, key: Any, websocket: WebSocket):
        await websocket.accept()
        target_dict.setdefault(key, []).append(websocket)

    def disconnect(self, target_dict: dict, key: Any, websocket: WebSocket):
        if key in target_dict:
            if websocket in target_dict[key]:
                target_dict[key].remove(websocket)
            if not target_dict[key]:
                target_dict.pop(key)

    async def broadcast(self, conexiones: List[WebSocket], payload: dict) -> int:
        enviados = 0
        desconectados = []
        for conexion in conexiones:
            try:
                await conexion.send_json(payload)
                enviados += 1
            except Exception:
                desconectados.append(conexion)
        
        # Limpieza automática de sockets muertos
        for d in desconectados:
            if d in conexiones: conexiones.remove(d)
        return enviados

# Instancia única para toda la app
manager = ConnectionManager()