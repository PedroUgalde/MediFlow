import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ClipboardList, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockAppointments, mockPatients } from '@/lib/mockData';
import { apiService } from '@/services/api';

interface FolioRecord {
	patientId: string;
	appointmentId: string;
	folio?: string;
}
// En tu frontend
const response_folios = await apiService.obtener_folios_id_citas();
const SIMULATED_FOLIOS: Record<string, FolioRecord> = response_folios.data;

console.log(SIMULATED_FOLIOS); 
const SIMULATED_FOLIOSV1: Record<string, FolioRecord> = {
	FOLIO001: { patientId: 'p1', appointmentId: 'a1' },
	FOLIO002: { patientId: 'p2', appointmentId: 'a3' },
	FOLIO003: { patientId: 'p3', appointmentId: 'a4' },
	FOLIO004: { patientId: 'p4', appointmentId: 'a5' },
};

export default function HomePage() {
	const navigate = useNavigate();
	const [folio, setFolio] = useState('');
	const [error, setError] = useState('');

	const sampleFolios = useMemo(() => Object.keys(SIMULATED_FOLIOS).slice(0, 3), []);

	const resolveFolio = (rawFolio: string): FolioRecord | null => {
		const normalized = rawFolio.trim();
		if (!normalized) {
			return null;
		}

		if (SIMULATED_FOLIOS[normalized]) {
			return SIMULATED_FOLIOS[normalized];
		}

		const appointment = mockAppointments.find((item) => item.folio === normalized);
		if (!appointment) {
			return null;
		}

		return {
			patientId: appointment.patientId,
			appointmentId: appointment.id,
			folio:rawFolio
		};
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const result = resolveFolio(folio);
		if (!result) {
			setError('No encontramos ese folio. Prueba uno de los simulados o un id de cita como a1.');
			return;
		}

		setError('');
		console.log("Folio resuelto:", result);
		navigate(`/mobile/app?folio=${result.folio}`);
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="w-full max-w-md bg-card rounded-2xl shadow-elevated border overflow-hidden">
				<div className="gradient-clinical p-6 text-primary-foreground relative">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,hsl(170_72%_46%/0.35),transparent_60%)]" />
					<div className="relative space-y-2">
						<p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/80">Ingreso Paciente</p>
						<h1 className="font-display text-2xl font-bold">Acceso por folio confirmado</h1>
						<p className="text-sm text-primary-foreground/85">
							Escribe tu folio para ver tu estado, tus citas activas .
						</p>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<label htmlFor="folio" className="text-sm font-medium text-foreground flex items-center gap-2">
						<KeyRound className="h-4 w-4 text-primary" /> Folio de cita
					</label>
                    <label > Su folio de cita lo puede encontrar en su recibo de pago </label>
					<Input
						id="folio"
						value={folio}
						onChange={(event) => setFolio(event.target.value)}
						placeholder="Escribe tu Folio"
						autoComplete="off"
						className="h-11"
					/>

					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}

					<Button type="submit" className="w-full h-11">
						Entrar a mi panel
					</Button>


					<div className="rounded-xl bg-muted/60 p-4 space-y-3">
						<p className="text-xs uppercase tracking-wide text-muted-foreground">Folios simulados</p>
						<div className="flex flex-wrap gap-2">
							{sampleFolios.map((sample) => (
								<button
									key={sample}
									type="button"
									onClick={() => setFolio(sample)}
									className="text-xs px-2.5 py-1.5 rounded-full bg-background border hover:border-primary transition-colors"
								>
									{sample}
								</button>
							))}
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
