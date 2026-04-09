-- 1. Catálogo de Áreas (Ej: Ultrasonido, Rayos X, Laboratorio)
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    capacidad_doctores_simultaneos INTEGER DEFAULT 1,
    sala VARCHAR(50) NOT NULL
);

-- 2. Catálogo de Estudios (El tiempo base que debería tardar)
CREATE TABLE estudios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    area_id INTEGER REFERENCES areas(id),
    tiempo_base_minutos INTEGER NOT NULL
);

-- 3. Categorías de Errores (Para agrupar fallas similares)
CREATE TABLE categorias_retraso (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tiempo_promedio_global DECIMAL(5,2) DEFAULT 0.0,
    total_casos INTEGER DEFAULT 0
);

-- 4. Errores Específicos (Lo que el buscador de Python encontrará)
CREATE TABLE errores_especificos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias_retraso(id),
    nombre_error VARCHAR(200) NOT NULL,
    tiempo_promedio_historico DECIMAL(5,2) DEFAULT 0.0,
    conteo_casos INTEGER DEFAULT 0
);

-- 5. Cola de Pacientes (El estado actual de la clínica)
CREATE TABLE cola_pacientes (
    id SERIAL PRIMARY KEY,
    paciente_id VARCHAR(50) NOT NULL,
    estudio_id INTEGER REFERENCES estudios(id),
    area_id INTEGER REFERENCES areas(id),
    orden_llegada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) CHECK (estado IN ('en_espera', 'en_procedimiento', 'finalizado', 'cancelado'))
);

-- 6. Log de Incidentes (Esta tabla es la fuente para tu Machine Learning)
CREATE TABLE log_incidentes (
    id SERIAL PRIMARY KEY,
    error_id INTEGER REFERENCES errores_especificos(id),
    paciente_id VARCHAR(50),
    tiempo_estimado_doctor INTEGER,
    tiempo_real_duracion INTEGER, -- Este dato se llena cuando el doctor termina
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE log_incidentes ALTER COLUMN paciente_id DROP NOT NULL;


CREATE TABlE paciente(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero VARCHAR(10),
    foto_url VARCHAR(255)
);


CREATE TABLE doctor(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    especialidad VARCHAR(100)

);

CREATE TABLE cita (
    id              SERIAL PRIMARY KEY,
    folio           VARCHAR(50) NOT NULL ,
    paciente_id     INTEGER NOT NULL REFERENCES paciente(id),
    doctor_id       INTEGER REFERENCES doctor(id),
    estudio_id      INTEGER NOT NULL REFERENCES estudios(id),
    area_id         INTEGER NOT NULL REFERENCES areas(id),
    sala_asignada   VARCHAR(100),

    -- Tiempos
    hora_programada     TIME NOT NULL,
    fecha_cita          DATE NOT NULL,
    hora_llegada        TIME,
    hora_inicio         TIME,
    hora_fin            TIME,

    -- Estado y urgencia
    estado          VARCHAR(20) NOT NULL DEFAULT 'en_espera',

    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);





---- METEMOS VALORES PRUEBA de pedrogod

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





-----MORE Users





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

