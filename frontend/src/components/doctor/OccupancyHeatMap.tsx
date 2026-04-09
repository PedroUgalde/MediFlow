import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, FileBarChart } from 'lucide-react';

/**
 * Heatmap conectado a:
 * GET /api/heatmap/doctor?mes=4&anio=2026&estudio=all
 */

function getHeatColor(value: number): string {
  if (value < 15) return 'bg-heat-1';
  if (value < 30) return 'bg-heat-2';
  if (value < 45) return 'bg-heat-3';
  if (value < 60) return 'bg-heat-4';
  if (value < 75) return 'bg-heat-5';
  if (value < 90) return 'bg-heat-6';
  return 'bg-heat-7';
}

const ESTUDIOS = [
  { value: "all",          label: "Todos los estudios" },
  { value: "consulta",     label: "Consulta general" },
  { value: "rayos_x",      label: "Rayos X" },
  { value: "laboratorio",  label: "Laboratorio" },
  { value: "ultrasonido",  label: "Ultrasonido" },
];

export default function OccupancyHeatMap() {
  const [showReport, setShowReport] = useState(false);
  const [selectedArea, setSelectedArea] = useState("all");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          mes: String(mesActual),
          anio: String(anioActual),
          estudio: selectedArea,
        });

        const res = await fetch(
  `http://localhost:8000/api/heatmap/doctor?${params}`
);
        if (!res.ok) throw new Error(`Error ${res.status}`);

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedArea]);

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-2 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Mapa de Calor — Ocupación Mensual
              </CardTitle>
              <CardDescription>
                {data?.titulo ?? "Cargando ocupación..."}
              </CardDescription>
            </div>
            <Button
              variant={showReport ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowReport(!showReport)}
              className="gap-1.5"
            >
              <FileBarChart className="h-4 w-4" />
              {showReport ? 'Ver Mapa' : 'Reporte'}
            </Button>
          </div>

          <Select value={selectedArea} onValueChange={(v) => setSelectedArea(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTUDIOS.map(e => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando datos del médico...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">
              Error: {error}
            </div>
          ) : !showReport ? (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">

                {/* Encabezado días */}
                <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-1 mb-1">
                  <div />
                  {data?.dias?.map((d: string) => (
                    <div key={d} className="text-xs text-muted-foreground text-center font-medium">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Filas por semana */}
                {data?.z?.map((row: number[], si: number) => (
                  <div key={si} className="grid grid-cols-[80px_repeat(6,1fr)] gap-1 mb-1">
                    <div className="text-xs text-muted-foreground flex items-center font-medium">
                      {data.semanas?.[si]}
                    </div>

                    {row.map((val: number, di: number) => {
                      const pct = data.texto?.[si]?.[di] ?? "0%";
                      const numericPct = Number(pct.replace('%', ''));

                      return (
                        <div
                          key={di}
                          className={`${getHeatColor(numericPct)} rounded-sm h-8 flex items-center justify-center text-xs font-medium transition-all hover:scale-105 cursor-default ${val > data.capacidad_max * 0.6 ? 'text-primary-foreground' : 'text-foreground/70'}`}
                          title={`${data.semanas[si]} ${data.dias[di]}: ${val} citas (${pct})`}
                        >
                          {pct}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-2 mt-4 justify-center">
                <span className="text-xs text-muted-foreground">Baja</span>
                {['bg-heat-1','bg-heat-2','bg-heat-3','bg-heat-4','bg-heat-5','bg-heat-6','bg-heat-7'].map(c => (
                  <div key={c} className={`${c} w-6 h-4 rounded-sm`} />
                ))}
                <span className="text-xs text-muted-foreground">Alta</span>
              </div>
            </div>
          ) : (
            /* Reporte */
            data?.resumen && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-accent rounded-lg p-3 text-center">
                  <div className="text-2xl font-display font-bold text-primary">
                    {data.resumen.pct_ocupacion}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ocupación Promedio
                  </div>
                </div>
                <div className="bg-accent rounded-lg p-3 text-center">
                  <div className="text-2xl font-display font-bold text-destructive">
                    {data.resumen.total_citas}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Citas
                  </div>
                </div>
                <div className="bg-accent rounded-lg p-3 text-center">
                  <div className="text-2xl font-display font-bold text-secondary">
                    {data.resumen.dia_mas_activo}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Día más activo
                  </div>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}