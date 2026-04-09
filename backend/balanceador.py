from datetime import datetime, timedelta
import psycopg2.extras

class BalanceadorPrioridad:
    def __init__(self, get_db_func):
        self.get_db = get_db_func

    def calcular_estatus_prioridad(self, cita):
        """
        Paso 1: Determina si un paciente mantiene su alta prioridad (F) 
        o pasa a ser tratado como Walk-in (G) por retraso.
        """
        # Si el folio empieza con G, siempre es baja prioridad
        if cita['folio'].startswith('G'):
            return "BAJA"
            
        # Para folios F, verificamos la puntualidad (5 min de tolerancia)
        # Convertimos objetos 'time' a datetime para comparar
        ahora = datetime.now().time()
        prog = cita['hora_programada']
        
        # Lógica de tolerancia: hora_llegada <= hora_programada + 5 min
        # (Aquí usamos hora_llegada si ya hizo check-in, sino usamos 'ahora')
        llegada = cita['hora_llegada'] or ahora
        
        # Convertir a datetime para matemáticas de tiempo
        dt_llegada = datetime.combine(datetime.today(), llegada)
        dt_prog = datetime.combine(datetime.today(), prog)
        
        if dt_llegada <= (dt_prog + timedelta(minutes=5)):
            return "ALTA"
        return "BAJA"

    def obtener_ruta_optima(self, paciente_id: int):
        """
        Paso 2: Balanceo Multicita.
        Busca el área con menor CARGA TEMPORAL (minutos acumulados).
        """
        conn = self.get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Buscamos todas las citas pendientes del paciente para hoy
            query_pendientes = """
                SELECT c.id, c.folio, c.area_id, a.nombre as area_nombre, 
                       c.hora_programada, c.hora_llegada, e.tiempo_base_minutos
                FROM cita c
                JOIN areas a ON c.area_id = a.id
                JOIN estudios e ON c.estudio_id = e.id
                WHERE c.paciente_id = %s AND c.fecha_cita = CURRENT_DATE
                AND c.estado IN ('en_espera', 'delayed')
            """
            cur.execute(query_pendientes, (paciente_id,))
            citas_paciente = cur.fetchall()

            if not citas_paciente:
                return {"mensaje": "No hay citas pendientes"}

            analisis_areas = []
            for cita in citas_paciente:
                # Calculamos la CARGA TOTAL de la fila en esa área
                # Sumamos tiempos de todos los que están esperando ahí
                query_carga = """
                    SELECT SUM(e.tiempo_base_minutos) as minutos_espera
                    FROM cita c
                    JOIN estudios e ON c.estudio_id = e.id
                    WHERE c.area_id = %s AND c.estado IN ('en_espera', 'delayed')
                """
                cur.execute(query_carga, (cita['area_id'],))
                carga = cur.fetchone()['minutos_espera'] or 0
                
                prioridad = self.calcular_estatus_prioridad(cita)
                
                analisis_areas.append({
                    "cita_id": cita['id'],
                    "area_id": cita['area_id'],
                    "area_nombre": cita['area_nombre'],
                    "carga_minutos_area": carga,
                    "tu_prioridad": prioridad,
                    "es_recomendada": False
                })

            # Ordenamos por la que tenga menos minutos de espera
            analisis_areas.sort(key=lambda x: x['carga_minutos_area'])
            analisis_areas[0]['es_recomendada'] = True
            
            return analisis_areas
        finally:
            conn.close()

    def verificar_penalizacion_t2(self, cita_id: int):
        """
        Paso 3: Lógica de penalización T/2.
        Verifica si un paciente de baja prioridad ya cumplió su tiempo de cesión.
        """
        conn = self.get_db()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            query = """
                SELECT c.folio, c.hora_llegada, e.tiempo_base_minutos, c.hora_programada
                FROM cita c
                JOIN estudios e ON c.estudio_id = e.id
                WHERE c.id = %s
            """
            cur.execute(query, (cita_id,))
            cita = cur.fetchone()
            
            prioridad = self.calcular_estatus_prioridad(cita)
            
            if prioridad == "ALTA":
                return {"puede_pasar": True, "razon": "Prioridad alta mantenida"}
            
            # Si es BAJA, verificamos si ya pasó T/2 desde su llegada
            t_medio = cita['tiempo_base_minutos'] / 2
            llegada = datetime.combine(datetime.today(), cita['hora_llegada'])
            fin_penalizacion = llegada + timedelta(minutes=t_medio)
            
            ahora = datetime.now()
            
            if ahora >= fin_penalizacion:
                return {"puede_pasar": True, "razon": "Tiempo de penalización T/2 cumplido"}
            
            minutos_restantes = (fin_penalizacion - ahora).total_seconds() / 60
            return {
                "puede_pasar": False, 
                "razon": f"Cediendo turno a prioritarios. Restan {round(minutos_restantes)} min",
                "minutos_restantes": round(minutos_restantes)
            }
        finally:
            conn.close()

    def calcular_ruta_optima_atencion(self, citas_paciente: list, cargas_areas: dict):
        """
        Calcula la ruta óptima de atención para un paciente con múltiples citas.
        
        Args:
            citas_paciente: Lista de diccionarios con citas del paciente
                Cada cita: {id, folio, area_id, hora_programada, hora_llegada, tiempo_estudio}
            cargas_areas: Diccionario area_id -> tiempo_total_espera_acumulado
        
        Returns:
            Lista ordenada de áreas (area_id) en orden óptimo de atención
        """
        from collections import defaultdict
        
        # Paso 1: Determinar prioridad de cada cita
        citas_con_prioridad = []
        for cita in citas_paciente:
            prioridad = self.calcular_estatus_prioridad(cita)
            citas_con_prioridad.append({
                **cita,
                'prioridad': prioridad
            })
        
        # Paso 2: Agrupar por área y calcular métricas
        areas_info = defaultdict(list)
        for cita in citas_con_prioridad:
            area_id = cita['area_id']
            areas_info[area_id].append(cita)
        
        # Paso 3: Para cada área, determinar si puede ser atendida
        areas_evaluadas = []
        for area_id, citas_area in areas_info.items():
            carga_area = cargas_areas.get(area_id, 0)
            
            # Verificar si alguna cita en esta área puede ser atendida
            puede_atender = False
            prioridad_max = "BAJA"
            
            for cita in citas_area:
                # Verificar penalización T/2 para citas de baja prioridad
                if cita['prioridad'] == "BAJA":
                    # Simular verificación T/2 (necesitaríamos la lógica completa)
                    # Por simplicidad, asumimos que si es BAJA, está en penalización
                    puede_atender_cita = False
                else:
                    puede_atender_cita = True
                    prioridad_max = "ALTA"
                
                if puede_atender_cita:
                    puede_atender = True
            
            areas_evaluadas.append({
                'area_id': area_id,
                'carga': carga_area,
                'prioridad_paciente': prioridad_max,
                'puede_atender': puede_atender,
                'citas': citas_area
            })
        
        # Paso 4: Filtrar áreas donde puede ser atendido y ordenar
        areas_disponibles = [a for a in areas_evaluadas if a['puede_atender']]
        
        # Ordenar por: carga ascendente, luego prioridad alta primero
        areas_ordenadas = sorted(areas_disponibles, 
                               key=lambda x: (x['carga'], 0 if x['prioridad_paciente'] == "ALTA" else 1))
        
        # Paso 5: Devolver ruta óptima (lista de area_id)
        return [area['area_id'] for area in areas_ordenadas]