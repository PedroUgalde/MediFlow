import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

type SimularPagoButtonProps = {
  folio?: string | null;
  onSuccess?: () => void;
};

export default function SimularPagoButton({ folio, onSuccess }: SimularPagoButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSimularPago = async () => {
    if (!folio) {
      toast({
        title: 'Folio no disponible',
        description: 'No se encontró un folio para simular el pago.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.simularPago(folio);

      if (!response?.ok) {
        throw new Error(response?.detail ?? 'No se pudo actualizar la cita.');
      }

      toast({
        title: 'Pago simulado',
        description: 'Se a pagado la cita exitosamente.',
      });

      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado al simular el pago.';
      toast({
        title: 'Error al simular pago',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button className="w-full" onClick={handleSimularPago} disabled={isLoading || !folio}>
      {isLoading ? 'Procesando pago...' : 'Simular pago'}
    </Button>
  );
}