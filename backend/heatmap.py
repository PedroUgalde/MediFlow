"""
routers/heatmap.py
Endpoints para los dos heatmaps de ocupabilidad.

Instalar dependencias:
    pip install fastapi sqlalchemy python-dateutil

Montar en main.py:
    from routers.heatmap import router as heatmap_router
    app.include_router(heatmap_router, prefix="/api/heatmap", tags=["heatmap"])
"""

from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel


# Ajusta estas importaciones a tu proyecto
# from database import get_db
# from models import Cita

router = APIRouter()

# ---------------------------------------------------------------------------
# Esquemas de respuesta
# ---------------------------------------------------------------------------

class HeatmapPacienteResponse(BaseModel):
    titulo: str
    dias: list[str]
    horas: list[str]
    # z[hora_idx][dia_idx] = slots disponibles restantes. -1 = no disponible.
    z: list[list[int]]


class ResumenDoctor(BaseModel):
    total_citas: int
    promedio_dia: int
    pct_ocupacion: int
    dia_mas_activo: str


class HeatmapDoctorResponse(BaseModel):
    titulo: str
    dias: list[str]
    semanas: list[str]
    # z[semana_idx][dia_idx] = número de citas agendadas
    z: list[list[int]]
    # texto[semana_idx][dia_idx] = porcentaje formateado, p.ej. "72%"
    texto: list[list[str]]
    capacidad_max: int
    resumen: ResumenDoctor


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

DIAS_SEMANA   = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
HORAS_DIA     = ["08:00","09:00","10:00","11:00","12:00","13:00","15:00","16:00","17:00","18:00"]
SLOTS_POR_HORA = 4    # capacidad máxima de citas por hora
TIPOS_ESTUDIO  = {"consulta", "rayos_x", "laboratorio", "ultrasonido", "all"}


# ---------------------------------------------------------------------------
# Endpoint 1 — Vista paciente
# GET /api/heatmap/paciente
# ---------------------------------------------------------------------------

@router.get("/paciente", response_model=HeatmapPacienteResponse)
def heatmap_paciente(
    medico_id: Optional[int] = Query(None, description="Filtrar por médico específico"),
    semana_offset: int       = Query(0,    description="0 = semana actual, 1 = siguiente, etc."),
    # db: Session            = Depends(get_db),
):
    """
    Devuelve la disponibilidad de slots por día de la semana vs hora del día.
    
    Cada celda indica cuántos slots quedan libres en ese horario.
    Un valor de -1 indica que el horario no existe (fuera de operación).
    """
    hoy        = date.today()
    inicio_sem = hoy - timedelta(days=hoy.weekday()) + timedelta(weeks=semana_offset)
    fin_sem    = inicio_sem + timedelta(days=5)  # lunes a sábado

    titulo = (
        f"Disponibilidad — semana del {inicio_sem.strftime('%d/%m')} "
        f"al {fin_sem.strftime('%d/%m/%Y')}"
    )

    # -----------------------------------------------------------------------
    # REEMPLAZA ESTE BLOQUE con tu consulta real a la DB
    # Ejemplo con SQLAlchemy:
    #
    #   from sqlalchemy import func
    #   citas = (
    #       db.query(
    #           Cita.fecha,
    #           Cita.hora,
    #           func.count(Cita.id).label("conteo"),
    #       )
    #       .filter(
    #           Cita.fecha.between(inicio_sem, fin_sem),
    #           Cita.estado != "cancelada",
    #           *([Cita.medico_id == medico_id] if medico_id else []),
    #       )
    #       .group_by(Cita.fecha, Cita.hora)
    #       .all()
    #   )
    #   ocupadas = {(c.fecha.weekday(), c.hora): c.conteo for c in citas}
    # -----------------------------------------------------------------------

    # Datos de ejemplo (elimina cuando conectes la DB)
    import random
    random.seed(int(inicio_sem.strftime("%Y%W")) + (medico_id or 0))
    ocupadas = {
        (dia, hora): random.randint(0, SLOTS_POR_HORA)
        for dia in range(6)
        for hora in HORAS_DIA
    }

    # Construir matriz z[hora_idx][dia_idx]
    z: list[list[int]] = []
    for hora in HORAS_DIA:
        fila: list[int] = []
        for dia_idx in range(6):
            # Sábado solo hasta las 13:00
            if dia_idx == 5 and hora >= "14:00":
                fila.append(-1)
            else:
                ocupado  = ocupadas.get((dia_idx, hora), 0)
                restantes = max(0, SLOTS_POR_HORA - ocupado)
                fila.append(restantes)
        z.append(fila)

    return HeatmapPacienteResponse(
        titulo=titulo,
        dias=DIAS_SEMANA,
        horas=HORAS_DIA,
        z=z,
    )


# ---------------------------------------------------------------------------
# Endpoint 2 — Vista doctor
# GET /api/heatmap/doctor
# ---------------------------------------------------------------------------

@router.get("/doctor", response_model=HeatmapDoctorResponse)
def heatmap_doctor(
    medico_id: Optional[int] = Query(None),
    mes:       int            = Query(..., ge=1, le=12),
    anio:      int            = Query(..., ge=2020),
    estudio:   str            = Query("all", description="all | consulta | rayos_x | laboratorio | ultrasonido"),
    # db: Session             = Depends(get_db),
):
    """
    Devuelve citas agendadas agrupadas por semana del mes vs día de la semana.
    Incluye porcentaje de ocupación por celda y un resumen mensual.
    
    El parámetro `estudio` permite filtrar por tipo de atención.
    """
    if estudio not in TIPOS_ESTUDIO:
        raise HTTPException(status_code=422, detail=f"estudio debe ser uno de: {TIPOS_ESTUDIO}")

    # Calcular semanas del mes (lunes a sábado)
    primer_dia  = date(anio, mes, 1)
    ultimo_dia  = _ultimo_dia_mes(anio, mes)
    semanas_raw = _calcular_semanas(primer_dia, ultimo_dia)
    etiquetas_semanas = [f"Sem {i+1}" for i in range(len(semanas_raw))]

    CAPACIDAD_DIA = SLOTS_POR_HORA * len(HORAS_DIA)  # citas máximas por día

    titulo_estudio = next((e["label"] for e in _estudios_list() if e["value"] == estudio), "Todos")
    titulo = f"Ocupación — {titulo_estudio} · {_nombre_mes(mes)} {anio}"

    # -----------------------------------------------------------------------
    # REEMPLAZA ESTE BLOQUE con tu consulta real
    #
    #   from sqlalchemy import func
    #   filtros = [
    #       Cita.fecha.between(primer_dia, ultimo_dia),
    #       Cita.estado != "cancelada",
    #   ]
    #   if medico_id:  filtros.append(Cita.medico_id == medico_id)
    #   if estudio != "all": filtros.append(Cita.tipo_estudio == estudio)
    #
    #   citas = (
    #       db.query(Cita.fecha, func.count(Cita.id).label("conteo"))
    #       .filter(*filtros)
    #       .group_by(Cita.fecha)
    #       .all()
    #   )
    #   citas_por_fecha = {c.fecha: c.conteo for c in citas}
    # -----------------------------------------------------------------------

    # Datos de ejemplo (elimina cuando conectes la DB)
    import random
    random.seed(mes * 100 + anio + (medico_id or 0) + hash(estudio) % 1000)
    citas_por_fecha = {
        primer_dia + timedelta(days=d): random.randint(0, CAPACIDAD_DIA)
        for d in range((ultimo_dia - primer_dia).days + 1)
        if (primer_dia + timedelta(days=d)).weekday() < 6
    }

    # Construir matrices z y texto[semana_idx][dia_idx]
    z: list[list[int]]    = []
    texto: list[list[str]] = []

    for inicio_sem, fin_sem in semanas_raw:
        fila_z:    list[int] = []
        fila_txt:  list[str] = []
        for dia_idx in range(6):  # lun=0 … sáb=5
            dia_fecha = inicio_sem + timedelta(days=dia_idx)
            if dia_fecha < primer_dia or dia_fecha > ultimo_dia:
                # Día fuera del mes
                fila_z.append(0)
                fila_txt.append("")
            else:
                citas = citas_por_fecha.get(dia_fecha, 0)
                pct   = math.floor((citas / CAPACIDAD_DIA) * 100)
                fila_z.append(citas)
                fila_txt.append(f"{pct}%")
        z.append(fila_z)
        texto.append(fila_txt)

    # Resumen mensual
    todos_los_valores = [v for fila in z for v in fila if v > 0]
    total_citas = sum(todos_los_valores)
    dias_activos = len(todos_los_valores) or 1
    promedio_dia = math.floor(total_citas / dias_activos)
    pct_global   = math.floor((total_citas / (dias_activos * CAPACIDAD_DIA)) * 100)
    max_citas    = max(todos_los_valores) if todos_los_valores else 0
    # Buscar el día de la semana con más citas en promedio
    totales_por_dia = [0] * 6
    conteos_por_dia = [0] * 6
    for fila in z:
        for di, val in enumerate(fila):
            if val > 0:
                totales_por_dia[di] += val
                conteos_por_dia[di] += 1
    promedios_dia = [
        totales_por_dia[i] / max(conteos_por_dia[i], 1) for i in range(6)
    ]
    dia_mas_activo = DIAS_SEMANA[promedios_dia.index(max(promedios_dia))]

    resumen = ResumenDoctor(
        total_citas=total_citas,
        promedio_dia=promedio_dia,
        pct_ocupacion=pct_global,
        dia_mas_activo=dia_mas_activo,
    )

    return HeatmapDoctorResponse(
        titulo=titulo,
        dias=DIAS_SEMANA,
        semanas=etiquetas_semanas,
        z=z,
        texto=texto,
        capacidad_max=CAPACIDAD_DIA,
        resumen=resumen,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ultimo_dia_mes(anio: int, mes: int) -> date:
    if mes == 12:
        return date(anio, 12, 31)
    return date(anio, mes + 1, 1) - timedelta(days=1)


def _calcular_semanas(primer_dia: date, ultimo_dia: date) -> list[tuple[date, date]]:
    """Devuelve lista de (lunes, sábado) que cubren el mes."""
    semanas = []
    lunes = primer_dia - timedelta(days=primer_dia.weekday())
    while lunes <= ultimo_dia:
        sabado = lunes + timedelta(days=5)
        semanas.append((lunes, sabado))
        lunes += timedelta(weeks=1)
    return semanas


def _nombre_mes(mes: int) -> str:
    nombres = [
        "", "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
    ]
    return nombres[mes]


def _estudios_list():
    return [
        {"value": "all",         "label": "Todos los estudios"},
        {"value": "consulta",    "label": "Consulta general"},
        {"value": "rayos_x",     "label": "Rayos X"},
        {"value": "laboratorio", "label": "Laboratorio"},
        {"value": "ultrasonido", "label": "Ultrasonido"},
    ]
