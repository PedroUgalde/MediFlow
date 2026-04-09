from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import os
import psycopg2
import psycopg2.extras  # Necesario para RealDictCursor
import redis
import time
from nlp_logic import ProcesadorIncidencias
from heatmap import router as heatmap_router
from database.router import router as database_router
from manejo_citas import router as manejo_citas_router

app = FastAPI()

app.include_router(
    heatmap_router,
    prefix="/api/heatmap",
    tags=["heatmap"]
)

app.include_router(
    database_router,
    prefix="/api/database",
    tags=["database"]
)

app.include_router(
    manejo_citas_router,
    tags=["manejo_citas"]
)

# --- CONFIGURACIÓN DE CONEXIONES ---
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="medi_flow",
        port="5432",
        user="postgres",
        password="moco"
    )
    conn.set_client_encoding('UTF8') 
    return conn

# Memurai (Redis) - Limpiamos al iniciar para evitar errores de tipo (WRONGTYPE)
cache = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
cache.flushall()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CARGA DE MODELOS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "modelos", "modelo_duracion_salud_digna.pkl")
modelo_cargado = joblib.load(MODEL_PATH)
procesador_ia = ProcesadorIncidencias()

class ReporteRetraso(BaseModel):
    motivo: str
    area_id: int

# --- 1. ENDPOINTS DE CITAS (Sincronización Global PostgreSQL) ---

@app.get("/citas-hoy")
async def obtener_citas_hoy():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        query = """
        SELECT 
            c.id, 
            c.folio,
            p.nombre as "patientName", 
            e.nombre as procedure, 
            c.area_id as area, 
            c.estado as status,
            TO_CHAR(c.hora_programada, 'HH24:MI') as "scheduledTime",
            -- LÓGICA DE PRIORIDAD:
            CASE 
                -- ALTA PRIORIDAD: Folio F + Llegó antes o hasta 5 min después
                WHEN c.folio LIKE 'F%' AND c.hora_llegada <= (c.hora_programada + interval '5 minutes') THEN 1
                -- BAJA PRIORIDAD: Folio G o Folio F tardío
                ELSE 2
            END as nivel_prioridad
        FROM cita c
        JOIN paciente p ON c.paciente_id = p.id
        JOIN estudios e ON c.estudio_id = e.id
        WHERE c.fecha_cita = CURRENT_DATE
        ORDER BY c.hora_programada ASC, 
                 CASE WHEN c.folio LIKE 'F%' THEN 1 ELSE 2 END ASC,
                 nivel_prioridad ASC -- Primero los VIP, luego por hora
        """
        cur.execute(query)
        citas = cur.fetchall()
        cur.close()
        return citas
    except Exception as e:
        # Esto nos dirá exactamente qué columna está fallando si persiste
        print(f"Error consultando citas (Detalle): {repr(e)}")
        return []
    finally:
        if conn: conn.close()

@app.patch("/cita/{cita_id}/estado")
async def actualizar_estado_cita(cita_id: int, payload: dict = Body(...)):
    nuevo_estado = payload.get("estado")
    # Nota: Aquí podrías recibir también doctor_id si lo necesitas registrar
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE cita SET estado = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (nuevo_estado, cita_id)
        )
        conn.commit()
        cur.close()
        return {"status": "success", "message": f"Cita {cita_id} actualizada a {nuevo_estado}"}
    except Exception as e:
        print(f"Error actualizando cita: {repr(e)}")
        raise HTTPException(status_code=500, detail="No se pudo actualizar la cita")
    finally:
        if conn: conn.close()


# --- 2. ENDPOINTS DE RETRASOS (Granularidad con Redis Hash) ---

@app.post("/procesar-retraso")
async def procesar_retraso(reporte: ReporteRetraso):
    categoria, confianza = procesador_ia.categorizar_motivo(reporte.motivo)
    tiempo_extra = procesador_ia.calcular_tiempo_retraso(categoria, confianza)
    
    # Persistencia en Postgres
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        query_log = """
            INSERT INTO log_incidentes (area_id, error_id, tiempo_estimado_doctor, fecha_evento)
            VALUES (%s, (SELECT id FROM errores_especificos WHERE nombre_error = %s LIMIT 1), %s, CURRENT_TIMESTAMP)
        """
        cur.execute(query_log, (reporte.area_id, categoria, tiempo_extra))
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"Error Postgres (Log Incidente): {repr(e)}") 
    finally:
        if conn: conn.close()

    # Lógica de Redis (Hash para permitir múltiples errores por área)
    reporte_id = f"err_{int(time.time())}" 
    cache.hset(f"retraso:area:{reporte.area_id}", reporte_id, tiempo_extra)
    cache.expire(f"retraso:area:{reporte.area_id}", 3600)

    return {
        "status": "retraso_reportado",
        "reporte_id": reporte_id,
        "tiempo_retraso": tiempo_extra,
        "categoria": categoria
    }

@app.get("/retraso-actual/{area_id}")
async def obtener_retraso_area(area_id: int):
    todos_los_errores = cache.hgetall(f"retraso:area:{area_id}")
    if todos_los_errores:
        total_minutos = sum(int(m) for m in todos_los_errores.values())
        return {
            "hay_retraso": True,
            "minutos": total_minutos,
            "mensaje": f"Atención: Se reporta un retraso acumulado de {total_minutos} min."
        }
    return {"hay_retraso": False, "minutos": 0}

@app.delete("/resolver-error/{area_id}/{reporte_id}")
async def resolver_error(area_id: int, reporte_id: str):
    cache.hdel(f"retraso:area:{area_id}", reporte_id)
    return {"status": "ok", "mensaje": "Incidente removido"}

@app.get("/api/balanceador/prioridad/{paciente_id}")
async def obtener_prioridad_paciente(paciente_id: int):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT prioridad FROM paciente WHERE id = %s",
            (paciente_id,)
        )
        resultado = cur.fetchone()
        cur.close()
        if resultado:
            return {"paciente_id": paciente_id, "prioridad": resultado[0]}
        else:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
    except Exception as e:
        print(f"Error consultando prioridad: {repr(e)}")
        raise HTTPException(status_code=500, detail="Error al consultar la prioridad del paciente")
    finally:
        if conn: conn.close()