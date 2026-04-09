import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Stethoscope, Smartphone, ArrowRight, Activity, Shield, Clock, CalendarPlus } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <header className="gradient-clinical relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,hsl(168_72%_46%/0.3),transparent_50%)]" />
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 relative">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-8 w-8 text-primary-foreground" />
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-primary-foreground">MediFlow</h1>
          </div>
          <p className="text-primary-foreground/90 text-lg md:text-xl max-w-lg mb-8 leading-relaxed">
            Plataforma inteligente de gestión hospitalaria. Optimiza tiempos, reduce retrasos y mejora la experiencia del paciente con IA.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="border-primary-foreground/30 text-foreground hover:bg-primary-foreground/10 font-semibold gap-2"
            >
              <Stethoscope className="h-5 w-5" />
              Dashboard Doctor
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/mobile')}
              className="border-primary-foreground/30 text-foreground hover:bg-primary-foreground/10 font-semibold gap-2"
            >
              <Smartphone className="h-5 w-5" />
              App Paciente
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/book-cita')}
              className="border-primary-foreground/30 text-foreground hover:bg-primary-foreground/10 font-semibold gap-2"
            >
              <CalendarPlus className="h-5 w-5" />
              Agendar Cita
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Features */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Activity,
              title: 'Análisis en Tiempo Real',
              desc: 'Mapas de calor y métricas de ocupación para la toma de decisiones estratégicas.',
            },
            {
              icon: Clock,
              title: 'Gestión de Retrasos',
              desc: 'IA analiza incidencias, asigna urgencia y notifica automáticamente a los pacientes.',
            },
            {
              icon: Shield,
              title: 'Experiencia del Paciente',
              desc: 'Tarjetas inteligentes y actualizaciones en tiempo real.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card rounded-xl shadow-card p-6 hover:shadow-card-hover transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card px-6 py-4 text-center text-xs text-muted-foreground">
        MediFlow — Plataforma de Gestión Hospitalaria Inteligente
      </footer>
    </div>
  );
}
