import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Info, AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';
import { mockNotifications, type Notification } from '@/lib/mockData';
import { apiService } from '@/services/api'; // <--- Asegúrate de importar tu servicio

function notifIcon(type: Notification['type']) {
  switch (type) {
    case 'success': return <CheckCircle className="h-4 w-4 text-urgency-ontime" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-urgency-high" />;
    case 'delay': return <Clock className="h-4 w-4 text-urgency-medium" />;
    case 'room-assignment': return <MapPin className="h-4 w-4 text-primary" />;
    default: return <Info className="h-4 w-4 text-secondary" />;
  }
}

export default function NotificationCenter() {
  // 1. Iniciamos el estado con los datos de prueba
  const [notifications, setNotifications] = useState<Notification[]>([
    ...mockNotifications,
    {
      id: 'n5',
      title: '🏥 Asignación de sala',
      message: 'Tu doctor te está atendiendo. Dirígete a Sala 2 - Cubículo C para tu Análisis de Sangre.',
      type: 'room-assignment',
      timestamp: '09:55',
      read: false,
    },
  ]);

  const areaIdPaciente = 1; // ID de Sangre en tu Postgres

  // 2. AGREGAMOS el useEffect para escuchar a Redis
  useEffect(() => {
    const revisarRetrasos = async () => {
      try {
        const data = await apiService.obtenerNotificacionRetraso(areaIdPaciente);
        
        if (data.hay_retraso) {
          const nuevaNotif: Notification = {
            id: `delay-${Date.now()}`,
            title: '⚠️ Retraso en tu Área',
            message: data.mensaje,
            type: 'delay',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
          };

          setNotifications(prev => {
            // Solo agregamos si el mensaje es diferente al último recibido
            const existe = prev.some(n => n.message === nuevaNotif.message && !n.read);
            return existe ? prev : [nuevaNotif, ...prev];
          });
        }
      } catch (error) {
        console.error("Error consultando Redis:", error);
      }
    };

    const intervalo = setInterval(revisarRetrasos, 10000); // Revisa cada 10 seg
    revisarRetrasos(); 

    return () => clearInterval(intervalo);
  }, []);

  // 3. MANTENEMOS las funciones y lógica que ya tenías
  const unread = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificaciones
          {unread > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5 font-medium">
              {unread}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`flex gap-3 p-3 rounded-lg transition-all cursor-pointer ${
              n.read ? 'bg-background' : n.type === 'room-assignment' ? 'bg-accent border border-primary/20' : 'bg-accent/50 hover:bg-accent'
            }`}
            onClick={() => markRead(n.id)}
          >
            <div className="mt-0.5">{notifIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">{n.timestamp}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}