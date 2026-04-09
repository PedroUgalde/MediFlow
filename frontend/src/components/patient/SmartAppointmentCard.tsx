import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  User,
  XCircle,
} from "lucide-react";
import type { Appointment } from "@/lib/mockData";
import { useState, useEffect } from "react";
import { apiService } from "@/services/api";

function urgencyBorder(level: number) {
  const borders: Record<number, string> = {
    1: "border-l-urgency-ontime",
    2: "border-l-urgency-low",
    3: "border-l-urgency-medium",
    4: "border-l-urgency-high",
    5: "border-l-urgency-critical",
  };
  return borders[level] || borders[1];
}

function cardBg(status: string) {
  switch (status) {
    case "in-progress":
      return "bg-accent/60";
    case "completed":
      return "bg-muted/50 opacity-80";
    case "cancelled":
      return "bg-muted/30 opacity-60";
    default:
      return "bg-card";
  }
}

function statusBadge(status: string, assignedDoctor?: string) {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="outline"
          className="bg-urgency-ontime/20 text-accent-foreground text-xs gap-1"
        >
          <CheckCircle2 className="h-3 w-3" /> Completado
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="text-destructive text-xs gap-1">
          <XCircle className="h-3 w-3" /> Cancelado
        </Badge>
      );
    case "in-progress":
      return (
        <div className="flex flex-col items-end gap-1">
          <Badge className="bg-secondary text-secondary-foreground text-xs animate-pulse-soft">
            Siendo Atendido
          </Badge>
          {assignedDoctor && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User className="h-2.5 w-2.5" /> {assignedDoctor}
            </span>
          )}
        </div>
      );
    case "delayed":
      return (
        <Badge className="bg-urgency-high text-primary-foreground text-xs gap-1">
          <AlertCircle className="h-3 w-3" /> Retrasado
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          En espera
        </Badge>
      );
  }
}

export default function SmartAppointmentCard({
  appointment,
}: {
  appointment: Appointment;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dynamicDelay, setDynamicDelay] = useState(0);
  const [delayMessage, setDelayMessage] = useState("");
  const a = appointment;

  useEffect(() => {
    const fetchRealTimeDelay = async () => {
      // MAPEADO ROBUSTO
      const areaMapping: Record<string, number> = {
        'sangre': 1,
        'rayos-x': 2,      // <--- IMPORTANTE: Guion medio
        'ultrasonido': 3,
        'cardiologia': 4,
        'general': 5
      };

      const areaId = areaMapping[a.area];

      // DEBUG: Abre la consola (F12) y revisa si sale este mensaje
      console.log(`Verificando área: ${a.area} -> ID: ${areaId}`);

      if (areaId) {
        try {
          const data = await apiService.obtenerNotificacionRetraso(areaId);
          if (data.hay_retraso) {
            setDynamicDelay(data.minutos);
            setDelayMessage(data.mensaje);
          } else {
            setDynamicDelay(0);
            setDelayMessage("");
          }
        } catch (error) {
          console.error("Error en sincronización con Redis:", error);
        }
      }
    };

    fetchRealTimeDelay();
    const interval = setInterval(fetchRealTimeDelay, 5000);
    return () => clearInterval(interval);
  }, [a.area]); // Se vuelve a ejecutar si el área de la cita cambia

  return (
    <div
      className={`${cardBg(a.status)} rounded-lg border-l-4 ${urgencyBorder(
        a.urgencyLevel
      )} shadow-card transition-all hover:shadow-card-hover cursor-pointer`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{a.icon}</span>
          <div>
            <div className="font-medium text-sm">{a.procedure}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {a.scheduledTime}

              {/* LÓGICA DE VISUALIZACIÓN DE TIEMPO */}
              {(dynamicDelay > 0 || a.estimatedDelay > 0) && (
                <span
                  className={`font-medium ${
                    dynamicDelay > 0
                      ? "text-destructive animate-pulse"
                      : "text-urgency-high"
                  }`}
                >
                  (+{dynamicDelay > 0 ? dynamicDelay : a.estimatedDelay} min)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(a.status, a.assignedDoctor)}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-slide-up border-t border-border pt-3">
          {/* MENSAJE DE RETRASO EN ROJO (DINÁMICO) */}
          {dynamicDelay > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 flex items-start gap-2 animate-in fade-in zoom-in duration-300">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-xs text-destructive font-semibold">
                {delayMessage ||
                  "Atención: Se reporta un retraso en esta área."}
              </div>
            </div>
          )}

          {(a.status === "waiting" || a.status === "delayed") &&
            !dynamicDelay && (
              <div className="text-xs text-muted-foreground">
                📋 Posición estimada en fila — revisa notificaciones para
                actualizaciones
              </div>
            )}

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Instrucciones
            </div>
            <ul className="space-y-1">
              {a.instructions.map((inst, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground/80 flex items-start gap-2"
                >
                  <span className="text-primary mt-0.5">•</span> {inst}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progreso</span>
              <span>{a.progress}%</span>
            </div>
            <Progress value={a.progress} className="h-2" />
          </div>

          {/* NOTAS DINÁMICAS */}
          {(a.doctorNotes.length > 0 || dynamicDelay > 0) && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Estado de la atención
              </div>
              {dynamicDelay > 0 && (
                <div className="text-sm bg-destructive/5 border-l-2 border-destructive rounded-r-md px-3 py-2 mb-1 text-destructive-foreground italic">
                  Aviso IA: {delayMessage} (Retraso total: {dynamicDelay} min)
                </div>
              )}
              {a.doctorNotes.map((note, i) => (
                <div
                  key={i}
                  className="text-sm bg-muted rounded-md px-3 py-2 mb-1 text-muted-foreground"
                >
                  {note}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
