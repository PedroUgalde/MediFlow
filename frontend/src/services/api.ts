const API_BASE_URL = "http://localhost:8000";
const WS_BASE_URL = "ws://localhost:8000";


export interface LlamadoPacientePayload {
  id_paciente: string;
  id_doctor: string;
  nombre_doctor: string;
  consultorio: string;
  mensaje?: string;
}

export interface EstadoCitaPayload {
  appointment_id: string;
  id_paciente: string;
  id_doctor: string;
  nombre_doctor: string;
  consultorio?: string;
}

export interface AgendarCitaPayload {
  paciente_id: number;
  estudios: {
    estudio_id: number;
    fecha_cita: string;
    hora_programada: string;
  }[];
  agenda_online: boolean;
}

export interface HeatmapPacienteResponse {
  titulo: string;
  dias: string[];
  horas: string[];
  z: number[][];
}

export interface EstudioCatalogoItem {
  id: number;
  nombre: string;
  area_id: number;
  area_nombre: string;
  sala: string;
  tiempo_base_minutos: number;
}

export const apiService = {
  obtenerHeatmapPaciente: async (semanaOffset = 0): Promise<HeatmapPacienteResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/heatmap/paciente?semana_offset=${semanaOffset}`);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el heatmap: ${response.statusText}`);
    }
    return response.json();
  },

  obtenerEstudios: async (): Promise<{ ok: boolean; data: EstudioCatalogoItem[] }> => {
    const response = await fetch(`${API_BASE_URL}/api/database/estudios`);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el catalogo de estudios: ${response.statusText}`);
    }
    return response.json();
  },

  // Consulta al modelo de Random Forest
  predecirTiempo: async (datos: { estudio_id: number, dia_semana: number, hora: number, id_doctor: number }) => {
    const response = await fetch(`${API_BASE_URL}/predecir-tiempo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    return response.json();
  },

  // Reporte de retraso del doctor
  procesarRetraso: async (motivo: string, area_id: number) => {
    const response = await fetch(`${API_BASE_URL}/procesar-retraso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        motivo: motivo, 
        area_id: area_id 
      }),
    });
    
    if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
    }
    return response.json();
  },

  obtenerNotificacionRetraso: async (area_id: number) => {
    const response = await fetch(`${API_BASE_URL}/retraso-actual/${area_id}`);
    return response.json();
  },

  limpiarRetraso: async (area_id: number) => {
    const response = await fetch(`${API_BASE_URL}/limpiar-retraso/${area_id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async obtenerCitasHoy() {
    const response = await fetch("http://localhost:8000/citas-hoy");
    return await response.json();
  },

  // Cambiar el estado de una cita (Tomar, Finalizar, Devolver)
  async actualizarEstadoCita(citaId: number, nuevoEstado: string, doctorId?: number) {
    const response = await fetch(`http://localhost:8000/cita/${citaId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado, doctor_id: doctorId }),
    });
    return await response.json();
  },
  agendarCita: async (datos: AgendarCitaPayload) => {
    const response = await fetch(`${API_BASE_URL}/api/database/agendar-cita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = errorBody?.detail || response.statusText;
      throw new Error(message);
    }

    return response.json();
  },
  obtener_citas_por_folio: async (folio: string) => {
    const response = await fetch(`${API_BASE_URL}/api/database/citas/${folio}`);
    console.log("Respuesta de la API:", response);
    return response.json();
  },
  obtener_todas_citas: async () => {
    const response = await fetch(`${API_BASE_URL}/api/database/citas_todas`);
    //console.log("Respuesta de la API:", response);
    return response.json();
  },
  obtener_usuarios: async () => {
    const response = await fetch(`${API_BASE_URL}/api/database/usuarios`);
    //console.log("Respuesta de la API:", response);
    return response.json();
  },
  obtener_folios_id_citas: async () => {
    const response = await fetch(`${API_BASE_URL}/api/database/folios_id_citas`);
    
    return response.json();
  },
  simularPago: async (folio: string) => {
    const response = await fetch(`${API_BASE_URL}/api/database/simular_pago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folio }),
    });
    return response.json();
  },
    tomarPaciente: async (data: EstadoCitaPayload) => {
    const response = await fetch(`${API_BASE_URL}/citas/tomar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  finalizarPaciente: async (data: EstadoCitaPayload) => {
    const response = await fetch(`${API_BASE_URL}/citas/finalizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  devolverPaciente: async (data: EstadoCitaPayload) => {
    const response = await fetch(`${API_BASE_URL}/citas/devolver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  conectarCanalPaciente: (idPaciente: string) => {
    const socket = new WebSocket(`${WS_BASE_URL}/ws/pacientes/${idPaciente}`);
    return socket;
  },
  
  conectarCanalEstudio: (estudioId: number) => {
    return new WebSocket(`${WS_BASE_URL}/ws/estudios/${estudioId}`);
  },

  conectarCanalArea: (area: string) => {
    return new WebSocket(`${WS_BASE_URL}/ws/areas/${area}`);
  },
};