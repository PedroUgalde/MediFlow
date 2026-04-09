from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.queries import (
    select_healthcheck,
    select_postgres_version,
    select_all_citas,
    select_appointments_by_folio,
    select_usuarios,
    select_folios_id_citas,
    set_status_cita,
    select_estudios_catalogo,
    insert_cita_agendada_multiple,
)


router = APIRouter()


class SimularPagoRequest(BaseModel):
    folio: str


class AgendarCitaRequest(BaseModel):
    class EstudioAgendaItem(BaseModel):
        estudio_id: int
        fecha_cita: str
        hora_programada: str

    paciente_id: int
    estudios: list[EstudioAgendaItem]
    agenda_online: bool = True


@router.get("/health")
def db_health() -> dict:
    try:    
        return {"ok": True, "data": select_healthcheck()}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error de conexion: {error}")


@router.get("/version")
def db_version() -> dict:
    try:
        return {"ok": True, "data": select_postgres_version()}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error de consulta: {error}")


@router.get("/citas_todas")
def db_tables() -> dict:
    try:
        return {"ok": True, "data": select_all_citas()}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error de consulta: {error}")


@router.get("/citas/{folio}")
def get_appointments_by_folio(folio: str) -> dict:
    try:
        return {"ok": True, "data": select_appointments_by_folio(folio)}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error de consulta: {error}")

@router.get("/usuarios")
def get_usuarios() -> dict:
    try:
        return {"ok": True, "data": select_usuarios()}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error de consulta: {error}")
    
@router.get("/folios_id_citas")
def get_folios_id_citas() -> dict:
    try:
        return {"ok": True, "data": select_folios_id_citas()}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error de consulta: {error}")


@router.get("/estudios")
def get_estudios_catalogo() -> dict:
    try:
        return {"ok": True, "data": select_estudios_catalogo()}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error de consulta: {error}")

@router.post("/simular_pago")
def update_cita_status(payload: SimularPagoRequest) -> dict:
    print("simuladndo el pago de la cita con folio:", payload.folio)
    try:
        set_status_cita(payload.folio, "en_espera")
        return {"ok": True, "data": "Estado de la cita actualizado a waiting"}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error al actualizar el estado: {error}")


@router.post("/agendar-cita")
def agendar_cita(payload: AgendarCitaRequest) -> dict:
    print("Agendando cita para paciente_id:", payload.paciente_id, "con", len(payload.estudios), "estudios")
    try:
        result = insert_cita_agendada_multiple(
            paciente_id=payload.paciente_id,
            estudios=[item.model_dump() for item in payload.estudios],
            agenda_online=payload.agenda_online,
        )
        return {
            "ok": True,
            "data": {
                "appointmentIds": [f"a{id_cita}" for id_cita in result["ids"]],
                "folio": result["folio"],
                "total_estudios": result["total_estudios"],
                "message": "Cita agendada correctamente",
            },
        }
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error al agendar cita: {error}")

# @router.get("/quinielas/{quiniela_id}")
# def get_quiniela_by_id(quiniela_id: int) -> dict:
#     try:
#         data = select_quiniela_by_id(quiniela_id)
#         if not data:
#             raise HTTPException(status_code=404, detail="Quiniela no encontrada")
#         return {"ok": True, "data": data[0]}
#     except HTTPException:
#         raise
#     except Exception as error:
#         raise HTTPException(status_code=500, detail=f"Error de consulta: {error}")
