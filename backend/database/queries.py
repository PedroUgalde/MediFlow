from typing import Any

from database.databaseManager import execute_modify, execute_select,execute_insert, get_db_connection


def select_healthcheck() -> list[dict[str, Any]]:
    return execute_select("SELECT NOW() AS server_time;")


def select_postgres_version() -> list[dict[str, Any]]:
    return execute_select("SELECT version() AS postgres_version;")


from typing import Any

def select_all_citas() -> list[dict[str, Any]]:
    # 1. Hacemos un JOIN para traer nombres en lugar de IDs
    query = """
        SELECT 
            c.id,
            c.folio,
            c.paciente_id,
            p.nombre AS patient_name,
            e.nombre AS procedure_name,
            a.nombre AS area_name,
            c.hora_programada,
            c.estado,
            c.sala_asignada,
            d.nombre AS doctor_name,
            c.hora_llegada,
            c.hora_inicio,
            c.hora_fin
        FROM cita c
        JOIN paciente p ON c.paciente_id = p.id
        JOIN estudios e ON c.estudio_id = e.id
        JOIN areas a ON c.area_id = a.id
        LEFT JOIN doctor d ON c.doctor_id = d.id
    """
    
    raw_data = execute_select(query)
    
    # 2. Diccionario de mapeo para Iconos e Instrucciones (Hardcoded por ahora)
    # Esto simula lo que el buscador de Python o la lógica de negocio haría
    metadata_estudios = {
        'Análisis de Sangre': {'icon': '🩸', 'inst': ['Ayuno de 8 horas', 'Traer orden médica']},
        'Radiografía de Tórax': {'icon': '🫁', 'inst': ['Retirar objetos metálicos', 'Usar bata']},
        'Electrocardiograma': {'icon': '❤️', 'inst': ['No consumir cafeína', 'Ropa cómoda']},
        'Ecografía Abdominal': {'icon': '🔬', 'inst': ['Ayuno de 6 horas', 'Beber 1L de agua']},
        'Resonancia Magnética': {'icon': '🧲', 'inst': ['Sin implantes metálicos']},
        'Consulta General': {'icon': '🩺', 'inst': ['Traer historial médico']}
    }

    # 3. Formateamos la data para que coincida con el Mockup (TypeScript)
    formatted_appointments = []
    
    for row in raw_data:
        proc_name = row['procedure_name']
        meta = metadata_estudios.get(proc_name, {'icon': '📋', 'inst': []})
        
        appointment = {
            "id": f"a{row['id']}",
            "folio": f"{row['folio']}", 
            "patientId": f"p{row['paciente_id']}",
            "patientName": row['patient_name'],
            "procedure": proc_name,
            "area": row['area_name'].lower().replace(" ", "-"), # Ej: 'Rayos X' -> 'rayos-x'
            "icon": meta['icon'],
            "scheduledTime": row['hora_programada'].strftime("%H:%M") if row['hora_programada'] else "00:00",
            "estimatedDelay": 0, # Este dato vendría de tu lógica de ML o log_incidentes
            "urgencyLevel": 1,   # Valor por defecto
            "status": row['estado'].replace("_", "-"), # 'en_espera' -> 'en-espera'
            "instructions": meta['inst'],
            "doctorNotes": [],
            "progress": 100 if row['estado'] == 'finalizada' else 0,
            "assignedDoctor": row['doctor_name'],
            "assignedRoom": row['sala_asignada'],
            "arrivalTime": row['hora_llegada'].strftime("%H:%M") if row['hora_llegada'] else None,
            "startTime": row['hora_inicio'].strftime("%H:%M") if row['hora_inicio'] else None,
            "endTime": row['hora_fin'].strftime("%H:%M") if row['hora_fin'] else None
        }
        formatted_appointments.append(appointment)
        
    return formatted_appointments

def select_appointments_by_folio(folio: str) -> list[dict[str, Any]]:
    query = """
        SELECT *
        FROM cita
        WHERE folio = %s;
    """
    return execute_select(query, (folio,))

def select_usuarios() -> list[dict[str, Any]]:
    query = """
        SELECT 
            id, 
            nombre AS name, 
            EXTRACT(YEAR FROM AGE(fecha_nacimiento)) AS age, -- Calculamos la edad de una vez
            foto_url AS photo
        FROM paciente
    """
    rows = execute_select(query)
    
    # Añadimos el campo 'appointments' como array vacío para cumplir con la interfaz Patient
    for row in rows:
        row["appointments"] = []
        
    return rows

def select_folios_id_citas() -> list[dict[str, Any]]:
    query = """
        SELECT folio, id,paciente_id
        FROM cita
    """
    rows = execute_select(query)
    

    resultado = {}
    for row in rows:
        resultado[row["folio"]] = {
            "patientId": f"p{row['paciente_id']}", # Agregamos la 'p' para que coincida con tu mock
            "appointmentId": f"a{row['id']}" ,      # Agregamos la 'a' para que coincida con tu mock
            "folio": row["folio"]
        }
    
    return resultado


def select_estudios_catalogo() -> list[dict[str, Any]]:
    query = """
        SELECT
            e.id,
            e.nombre,
            e.area_id,
            a.nombre AS area_nombre,
            a.sala,
            e.tiempo_base_minutos
        FROM estudios e
        JOIN areas a ON a.id = e.area_id
        ORDER BY e.nombre;
    """
    return execute_select(query)

def set_status_cita(folio: str, nuevo_estado: str) -> None:
    query = """
        UPDATE cita
        SET estado = %s
        WHERE folio = %s;
    """
    updated_rows = execute_modify(query, (nuevo_estado, folio))
    if updated_rows == 0:
        raise ValueError(f"No existe una cita con folio {folio}")
    return None


def insert_paciente(nombre:str,fecha_nacimiento:str,foto_url:str) -> int:
    query = """
        INSERT INTO paciente (nombre, fecha_nacimiento, foto_url)
        VALUES (%s, %s, %s)
        RETURNING id;
    """
    new_id = execute_insert(query, (nombre, fecha_nacimiento, foto_url))
    return new_id

# Folio para en línea y pŕesencial
def get_next_folio(agenda_online: bool) -> str:
    # Definimos el prefijo deseado
    prefix = "F" if agenda_online else "G"
    
    # Buscamos el último folio que EMPIECE con ese prefijo específico
    query = "SELECT MAX(folio) FROM cita WHERE folio LIKE %s;"
    result = execute_select(query, (f"{prefix}%",))
    max_folio = result[0]['max'] if result[0]['max'] else None
    
    if not max_folio:
        # Si es el primero de su tipo, empezamos en 1
        return f"{prefix}00001"
    
    # Incrementamos el número
    try:
        # Extraemos la parte numérica después del prefijo
        number = int(max_folio[1:]) + 1
        return f"{prefix}{number:05d}"
    except (ValueError, IndexError):
        # Fallback en caso de folios con formato inesperado
        return f"{prefix}00001"
    
    # Incrementamos el número del folio
    prefix = max_folio[0]  # 'F'
    number = int(max_folio[1:]) + 1  # 24
    new_folio = f"{prefix}{number:05d}"  # 'F00024'
    
    return new_folio


def insert_cita(paciente_id:int,estudio_id:int,area_id:int,hora_programada:str,estado:str, agenda_online:bool = True) -> int:
    folio = get_next_folio(agenda_online)
    query = """
        INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, estado)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    new_id = execute_insert(query, (folio, paciente_id, estudio_id, area_id, hora_programada, estado))
    return new_id


def insert_cita_agendada(
    paciente_id: int,
    estudio_id: int,
    fecha_cita: str,
    hora_programada: str,
    agenda_online: bool = True,
    estado: str = "programada",
) -> dict[str, Any]:
    estudio_data = execute_select(
        """
        SELECT e.area_id, a.sala
        FROM estudios e
        JOIN areas a ON a.id = e.area_id
        WHERE e.id = %s;
        """,
        (estudio_id,),
    )

    if not estudio_data:
        raise ValueError(f"No existe estudio con id {estudio_id}")

    area_id = estudio_data[0]["area_id"]
    sala = estudio_data[0]["sala"]
    folio = get_next_folio(agenda_online)

    query = """
        INSERT INTO cita (folio, paciente_id, estudio_id, area_id, sala_asignada, hora_programada, fecha_cita, estado)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    cita_id = execute_insert(
        query,
        (folio, paciente_id, estudio_id, area_id, sala, hora_programada, fecha_cita, estado),
    )

    return {
        "id": cita_id,
        "folio": folio,
    }


def insert_cita_agendada_multiple(
    paciente_id: int,
    estudios: list[dict[str, Any]],
    agenda_online: bool,
    estado: str = "en_espera",
) -> dict[str, Any]:
    if not estudios:
        raise ValueError("Debes enviar al menos un estudio")

    folio = get_next_folio(agenda_online)
    inserted_ids: list[int] = []

    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            try:
                for estudio_item in estudios:
                    estudio_id = estudio_item.get("estudio_id")
                    fecha_cita = estudio_item.get("fecha_cita")
                    hora_programada = estudio_item.get("hora_programada")

                    if not estudio_id or not fecha_cita or not hora_programada:
                        raise ValueError("Cada estudio debe incluir estudio_id, fecha_cita y hora_programada")

                    cursor.execute(
                        """
                        SELECT e.area_id, a.sala
                        FROM estudios e
                        JOIN areas a ON a.id = e.area_id
                        WHERE e.id = %s;
                        """,
                        (estudio_id,),
                    )
                    estudio_row = cursor.fetchone()

                    if not estudio_row:
                        raise ValueError(f"No existe estudio con id {estudio_id}")

                    area_id, sala = estudio_row

                    cursor.execute(
                        """
                        INSERT INTO cita (folio, paciente_id, estudio_id, area_id, sala_asignada, hora_programada, fecha_cita, estado)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id;
                        """,
                        (folio, paciente_id, estudio_id, area_id, sala, hora_programada, fecha_cita, estado),
                    )
                    inserted_ids.append(cursor.fetchone()[0])

                connection.commit()
            except Exception:
                connection.rollback()
                raise

    return {
        "ids": inserted_ids,
        "folio": folio,
        "total_estudios": len(inserted_ids),
    }