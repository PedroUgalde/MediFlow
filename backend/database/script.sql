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