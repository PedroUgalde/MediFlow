import { useState } from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SmartAppointmentCard from '@/components/patient/SmartAppointmentCard';
import NotificationCenter from '@/components/patient/NotificationCenter';
import AppointmentScheduler from '@/components/patient/AppointmentScheduler';
import WeeklyHeatMap from '@/components/patient/WeeklyHeatMap';
import SimularPagoButton from '@/components/patient/simularPago';
import { mockAppointments, mockPatients } from '@/lib/mockData';
import { QrCode, CalendarCheck, Bell, BarChart3, X, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Tab = 'citas' | 'historial' | 'stats' | 'notif';

export default function PatientApp() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('citas');
  const [showQR, setShowQR] = useState(false);
  const [appointments, setAppointments] = useState(mockAppointments);
  const { toast } = useToast();
  const patientIdFromQuery = searchParams.get('patient');
  const folioFromQuery = searchParams.get('folio')?.trim();

  console.log(folioFromQuery, patientIdFromQuery);
  const resolvedPatientId = useMemo(() => {
    if (patientIdFromQuery) {
      return patientIdFromQuery;
    }

    const apptMatch = mockAppointments.find((item) => item.folio === folioFromQuery);
    console.log("Apptamthc",apptMatch);
    return apptMatch?.paciente_id ?? 'p1';
  }, [folioFromQuery, patientIdFromQuery]);
  console.log("Resolved patient ID:", resolvedPatientId);
  console.log("Mock patients:", mockPatients);
  const patientProfile = mockPatients.find((item) => item.id === resolvedPatientId) ?? mockPatients[0];
  console.log(patientProfile);
  console.log("Folio from query:", folioFromQuery);
  console.log(appointments)
  const patientAppointments = appointments.filter((a) => a.folio === folioFromQuery);
  const patientInitials = patientProfile.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const activeAppts = patientAppointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const historyAppts = patientAppointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const handlePaymentSuccess = () => {
    if (!folioFromQuery) {
      return;
    }

    setAppointments((currentAppointments) =>
      currentAppointments.map((appointment) =>
        appointment.folio === folioFromQuery
          ? { ...appointment, status: 'en_espera' }
          : appointment
      )
    );
  };

  const handleCheckIn = () => {
    setShowQR(false);
    toast({
      title: '✅ Check-in exitoso',
      description: 'Tu registro ha sido procesado. Te avisaremos cuando sea tu turno.',
    });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      {/* Header */}
      <header className="gradient-clinical px-4 pt-4 pb-6 rounded-b-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-lg font-bold text-primary-foreground">MediFlow</h1>
            <p className="text-primary-foreground/80 text-xs">Bienvenida, {patientProfile.name.split(' ')[0]}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground text-sm font-bold">
            {patientInitials}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary-foreground/10 backdrop-blur rounded-lg p-2 text-center">
            <div className="text-lg font-display font-bold text-primary-foreground">{activeAppts.length}</div>
            <div className="text-[10px] text-primary-foreground/70">Activas</div>
          </div>
          <div className="bg-primary-foreground/10 backdrop-blur rounded-lg p-2 text-center">
            <div className="text-lg font-display font-bold text-primary-foreground">{historyAppts.length}</div>
            <div className="text-[10px] text-primary-foreground/70">Completadas</div>
          </div>
          <div className="bg-primary-foreground/10 backdrop-blur rounded-lg p-2 text-center">
            <div className="text-lg font-display font-bold text-primary-foreground">
              {activeAppts.filter(a => a.estimatedDelay > 0).length}
            </div>
            <div className="text-[10px] text-primary-foreground/70">Con Retraso</div>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="flex gap-1 p-2 mx-4 mt-3 bg-muted rounded-lg">
        {([
          { id: 'stats' as Tab, label: 'Ocupación', icon: BarChart3 },
          { id: 'citas' as Tab, label: 'Mis Citas', icon: CalendarCheck },
          { id: 'historial' as Tab, label: 'Historial', icon: History },
          { id: 'notif' as Tab, label: 'Alertas', icon: Bell },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === id
                ? 'bg-card shadow-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 pb-24 space-y-3">
        {activeTab === 'citas' && (
          <>
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Citas Activas
            </h2>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Simular pago de cita</p>
                <p className="text-xs text-muted-foreground">
                  Este botón solo cambia la cita actual a estado en_espera usando la API.
                </p>
              </div>
              <SimularPagoButton folio={folioFromQuery} onSuccess={handlePaymentSuccess} />
            </div>
            {activeAppts.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">No tienes citas activas</div>
            ) : (
              activeAppts.map(apt => (
                <SmartAppointmentCard key={apt.id} appointment={apt} />
              ))
            )}
          </>
        )}
        {activeTab === 'historial' && (
          <>
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Historial de Citas
            </h2>
            {historyAppts.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Sin historial aún</div>
            ) : (
              historyAppts.map(apt => (
                <SmartAppointmentCard key={apt.id} appointment={apt} />
              ))
            )}
          </>
        )}
        {activeTab === 'stats' && <AppointmentScheduler patientId="p1" />}
        {activeTab === 'notif' && <NotificationCenter />}
      </div>

      {/* QR Floating Button */}
      <button
        onClick={() => setShowQR(true)}
        className="fixed bottom-6 right-6 md:right-[calc(50%-224px+24px)] w-14 h-14 gradient-clinical rounded-full shadow-elevated flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform z-40"
      >
        <QrCode className="h-6 w-6" />
      </button>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-xs w-full shadow-elevated animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold">Check-in QR</h3>
              <button onClick={() => setShowQR(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-muted rounded-xl p-8 flex items-center justify-center mb-4">
              <div className="w-40 h-40 border-4 border-primary rounded-lg flex items-center justify-center">
                <QrCode className="h-24 w-24 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Escanea este código en la recepción de la clínica para registrar tu llegada.
            </p>
            <Button className="w-full" onClick={handleCheckIn}>
              Simular Check-in
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}