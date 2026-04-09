import { apiService } from "@/services/api";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS, type Appointment, type AreaType } from "@/lib/mockData";
import {
  UserPlus,
  Send,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Play,
  XCircle,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Funciones de ayuda
function urgencyLabel(level: number) {
  const labels: Record<number, { text: string; class: string }> = {
    1: { text: "A tiempo", class: "bg-urgency-ontime text-primary-foreground" },
    2: { text: "Bajo", class: "bg-urgency-low text-foreground" },
    3: { text: "Medio", class: "bg-urgency-medium text-foreground" },
    4: { text: "Alto", class: "bg-urgency-high text-primary-foreground" },
    5: { text: "Crítico", class: "bg-urgency-critical text-primary-foreground" },
  };
  return labels[level] || labels[1];
}

function getDynamicUrgency(totalMinutes: number): number {
  if (totalMinutes <= 0) return 1;
  if (totalMinutes <= 15) return 2;
  if (totalMinutes <= 30) return 3;
  if (totalMinutes <= 45) return 4;
  return 5;
}

// Determina el tipo de folio (F=Online, G=Presencial)
function getFolioType(folio?: string): { type: "online" | "presencial" | "unknown"; label: string; color: string } {
  if (!folio) return { type: "unknown", label: "Sin folio", color: "bg-gray-100" };
  const prefix = folio.charAt(0).toUpperCase();
  if (prefix === "F") return { type: "online", label: "Prioridad Online", color: "bg-green-100 text-green-700 border-green-300" };
  if (prefix === "G") return { type: "presencial", label: "Walk-in", color: "bg-yellow-100 text-yellow-700 border-yellow-300" };
  return { type: "unknown", label: "Desconocido", color: "bg-gray-100" };
}

// Verifica si un paciente está en su ventana de T/2
// Si la hora programada está dentro de los próximos T/2 minutos, está bloqueado
function isInT2Window(scheduledTime: string, baseTimeMinutes: number = 30): boolean {
  const now = new Date();
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const appointmentTime = new Date();
  appointmentTime.setHours(hours, minutes, 0, 0);
  
  // Calcula la diferencia en minutos
  const diffMinutes = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
  
  // Si está dentro de T/2 minutos (mitad de baseTimeMinutes), está en ventana de bloqueo
  return diffMinutes > 0 && diffMinutes <= baseTimeMinutes / 2;
}

interface Props {
  appointments: Appointment[];
  onTakePatient: (appointmentId: string, room: string) => void;
  onCompletePatient: (appointmentId: string) => void;
  onCancelPatient: (appointmentId: string) => void;
  onReportDelay: (
    area: AreaType,
    urgencyLevel: number,
    estimatedDelay: number,
    note: string
  ) => void;
}

interface DBAppointment {
  id: number;
  patientName: string;
  procedure: string;
  area: number;
  status: string;
  scheduledTime: string;
  room: string;
  folio?: string;
}

export default function LiveAttentionTab({
  onTakePatient,
  onCompletePatient,
  onCancelPatient,
  onReportDelay,
}: Omit<Props, "appointments">) {
  const [totalDelayMinutes, setTotalDelayMinutes] = useState(0);
  const [delayText, setDelayText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [selectedArea, setSelectedArea] = useState<number>(1);
  const [incidentesActivos, setIncidentesActivos] = useState<
    { id: string; motivo: string; minutos: number }[]
  >([]);
  const { toast } = useToast();

  const areaIdMap: Record<string | number, number> = {
    sangre: 1, 1: 1, "rayos-x": 2, 2: 2, ultrasonido: 3, 3: 3, cardiologia: 4, 4: 4, general: 5, 5: 5,
  };

  const getAreaIcon = (areaId: number) => {
    const area = AREAS.find(a => areaIdMap[a.id] === areaId);
    return area?.icon || "👤";
  };

  useEffect(() => {
    const fetchTotalDelay = async () => {
      try {
        const data = await apiService.obtenerNotificacionRetraso(selectedArea);
        setTotalDelayMinutes(data.minutos || 0);
      } catch (error) {
        console.error("Error consultando retraso total:", error);
      }
    };
    fetchTotalDelay();
    const interval = setInterval(fetchTotalDelay, 5000);
    return () => clearInterval(interval);
  }, [selectedArea]);

  useEffect(() => {
    const syncData = async () => {
      try {
        const data = await apiService.obtenerCitasHoy();
        setAppointments(data);
      } catch (error) {
        console.error("Error sincronizando citas:", error);
      }
    };
    syncData();
    const interval = setInterval(syncData, 3000);
    return () => clearInterval(interval);
  }, []);

  const areaInfo = AREAS.find((a) => areaIdMap[a.id] === selectedArea) || AREAS[0];

  const queuedPatients = appointments
    .filter((a) => areaIdMap[a.area] === selectedArea && (a.status === "en_espera" || a.status === "delayed"))
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  console.log("Apointemes",appointments)
  const myPatients = appointments.filter((a) => a.status === "en_procedimiento");

  const handleTakePatient = async (apt: DBAppointment) => {
    if (myPatients.length > 0) {
      toast({ title: "⚠️ Atención en curso", description: "Completa al paciente actual primero.", variant: "destructive" });
      return;
    }
    try {
      await apiService.actualizarEstadoCita(apt.id, "en_procedimiento");
      setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: "en_procedimiento" } : a));
      onTakePatient(apt.id.toString(), areaInfo.room);
    } catch (error) {
      console.error(error);
    }
  };

  const handleComplete = async (apt: DBAppointment) => {
    try {
      await apiService.actualizarEstadoCita(apt.id, "finalizado");
      setAppointments(prev => prev.filter(a => a.id !== apt.id));
      onCompletePatient(apt.id.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancel = async (apt: DBAppointment) => {
    try {
      await apiService.actualizarEstadoCita(apt.id, "en_espera");
      onCancelPatient(apt.id.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const handleSolveError = async (reporteId: string, minutos: number) => {
    try {
      const response = await fetch(`http://localhost:8000/resolver-error/${selectedArea}/${reporteId}`, { method: "DELETE" });
      if (response.ok) {
        setIncidentesActivos(prev => prev.filter(inc => inc.id !== reporteId));
        toast({ title: "✅ Solucionado", description: `-${minutos} min.` });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitDelay = async () => {
    if (!delayText.trim()) return;
    setAnalyzing(true);
    try {
      const result = await apiService.procesarRetraso(delayText, selectedArea);
      setIncidentesActivos(prev => [...prev, { id: result.reporte_id, motivo: delayText, minutos: result.tiempo_retraso }]);
      onReportDelay(selectedArea.toString() as AreaType, 3, result.tiempo_retraso, delayText);
      setDelayText("");
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Fila de Pacientes
          </CardTitle>
          <Select value={selectedArea.toString()} onValueChange={(v) => setSelectedArea(parseInt(v))}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AREAS.map((a) => (
                <SelectItem key={a.id} value={areaIdMap[a.id].toString()}>{a.icon} {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase">En Espera ({queuedPatients.length})</div>
          {queuedPatients.map((apt, i) => {
            const currentUrgency = getDynamicUrgency(totalDelayMinutes);
            const urg = urgencyLabel(currentUrgency);
            const isPatientBusyElsewhere = appointments.some(a => a.patientName === apt.patientName && a.status === "en_procedimiento");
            const folioInfo = getFolioType(apt.folio);
            const isInBlacklist = isInT2Window(apt.scheduledTime);
            
            return (
              <div key={apt.id} className={`border rounded-lg p-3 transition-all ${isPatientBusyElsewhere || isInBlacklist ? "opacity-50 bg-muted/20" : "hover:border-primary/30"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</div>
                    <span className="text-2xl">{getAreaIcon(apt.area)}</span>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <User className={`h-3.5 w-3.5 ${isPatientBusyElsewhere ? "text-amber-500" : "text-muted-foreground"}`} />
                        {apt.patientName}
                        {isPatientBusyElsewhere && <Badge variant="outline" className="ml-2 text-[10px] border-amber-500 text-amber-600 bg-amber-50">En otra consulta</Badge>}
                        {isInBlacklist && <Badge variant="outline" className="ml-2 text-[10px] border-red-500 text-red-600 bg-red-50 flex items-center gap-1"><Clock className="h-3 w-3" /> Bloqueado</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{apt.procedure} — {apt.scheduledTime}</span>
                        {apt.folio && (
                          <Badge variant="outline" className={`text-[9px] border ${folioInfo.color}`}>
                            {folioInfo.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${urg.class} border-0 text-xs`}>{urg.text}</Badge>
                    <Button 
                      size="sm" 
                      onClick={() => handleTakePatient(apt)} 
                      disabled={isPatientBusyElsewhere || isInBlacklist} 
                      className="gap-1.5"
                    >
                      {isInBlacklist ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Bloqueado
                        </>
                      ) : isPatientBusyElsewhere ? (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          Ocupado
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          Tomar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="border-t pt-3 mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-urgency-high" /> Reportar retraso</div>
            <Textarea placeholder="Razón del retraso..." value={delayText} onChange={(e) => setDelayText(e.target.value)} className="text-sm min-h-[70px]" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Afectará a toda la fila</span>
              <Button size="sm" onClick={handleSubmitDelay} disabled={!delayText.trim() || analyzing}><Send className="h-3.5 w-3.5 mr-1" />{analyzing ? "Analizando..." : "Enviar Reporte"}</Button>
            </div>
          </div>
          {incidentesActivos.length > 0 && (
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Incidentes Activos</div>
              {incidentesActivos.map((inc) => (
                <div key={inc.id} className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-destructive">+{inc.minutos} min</span>
                    <span className="text-[11px] text-muted-foreground italic">"{inc.motivo}"</span>
                  </div>
                  <Button size="sm" onClick={() => handleSolveError(inc.id, inc.minutos)} className="h-7 px-3 bg-urgency-ontime hover:bg-urgency-ontime/80 text-white rounded-full text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Error solucionado</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2"><Play className="h-5 w-5 text-secondary" /> Mi Lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myPatients.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">Toma un paciente para comenzar</div>
          ) : (
            myPatients.map((apt) => (
              <div key={apt.id} className="border border-primary/30 bg-accent/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAreaIcon(apt.area)}</span>
                    <div className="font-medium text-sm">{apt.patientName}</div>
                  </div>
                  <Badge variant="outline" className="bg-accent gap-1"><Play className="h-3 w-3" /> En curso</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1" onClick={() => handleComplete(apt)}><CheckCircle2 className="h-3.5 w-3.5" /> Completar</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCancel(apt)}><XCircle className="h-3.5 w-3.5" /> Devolver</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}