import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AREAS, type Appointment } from '@/lib/mockData';
import { ClipboardList, Users, Clock, TrendingUp } from 'lucide-react';

interface Props {
  appointments: Appointment[];
}

export default function HistoryTab({ appointments }: Props) {
  const dispatched = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const totalToday = dispatched.length;

  // Average wait per area
  const areaWaits = AREAS.map(area => {
    const areaAppts = dispatched.filter(a => a.area === area.id && a.startTime && a.arrivalTime);
    if (areaAppts.length === 0) return { area: area.name, icon: area.icon, avg: 0 };
    const totalMin = areaAppts.reduce((sum, a) => {
      const arrival = parseInt(a.arrivalTime!.replace(':', ''), 10);
      const start = parseInt(a.startTime!.replace(':', ''), 10);
      // Simple minute diff approximation
      const arrH = Math.floor(arrival / 100), arrM = arrival % 100;
      const stH = Math.floor(start / 100), stM = start % 100;
      return sum + ((stH * 60 + stM) - (arrH * 60 + arrM));
    }, 0);
    return { area: area.name, icon: area.icon, avg: Math.round(totalMin / areaAppts.length) };
  });

  const completedCount = dispatched.filter(a => a.status === 'completed').length;
  const efficiency = totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-display font-bold">{totalToday}</div>
              <div className="text-xs text-muted-foreground">Pacientes Hoy</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Clock className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <div className="text-sm font-medium space-y-0.5">
                {areaWaits.filter(a => a.avg > 0).map(a => (
                  <div key={a.area} className="text-xs">{a.icon} {a.area}: <span className="font-bold">{a.avg} min</span></div>
                ))}
                {areaWaits.every(a => a.avg === 0) && <div className="text-xs text-muted-foreground">Sin datos</div>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Tiempo Promedio Espera</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-display font-bold">{efficiency}%</div>
              <div className="text-xs text-muted-foreground">Eficiencia de Flujo</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Registro de Pacientes Despachados
          </CardTitle>
          <CardDescription>Historial completo de atenciones del día</CardDescription>
        </CardHeader>
        <CardContent>
          {dispatched.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No hay pacientes despachados aún</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Llegada</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatched.map(apt => {
                    const areaInfo = AREAS.find(a => a.id === apt.area);
                    return (
                      <TableRow key={apt.id}>
                        <TableCell className="font-medium">{apt.patientName}</TableCell>
                        <TableCell>{areaInfo?.icon} {areaInfo?.name}</TableCell>
                        <TableCell>{apt.assignedDoctor || '—'}</TableCell>
                        <TableCell>{apt.arrivalTime || '—'}</TableCell>
                        <TableCell>{apt.startTime || '—'}</TableCell>
                        <TableCell>{apt.endTime || '—'}</TableCell>
                        <TableCell>
                          {apt.status === 'completed' ? (
                            <Badge className="bg-urgency-ontime text-primary-foreground text-xs">Completado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive text-xs">Cancelado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
