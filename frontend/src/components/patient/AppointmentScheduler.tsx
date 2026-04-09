import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';

type HeatmapData = {
  titulo: string;
  dias: string[];
  horas: string[];
  z: number[][];
};

type Estudio = {
  id: number;
  nombre: string;
  area_nombre: string;
  sala: string;
};

type Props = {
  patientId: string;
  agendaOnline: boolean;
};

type AgendaItem = {
  key: string;
  estudio_id: number;
  estudio_nombre: string;
  area_nombre: string;
  fecha_cita: string;
  hora_programada: string;
};

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekStart(weekOffset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function AppointmentScheduler({ patientId, agendaOnline }: Props) {
  const { toast } = useToast();
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const [estudioActualId, setEstudioActualId] = useState<string>('');
  const [fechaActual, setFechaActual] = useState('');
  const [horaActual, setHoraActual] = useState('');
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [heatmapResult, estudiosResult] = await Promise.all([
          apiService.obtenerHeatmapPaciente(weekOffset),
          apiService.obtenerEstudios(),
        ]);
        setHeatmap(heatmapResult);
        setEstudios(estudiosResult.data || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo cargar la disponibilidad.';
        toast({
          title: 'Error al cargar agenda',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [weekOffset, toast]);

  const handlePickSlot = (dayIndex: number, hourIndex: number, available: number) => {
    if (!heatmap || available <= 0) {
      return;
    }

    const selectedDate = new Date(weekStart);
    selectedDate.setDate(weekStart.getDate() + dayIndex);

    setFechaActual(toDateInputValue(selectedDate));
    setHoraActual(heatmap.horas[hourIndex]);
  };

  const handleAddCurrentStudy = () => {
    if (!estudioActualId || !fechaActual || !horaActual) {
      toast({
        title: 'Faltan datos del estudio',
        description: 'Selecciona estudio, fecha y hora para agregarlo a la cita.',
        variant: 'destructive',
      });
      return;
    }

    const estudio = estudios.find(item => item.id === Number(estudioActualId));
    if (!estudio) {
      toast({
        title: 'Estudio invalido',
        description: 'No se encontro el estudio seleccionado.',
        variant: 'destructive',
      });
      return;
    }

    const newItem: AgendaItem = {
      key: `${estudio.id}-${fechaActual}-${horaActual}-${Date.now()}`,
      estudio_id: estudio.id,
      estudio_nombre: estudio.nombre,
      area_nombre: estudio.area_nombre,
      fecha_cita: fechaActual,
      hora_programada: horaActual,
    };

    setAgendaItems(prev => [...prev, newItem]);
    setEstudioActualId('');
    setFechaActual('');
    setHoraActual('');

    toast({
      title: 'Estudio agregado',
      description: 'Se agrego al folio. Si quieres, agrega otro estudio con otro horario.',
    });
  };

  const handleRemoveItem = (itemKey: string) => {
    setAgendaItems(prev => prev.filter(item => item.key !== itemKey));
  };

  const handleSubmit = async () => {
    
    if (agendaItems.length === 0) {
      toast({
        title: 'No hay estudios agregados',
        description: 'Agrega al menos un estudio con su fecha y hora.',
        variant: 'destructive',
      });
      return;
    }

    const pacienteNumerico = Number(String(patientId).replace(/^p/i, ''));
    if (!Number.isFinite(pacienteNumerico) || pacienteNumerico <= 0) {
      toast({
        title: 'Paciente invalido',
        description: 'No se pudo identificar al paciente para agendar la cita.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.agendarCita({
        paciente_id: pacienteNumerico,
        estudios: agendaItems.map(item => ({
          estudio_id: item.estudio_id,
          fecha_cita: item.fecha_cita,
          hora_programada: item.hora_programada,
        })),
        agenda_online: agendaOnline,
      });

      toast({
        title: 'Cita agendada',
        description: `Folio: ${response?.data?.folio ?? 'generado'} con ${response?.data?.total_estudios ?? agendaItems.length} estudios.`,
      });

      setAgendaItems([]);
      setEstudioActualId('');
      setFechaActual('');
      setHoraActual('');
      setWeekOffset(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo agendar la cita.';
      toast({
        title: 'Error al agendar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Heatmap de Horarios
          </CardTitle>
          <CardDescription className="text-xs">
            Selecciona un bloque con disponibilidad para precargar fecha y hora.
          </CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(v => v - 1)}>
              Semana anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(v => v + 1)}>
              Semana siguiente
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loadingData || !heatmap ? (
            <div className="text-sm text-muted-foreground">Cargando disponibilidad...</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[360px]">
                <div className="grid grid-cols-[60px_repeat(6,1fr)] gap-1 mb-1">
                  <div />
                  {heatmap.dias.map((day, dayIndex) => (
                    <div key={`${day}-${dayIndex}`} className="text-[10px] text-center text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                {heatmap.horas.map((hour, hourIndex) => (
                  <div key={hour} className="grid grid-cols-[60px_repeat(6,1fr)] gap-1 mb-1">
                    <div className="text-[10px] text-muted-foreground flex items-center">{hour}</div>
                    {heatmap.z[hourIndex]?.map((available, dayIndex) => {
                      const isUnavailable = available <= 0;
                      const color = isUnavailable
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : available <= 1
                        ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                        : 'bg-emerald-200 text-emerald-900 hover:bg-emerald-300';

                      return (
                        <button
                          key={`${hour}-${dayIndex}`}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => handlePickSlot(dayIndex, hourIndex, available)}
                          className={`h-7 rounded text-[10px] font-semibold transition-colors ${color}`}
                        >
                          {available < 0 ? '-' : available}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-secondary" />
            Agendar Nueva Cita
          </CardTitle>
          <CardDescription className="text-xs">
            Escoge estudio, fecha y hora. Puedes usar el heatmap para precargar el horario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Estudio</Label>
            <Select value={estudioActualId} onValueChange={setEstudioActualId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estudio" />
              </SelectTrigger>
              <SelectContent>
                {estudios.map(estudio => (
                  <SelectItem key={estudio.id} value={String(estudio.id)}>
                    {estudio.nombre} - {estudio.area_nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" value={fechaActual} onChange={e => setFechaActual(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hora</Label>
              <Select value={horaActual} onValueChange={setHoraActual}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona hora" />
                </SelectTrigger>
                <SelectContent>
                  {(heatmap?.horas ?? []).map(hora => (
                    <SelectItem key={hora} value={hora}>
                      {hora}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleAddCurrentStudy}>
            Agregar estudio 
          </Button>

          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="text-sm font-medium">Estudios agregados al folio</div>
            {agendaItems.length === 0 ? (
              <div className="text-xs text-muted-foreground">Aun no agregas estudios.</div>
            ) : (
              agendaItems.map(item => (
                <div key={item.key} className="flex items-center justify-between text-sm bg-muted/40 rounded px-2 py-1">
                  <div>
                    <div className="font-medium">{item.estudio_nombre}</div>
                    <div className="text-xs text-muted-foreground">{item.fecha_cita} - {item.hora_programada}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.key)}>
                    Quitar
                  </Button>
                </div>
              ))
            )}
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Agendando...' : 'Agendar cita'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
