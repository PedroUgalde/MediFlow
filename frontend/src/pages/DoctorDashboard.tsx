import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LiveAttentionTab from '@/components/doctor/LiveAttentionTab';
import OccupancyHeatMap from '@/components/doctor/OccupancyHeatMap';
import HistoryTab from '@/components/doctor/HistoryTab';
import { Activity, Users, Clock, AlertTriangle, Zap, BarChart3, ClipboardList } from 'lucide-react';
import { mockAppointments, getAreaSaturation, getSaturationColor, getSaturationLabel, AREAS, type Appointment, type AreaType } from '@/lib/mockData';

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const saturation = getAreaSaturation(appointments);

  const handleTakePatient = (appointmentId: string, room: string) => {
    const time = currentTime();
    setAppointments(prev =>
      prev.map(a =>
        a.id === appointmentId
          ? { ...a, status: 'in-progress' as const, assignedDoctor: 'Dr. Actual', assignedRoom: room, progress: 10, startTime: time, arrivalTime: a.arrivalTime || a.scheduledTime }
          : a
      )
    );
  };

  const handleCompletePatient = (appointmentId: string) => {
    const time = currentTime();
    setAppointments(prev =>
      prev.map(a =>
        a.id === appointmentId
          ? { ...a, status: 'completed' as const, progress: 100, endTime: time }
          : a
      )
    );
  };

  const handleCancelPatient = (appointmentId: string) => {
    setAppointments(prev =>
      prev.map(a =>
        a.id === appointmentId
          ? { ...a, status: 'en_espera' as const, progress: 0, assignedDoctor: undefined, assignedRoom: undefined, startTime: undefined }
          : a
      )
    );
  };

  const handleReportDelay = (area: AreaType, urgencyLevel: number, estimatedDelay: number, note: string) => {
    setAppointments(prev =>
      prev.map(a =>
        a.area === area && (a.status === 'en_espera' || a.status === 'delayed')
          ? {
              ...a,
              urgencyLevel: urgencyLevel as Appointment['urgencyLevel'],
              estimatedDelay,
              status: 'delayed' as const,
              doctorNotes: [...a.doctorNotes, note],
            }
          : a
      )
    );
  };

  const totalWaiting = appointments.filter(a => a.status === 'en_espera' || a.status === 'delayed').length;
  const totalInProgress = appointments.filter(a => a.status === 'in-progress').length;
  const totalDelayed = appointments.filter(a => a.status === 'delayed').length;
  const totalCompleted = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled').length;

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-clinical px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-primary-foreground">MediFlow</h1>
            <p className="text-primary-foreground/80 text-sm">Panel del Doctor</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground text-sm font-bold">
              Dr
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Users, label: 'En Espera', value: String(totalWaiting), color: 'text-primary' },
            { icon: Activity, label: 'En Atención', value: String(totalInProgress), color: 'text-secondary' },
            { icon: AlertTriangle, label: 'Retrasos', value: String(totalDelayed), color: 'text-urgency-high' },
            { icon: Clock, label: 'Despachados', value: String(totalCompleted), color: 'text-muted-foreground' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-card rounded-lg shadow-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className="text-2xl font-display font-bold">{value}</div>
            </div>
          ))}
        </div>

        {/* Area saturation traffic lights */}
        <div className="bg-card rounded-lg shadow-card p-4">
          <h3 className="font-display text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Saturación por Área</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {saturation.map(s => (
              <div key={s.area} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className={`w-3 h-3 rounded-full ${getSaturationColor(s.saturation)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{s.icon} {s.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {s.waiting} espera · {s.inProgress} atención · {getSaturationLabel(s.saturation)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="live" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="live" className="gap-1.5 text-xs sm:text-sm">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Atención en Vivo</span>
              <span className="sm:hidden">En Vivo</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Historial General</span>
              <span className="sm:hidden">Historial</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Análisis de Ocupación</span>
              <span className="sm:hidden">Análisis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <LiveAttentionTab
              appointments={appointments}
              onTakePatient={handleTakePatient}
              onCompletePatient={handleCompletePatient}
              onCancelPatient={handleCancelPatient}
              onReportDelay={handleReportDelay}
            />
          </TabsContent>

          <TabsContent value="analysis">
            <OccupancyHeatMap />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab appointments={appointments} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
