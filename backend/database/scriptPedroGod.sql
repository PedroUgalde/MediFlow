
TRUNCATE cita, paciente, doctor, estudios, areas, errores_especificos, categorias_retraso CASCADE;
-- 2. Insertar Áreas con IDs fijos (Muy importante para tu mapa de React)
INSERT INTO areas (id, nombre, capacidad_doctores_simultaneos, sala) VALUES
(1, 'sangre', 3, 'Sala 2 - Cubículo C'),
(2, 'rayos-x', 2, 'Sala 1 - Cubículo B'),
(3, 'ultrasonido', 2, 'Sala 3 - Cubículo A'),
(4, 'cardiologia', 1, 'Sala 4 - Cubículo D'),
(5, 'general', 4, 'Sala 5 - Cubículo E');

-- 3. Insertar Doctores
INSERT INTO doctor (id, nombre, especialidad) VALUES
(1, 'Dra. Rodríguez', 'Radiología'),
(2, 'Dr. Pérez', 'Cardiología');

-- 4. Insertar Estudios
INSERT INTO estudios (id, nombre, area_id, tiempo_base_minutos) VALUES
(1, 'Análisis de Sangre', 1, 10),
(2, 'Radiografía de Tórax', 2, 15),
(3, 'Ecografía Abdominal', 3, 30),
(4, 'Electrocardiograma', 4, 20),
(5, 'Consulta General', 5, 20);

-- 5. Insertar Pacientes
INSERT INTO paciente (id, nombre, genero) VALUES
(1, 'María García', 'Femenino'),
(2, 'Carlos López', 'Masculino'),
(3, 'Ana Martínez', 'Femenino');

-- 6. Insertar Citas para HOY (8 de Abril de 2026)
-- Usamos 'en_espera' porque es lo que configuramos en el Frontend
INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, fecha_cita, estado) VALUES 
('F00001', 1, 1, 1, '09:00:00', CURRENT_DATE,'en_espera'), -- María en Sangre
('F00001', 1, 2, 2, '10:30:00', CURRENT_DATE,'en_espera'), -- María en Rayos-X
('F00002', 2, 4, 4, '09:30:00', CURRENT_DATE,'en_espera'), -- Carlos en Cardio
('F00003', 3, 3, 3, '11:00:00', CURRENT_DATE,'en_espera'); -- Ana en Ultrasonido

-- 7. Resetear los contadores de ID para que no choquen en el futuro
SELECT setval('areas_id_seq', (SELECT MAX(id) FROM areas));
SELECT setval('paciente_id_seq', (SELECT MAX(id) FROM paciente));
SELECT setval('doctor_id_seq', (SELECT MAX(id) FROM doctor));
SELECT setval('estudios_id_seq', (SELECT MAX(id) FROM estudios));
SELECT setval('cita_id_seq', (SELECT MAX(id) FROM cita));





-- 1. Insertar más Pacientes (ID 4 al 15)
INSERT INTO paciente (id, nombre, genero, fecha_nacimiento) VALUES
(4, 'Roberto Sánchez', 'Masculino', '1975-11-20'),
(5, 'Laura Hernández', 'Femenino', '1998-05-04'),
(6, 'Miguel Ángel Ruiz', 'Masculino', '1982-03-15'),
(7, 'Elena Beltrán', 'Femenino', '1990-09-22'),
(8, 'Javier Torres', 'Masculino', '1965-12-01'),
(9, 'Sofía Castro', 'Femenino', '2001-07-14'),
(10, 'Diego Morales', 'Masculino', '1988-01-30'),
(11, 'Lucía Méndez', 'Femenino', '1995-06-18'),
(12, 'Fernando Soto', 'Masculino', '1970-04-25'),
(13, 'Patricia Luna', 'Femenino', '1984-10-12'),
(14, 'Gabriel Ríos', 'Masculino', '1992-08-08'),
(15, 'Isabel Peña', 'Femenino', '1978-02-28');

-- 2. Insertar más Citas para HOY (Distribuida en horas pico y valle)

-- Bloque Mañana (07:00 - 09:00)
INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, fecha_cita, estado) VALUES 
('F00004', 4, 1, 1, '07:15:00', CURRENT_DATE), -- Ya terminó
('F00005', 5, 5, 5, '08:00:00', CURRENT_DATE), -- Ya terminó
('F00006', 6, 2, 2, '08:30:00', CURRENT_DATE), -- Está adentro
('F00007', 7, 4, 4, '08:45:00', CURRENT_DATE); -- Está adentro

-- Bloque Media Mañana (10:00 - 12:00) - Mucha actividad en Laboratorio y General
INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, fecha_cita, estado) VALUES 
('F00008', 8, 1, 1, '10:00:00', CURRENT_DATE,'waiting'),
('F00009', 9, 1, 1, '10:15:00', CURRENT_DATE,'waiting'),
('F00010', 10, 5, 5, '10:30:00', CURRENT_DATE,'waiting'),
('F00011', 11, 5, 5, '10:45:00', CURRENT_DATE,'waiting'), -- Marcada como retrasada para pruebas
('F00012', 12, 3, 3, '11:15:00', CURRENT_DATE,'waiting'),
('F00013', 13, 2, 2, '11:30:00', CURRENT_DATE,'waiting');

-- Bloque Tarde (13:00 - 16:00)
INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, fecha_cita, estado) VALUES 
('F00014', 14, 4, 4, '13:00:00', CURRENT_DATE,'waiting'),
('F00015', 15, 5, 5, '14:00:00', CURRENT_DATE,'waiting'),
('F00004', 4, 3, 3, '15:30:00', CURRENT_DATE,'waiting'), -- Roberto regresa para ultrasonido
('F00008', 8, 2, 2, '16:00:00', CURRENT_DATE,'waiting'); --



-- 1. Insertar una base más amplia de pacientes (ID 16 al 35)
INSERT INTO paciente (id, nombre, genero) VALUES
(16, 'Ricardo Luna', 'Masculino'), (17, 'Beatriz Solis', 'Femenino'),
(18, 'Hugo Paredes', 'Masculino'), (19, 'Jimena Olvera', 'Femenino'),
(20, 'Kevin Duarte', 'Masculino'), (21, 'Marisol Vega', 'Femenino'),
(22, 'Raul Zúñiga', 'Masculino'), (23, 'Daniela Kuri', 'Femenino'),
(24, 'Esteban Gallo', 'Masculino'), (25, 'Monica Jara', 'Femenino'),
(26, 'Arturo Pineda', 'Masculino'), (27, 'Silvia Mota', 'Femenino'),
(28, 'Oscar Vaca', 'Masculino'), (29, 'Teresa Rojas', 'Femenino'),
(30, 'Victor Slim', 'Masculino'), (31, 'Yolanda Ortiz', 'Femenino'),
(32, 'Zoe Valadez', 'Femenino'), (33, 'Ximena Neri', 'Femenino'),
(34, 'Andrés Vera', 'Masculino'), (35, 'Camila Paz', 'Femenino');

-- 2. Carga Masiva de Citas (Simulando "Hora Pico" de 09:00 a 13:00)

-- Saturación en Laboratorio (Área 1) - Capacidad 3 doctores simultáneos
INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, fecha_cita, estado) VALUES 
('F00101', 16, 1, 1, '09:00:00', CURRENT_DATE, 'en_espera'),
('F00102', 17, 1, 1, '09:05:00', CURRENT_DATE, 'en_espera'),
('F00103', 18, 1, 1, '09:10:00', CURRENT_DATE, 'en_espera'),
('F00104', 19, 1, 1, '09:15:00', CURRENT_DATE, 'en_espera'),
('F00105', 20, 1, 1, '09:20:00', CURRENT_DATE, 'en_espera'),
('F00106', 21, 1, 1, '09:25:00', CURRENT_DATE, 'en_espera');

-- Saturación en Rayos-X (Área 2) - Capacidad 2 doctores
INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, fecha_cita, estado) VALUES 
('F00201', 22, 2, 2, '10:00:00', CURRENT_DATE, 'en_espera'),
('F00202', 23, 2, 2, '10:10:00', CURRENT_DATE, 'en_espera'),
('F00203', 24, 2, 2, '10:20:00', CURRENT_DATE, 'en_espera'),
('F00204', 25, 2, 2, '10:30:00', CURRENT_DATE, 'en_espera'),
('F00205', 26, 2, 2, '10:40:00', CURRENT_DATE, 'en_espera');

-- Saturación en Consulta General (Área 5) - La más crítica para tu algoritmo
INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, fecha_cita, estado) VALUES 
('F00501', 27, 5, 5, '11:00:00', CURRENT_DATE, 'en_espera'),
('F00502', 28, 5, 5, '11:05:00', CURRENT_DATE, 'en_espera'),
('F00503', 29, 5, 5, '11:10:00', CURRENT_DATE, 'en_espera'),
('F00504', 30, 5, 5, '11:15:00', CURRENT_DATE, 'en_espera'),
('F00505', 31, 5, 5, '11:20:00', CURRENT_DATE, 'en_espera'),
('F00506', 32, 5, 5, '11:25:00', CURRENT_DATE, 'en_espera'),
('F00507', 33, 5, 5, '11:30:00', CURRENT_DATE, 'en_espera'),
('F00508', 34, 5, 5, '11:35:00', CURRENT_DATE, 'en_espera'),
('F00509', 35, 5, 5, '11:40:00', CURRENT_DATE, 'en_espera');

-- Citas de seguimiento (Pacientes que tienen 2 estudios el mismo día)
INSERT INTO cita (folio, paciente_id, estudio_id, area_id, hora_programada, fecha_cita, estado) VALUES 
('F00101', 16, 2, 2, '12:00:00', CURRENT_DATE, 'en_espera'), -- Ricardo va a Rayos X después de Sangre
('F00103', 18, 5, 5, '12:30:00', CURRENT_DATE, 'en_espera'), -- Hugo va a General después de Sangre
('F00202', 23, 4, 4, '13:00:00', CURRENT_DATE, 'en_espera'), -- Daniela va a Cardio después de Rayos X
('F00205', 26, 3, 3, '13:30:00', CURRENT_DATE, 'en_espera'); -- Arturo va a Ultrasonido después de Rayos X

-- 3. Reset de secuencias
SELECT setval('paciente_id_seq', (SELECT MAX(id) FROM paciente));
SELECT setval('cita_id_seq', (SELECT MAX(id) FROM cita));