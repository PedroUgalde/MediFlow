// Mock data for the health platform
import { apiService } from "@/services/api";
export type AreaType = 'ultrasonido' | 'rayos-x' | 'sangre' | 'cardiologia' | 'general';

export const AREAS: { id: AreaType; name: string; icon: string; room: string }[] = [
  { id: 'ultrasonido', name: 'Ultrasonido', icon: '🔬', room: 'Sala 3 - Cubículo A' },
  { id: 'rayos-x', name: 'Rayos X', icon: '🫁', room: 'Sala 1 - Cubículo B' },
  { id: 'sangre', name: 'Laboratorio (Sangre)', icon: '🩸', room: 'Sala 2 - Cubículo C' },
  { id: 'cardiologia', name: 'Cardiología', icon: '❤️', room: 'Sala 4 - Cubículo D' },
  { id: 'general', name: 'Consulta General', icon: '🩺', room: 'Sala 5 - Cubículo E' },
];

export interface Patient {
  id: string;
  name: string;
  age: number;
  photo: string;
  appointments: Appointment[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  procedure: string;
  area: AreaType;
  icon: string;
  scheduledTime: string;
  estimatedDelay: number;
  urgencyLevel: 1 | 2 | 3 | 4 | 5;
  status: 'en_espera' | 'in-progress' | 'completed' | 'delayed' | 'cancelled';
  instructions: string[];
  doctorNotes: string[];
  progress: number;
  assignedDoctor?: string;
  assignedRoom?: string;
  arrivalTime?: string;
  startTime?: string;
  endTime?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'delay' | 'room-assignment';
  timestamp: string;
  read: boolean;
}

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const HOURS = ['7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];

export function generateYearlyHeatMap(): number[][] {
  return MONTHS.map(() =>
    DAYS_OF_WEEK.map(() => Math.floor(Math.random() * 100))
  );
}

export function generateYearlyHeatMapByArea(): Record<AreaType, number[][]> {
  const result: Partial<Record<AreaType, number[][]>> = {};
  for (const area of AREAS) {
    result[area.id] = generateYearlyHeatMap();
  }
  return result as Record<AreaType, number[][]>;
}

export function generateWeeklyHeatMap(): number[][] {
  return DAYS_OF_WEEK.map(() =>
    HOURS.map(() => Math.floor(Math.random() * 100))
  );
}

export function generateTodayDemand(): { hour: string; patients: number; capacity: number }[] {
  return HOURS.map(hour => ({
    hour,
    patients: Math.floor(Math.random() * 30) + 5,
    capacity: 35,
  }));
}

// Area saturation (traffic light)
export function getAreaSaturation(appointments: Appointment[]): { area: AreaType; name: string; icon: string; waiting: number; inProgress: number; saturation: number }[] {
  return AREAS.map(a => {
    const areaAppts = appointments.filter(ap => ap.area === a.id && ap.status !== 'completed');
    const waiting = areaAppts.filter(ap => ap.status === 'en_espera' || ap.status === 'delayed').length;
    const inProgress = areaAppts.filter(ap => ap.status === 'in-progress').length;
    const saturation = Math.min(100, (waiting + inProgress) * 20);
    return { area: a.id, name: a.name, icon: a.icon, waiting, inProgress, saturation };
  });
}

export function getSaturationColor(saturation: number): string {
  if (saturation <= 30) return 'bg-urgency-ontime';
  if (saturation <= 60) return 'bg-urgency-medium';
  return 'bg-urgency-high';
}

export function getSaturationLabel(saturation: number): string {
  if (saturation <= 30) return 'Baja';
  if (saturation <= 60) return 'Media';
  return 'Alta';
}
const responsePacientes = await apiService.obtener_usuarios();
console.log("Pacientes obtenidos para mock:", responsePacientes.data);
export const mockPatients = responsePacientes.data;
export const mockPatientsV1: Patient[] = [
  { id: 'p1', name: 'María García', age: 45, photo: '', appointments: [] },
  { id: 'p2', name: 'Carlos López', age: 62, photo: '', appointments: [] },
  { id: 'p3', name: 'Ana Martínez', age: 33, photo: '', appointments: [] },
  { id: 'p4', name: 'Roberto Sánchez', age: 55, photo: '', appointments: [] },
  { id: 'p5', name: 'Laura Hernández', age: 28, photo: '', appointments: [] },
];

const response = await apiService.obtener_todas_citas();
export const mockAppointments = response.data; 
console.log("Citas cargadas en el mock:", mockAppointments);


// export const mockAppointmentsV1: Appointment[] = [
//   {
//     id: 'a1', patientId: 'p1', patientName: 'María García',
//     procedure: 'Análisis de Sangre', area: 'sangre', icon: '🩸',
//     scheduledTime: '09:00', estimatedDelay: 0, urgencyLevel: 1,
//     status: 'waiting',
//     instructions: ['Ayuno de 8 horas', 'No consumir alcohol 24h antes', 'Traer orden médica'],
//     doctorNotes: [], progress: 0,
//   },
//   {
//     id: 'a2', patientId: 'p1', patientName: 'María García',
//     procedure: 'Radiografía de Tórax', area: 'rayos-x', icon: '🫁',
//     scheduledTime: '10:30', estimatedDelay: 15, urgencyLevel: 2,
//     status: 'waiting',
//     instructions: ['Retirar objetos metálicos', 'Usar bata proporcionada'],
//     doctorNotes: ['Ligero retraso por equipo en mantenimiento'], progress: 0,
//   },
//   {
//     id: 'a3', patientId: 'p2', patientName: 'Carlos López',
//     procedure: 'Electrocardiograma', area: 'cardiologia', icon: '❤️',
//     scheduledTime: '09:30', estimatedDelay: 0, urgencyLevel: 1,
//     status: 'waiting',
//     instructions: ['No consumir cafeína', 'Ropa cómoda'],
//     doctorNotes: [], progress: 0,
//   },
//   {
//     id: 'a4', patientId: 'p3', patientName: 'Ana Martínez',
//     procedure: 'Ecografía Abdominal', area: 'ultrasonido', icon: '🔬',
//     scheduledTime: '11:00', estimatedDelay: 30, urgencyLevel: 3,
//     status: 'delayed',
//     instructions: ['Ayuno de 6 horas', 'Beber 1L de agua 1h antes'],
//     doctorNotes: ['Retraso por emergencia en sala 3', 'Paciente informado'], progress: 0,
//   },
//   {
//     id: 'a5', patientId: 'p4', patientName: 'Roberto Sánchez',
//     procedure: 'Resonancia Magnética', area: 'rayos-x', icon: '🧲',
//     scheduledTime: '08:00', estimatedDelay: 0, urgencyLevel: 1,
//     status: 'completed',
//     instructions: ['Sin implantes metálicos', 'Ayuno de 4 horas'],
//     doctorNotes: [], progress: 100,
//     assignedDoctor: 'Dra. Rodríguez', assignedRoom: 'Sala 1 - Cubículo B',
//     arrivalTime: '07:45', startTime: '08:05', endTime: '08:50',
//   },
//   {
//     id: 'a6', patientId: 'p5', patientName: 'Laura Hernández',
//     procedure: 'Consulta General', area: 'general', icon: '🩺',
//     scheduledTime: '10:00', estimatedDelay: 45, urgencyLevel: 4,
//     status: 'delayed',
//     instructions: ['Traer historial médico', 'Lista de medicamentos actuales'],
//     doctorNotes: ['Doctor en cirugía de emergencia', 'Se reasignará turno'], progress: 0,
//   },
//   {
//     id: 'a7', patientId: 'p2', patientName: 'Carlos López',
//     procedure: 'Análisis de Sangre Completo', area: 'sangre', icon: '🩸',
//     scheduledTime: '10:00', estimatedDelay: 0, urgencyLevel: 1,
//     status: 'waiting',
//     instructions: ['Ayuno de 12 horas'],
//     doctorNotes: [], progress: 0,
//   },
// ];

export const mockNotifications: Notification[] = [
  { id: 'n1', title: 'Check-in confirmado', message: 'Tu registro en recepción ha sido procesado exitosamente.', type: 'success', timestamp: '08:45', read: true },
  { id: 'n2', title: 'Actualización de turno', message: 'Tu cita de Radiografía tiene un retraso estimado de 15 min.', type: 'delay', timestamp: '09:15', read: false },
  { id: 'n3', title: 'Preparación requerida', message: 'Recuerda mantener ayuno para tu Ecografía de las 11:00.', type: 'info', timestamp: '07:30', read: true },
  { id: 'n4', title: 'Retraso importante', message: 'La Consulta General se ha retrasado 45 min por emergencia médica.', type: 'warning', timestamp: '09:50', read: false },
];

export function analyzeDelayUrgency(text: string): { urgencyLevel: 1 | 2 | 3 | 4 | 5; estimatedDelay: number; summary: string } {
  const lower = text.toLowerCase();
  if (lower.includes('emergencia') || lower.includes('cirugía') || lower.includes('urgente')) {
    return { urgencyLevel: 5, estimatedDelay: 60, summary: 'Emergencia médica detectada. Retraso crítico.' };
  }
  if (lower.includes('equipo') || lower.includes('falla') || lower.includes('mantenimiento')) {
    return { urgencyLevel: 3, estimatedDelay: 25, summary: 'Problema de equipamiento. Retraso moderado.' };
  }
  if (lower.includes('personal') || lower.includes('ausencia') || lower.includes('demora')) {
    return { urgencyLevel: 4, estimatedDelay: 40, summary: 'Falta de personal. Retraso significativo.' };
  }
  if (lower.includes('menor') || lower.includes('leve') || lower.includes('breve')) {
    return { urgencyLevel: 2, estimatedDelay: 10, summary: 'Incidencia menor. Retraso breve.' };
  }
  return { urgencyLevel: 2, estimatedDelay: 15, summary: 'Incidencia registrada. Retraso estimado moderado.' };
}

export function generateAnnualReport(heatMapData: number[][]) {
  const avgByMonth = heatMapData.map((month, i) => ({
    month: MONTHS[i],
    avgOccupancy: Math.round(month.reduce((a, b) => a + b, 0) / month.length),
  }));
  const totalAvg = Math.round(avgByMonth.reduce((a, b) => a + b.avgOccupancy, 0) / avgByMonth.length);
  const peakMonth = avgByMonth.reduce((max, m) => m.avgOccupancy > max.avgOccupancy ? m : max);
  const lowMonth = avgByMonth.reduce((min, m) => m.avgOccupancy < min.avgOccupancy ? m : min);
  return {
    avgByMonth,
    totalAvg,
    peakMonth: peakMonth.month,
    peakOccupancy: peakMonth.avgOccupancy,
    lowMonth: lowMonth.month,
    lowOccupancy: lowMonth.avgOccupancy,
  };
}
