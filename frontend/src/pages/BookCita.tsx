import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppointmentScheduler from '@/components/patient/AppointmentScheduler';
import { mockPatients } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarPlus, ArrowLeft } from 'lucide-react';

export default function BookCita() {
	const navigate = useNavigate();
	const [selectedPatientId, setSelectedPatientId] = useState<string>(mockPatients[0]?.id ?? 'p1');
	const [agendaOnline, setAgendaOnline] = useState<boolean>(true);

	const selectedPatient = useMemo(
		() => mockPatients.find(patient => patient.id === selectedPatientId) ?? mockPatients[0],
		[selectedPatientId]
	);

	return (
		<div className="min-h-screen bg-background">
			<header className="gradient-clinical px-6 py-6">
				<div className="max-w-5xl mx-auto flex items-center justify-between">
					<div>
						<h1 className="font-display text-2xl font-bold text-primary-foreground flex items-center gap-2">
							<CalendarPlus className="h-6 w-6" />
							Agenda de Citas
						</h1>
						<p className="text-primary-foreground/80 text-sm mt-1">
							Agenda independiente por paciente sin depender del login de la app movil.
						</p>
					</div>

					<Button variant="outline" className="gap-2" onClick={() => navigate('/')}>
						<ArrowLeft className="h-4 w-4" />
						Volver
					</Button>
				</div>
			</header>

			<main className="max-w-5xl mx-auto p-6 space-y-4">
				<Card className="shadow-card">
					<CardHeader>
						<CardTitle className="font-display text-lg">Seleccion de Paciente</CardTitle>
						<CardDescription>
							Selecciona un paciente del mock para asignar la cita desde esta pagina.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid md:grid-cols-2 gap-3">
						<div>
							<Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
								<SelectTrigger>
									<SelectValue placeholder="Selecciona paciente" />
								</SelectTrigger>
								<SelectContent>
									{mockPatients.map(patient => (
										<SelectItem key={patient.id} value={patient.id}>
											{patient.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="rounded-md border border-border bg-card p-3 text-sm">
							<div><span className="font-medium">ID:</span> {selectedPatient?.id}</div>
							<div><span className="font-medium">Nombre:</span> {selectedPatient?.name}</div>
							<div><span className="font-medium">Edad:</span> {selectedPatient?.age ?? '-'} anios</div>
						</div>

						<div>
							<Select value={agendaOnline ? 'online' : 'offline'} onValueChange={(value) => setAgendaOnline(value === 'online')}>
								<SelectTrigger>
									<SelectValue placeholder="Tipo de registro" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="online">Registro en línea (F)</SelectItem>
									<SelectItem value="offline">Registro presencial (G)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="rounded-md border border-border bg-card p-3 text-sm">
							<div><span className="font-medium">Tipo:</span> {agendaOnline ? 'En línea' : 'Presencial'}</div>
							<div><span className="font-medium">Prefijo Folio:</span> {agendaOnline ? 'F' : 'G'}</div>
						</div>
					</CardContent>
				</Card>

				<AppointmentScheduler patientId={selectedPatientId} agendaOnline={agendaOnline}/>
			</main>
		</div>
	);
}
