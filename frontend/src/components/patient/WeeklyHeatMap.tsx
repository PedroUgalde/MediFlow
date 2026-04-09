import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Flame } from 'lucide-react';

/**
 * Conectado a:
 * GET /api/heatmap/paciente
 */

function getHeatColor(value: number): string {
  if (value <= 0) return 'bg-gray-200';
  if (value === 1) return 'bg-heat-3';
  if (value === 2) return 'bg-heat-4';
  if (value === 3) return 'bg-heat-6';
  return 'bg-heat-7';
}

export default function WeeklyHeatMap() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 Fetch real al backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await fetch("http://localhost:8000/api/heatmap/paciente");
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
  }, []);

  /**
   * 🔄 Transponer matriz
   * Backend: z[hora][dia]
   * Frontend necesita: z[dia][hora]
   */
  const weeklyMatrix = useMemo(() => {
    if (!data?.z) return [];

    const horas = data.z.length;
    const dias = data.z[0]?.length ?? 0;

    const transpuesta: number[][] = [];

    for (let d = 0; d < dias; d++) {
      const fila: number[] = [];
      for (let h = 0; h < horas; h++) {
        fila.push(data.z[h][d]);
      }
      transpuesta.push(fila);
    }

    return transpuesta;
  }, [data]);

  /**
   * 📊 Generar datos de demanda de hoy
   * Usamos el día actual
   */
  const todayDemand = useMemo(() => {
    if (!data?.z) return [];

    const hoy = new Date().getDay(); // 0=domingo
    const indiceDia = hoy === 0 ? 5 : hoy - 1; // ajustar a Lun=0

    return data.horas.map((hora: string, hi: number) => ({
      hour: hora,
      patients: data.z[hi]?.[indiceDia] ?? 0,
    }));
  }, [data]);

  return (
    <div className="space-y-4">

      {/* Weekly Heatmap */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-urgency-medium" />
            {data?.titulo ?? "Ocupación Semanal"}
          </CardTitle>
          <CardDescription className="text-xs">
            Horarios con mayor disponibilidad
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Cargando...</div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">Error: {error}</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[420px]">

                {/* Encabezado horas */}
                <div className="grid grid-cols-[50px_repeat(auto-fit,minmax(30px,1fr))] gap-0.5 mb-0.5">
                  <div />
                  {data.horas.map((h: string) => (
                    <div key={h} className="text-[10px] text-muted-foreground text-center">
                      {h}
                    </div>
                  ))}
                </div>

                {/* Filas por día */}
                {weeklyMatrix.map((row: number[], di: number) => (
                  <div key={di} className="grid grid-cols-[50px_repeat(auto-fit,minmax(30px,1fr))] gap-0.5 mb-0.5">
                    <div className="text-[10px] text-muted-foreground flex items-center">
                      {data.dias[di]}
                    </div>

                    {row.map((val: number, hi: number) => (
                      <div
                        key={hi}
                        className={`${getHeatColor(val)} rounded-sm h-6 flex items-center justify-center text-[9px] font-medium ${val <= 1 ? 'text-primary-foreground' : 'text-foreground/60'}`}
                        title={`${data.dias[di]} ${data.horas[hi]}: ${val} slots disponibles`}
                      >
                        {val}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demanda de hoy */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-secondary" />
            Disponibilidad de Hoy
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={todayDemand}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 92%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid hsl(210 20% 90%)',
                    fontSize: 12
                  }}
                  formatter={(value: number) => [value, 'Slots disponibles']}
                />
                <ReferenceLine y={0} stroke="hsl(0, 72%, 51%)" strokeDasharray="3 3" />
                <Bar dataKey="patients" fill="hsl(210, 60%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}