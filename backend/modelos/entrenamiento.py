import pandas as pd # type: ignore
import numpy as np # type: ignore
from sklearn.ensemble import RandomForestRegressor # type: ignore
import joblib # type: ignore
import os

# 1. DEFINICIÓN DE CATÁLOGOS (Regras de Salud Digna)
# Estudios: 1:Sangre, 2:Rayos X, 3:Ultra, 4:Electro, 5:Masto, 6:Densito, 7:Esfuerzo
estudios_info = {
    1: {"nombre": "Análisis de Sangre", "base": 10, "area": "Laboratorio"},
    2: {"nombre": "Rayos X", "base": 15, "area": "Rayos X"},
    3: {"nombre": "Ultrasonido", "base": 25, "area": "Ultrasonido"},
    4: {"nombre": "Electrocardiograma", "base": 20, "area": "Cardiología"},
    5: {"nombre": "Mastografía", "base": 30, "area": "Rayos X"},
    6: {"nombre": "Densitometría", "base": 20, "area": "Rayos X"},
    7: {"nombre": "Prueba de Esfuerzo", "base": 45, "area": "Cardiología"}
}

# Doctores: 2 por área (IDs del 10 al 19)
doctores_por_area = {
    "Laboratorio": [10, 11], "Rayos X": [12, 13], 
    "Ultrasonido": [14, 15], "Cardiología": [16, 17], 
    "General": [18, 19]
}

# 2. GENERACIÓN DE DATOS CON REGLAS DE NEGOCIO
np.random.seed(42)
n_samples = 1500 # Aumentamos muestras para mejor precisión

data = []
for _ in range(n_samples):
    est_id = np.random.choice(list(estudios_info.keys()))
    area_pertenencia = estudios_info[est_id]["area"]
    doc_id = np.random.choice(doctores_por_area[area_pertenencia])
    dia = np.random.choice(range(7))
    
    # Lógica de Horarios según día
    if dia < 5: hora = np.random.choice(range(7, 19))    # L-V: 7am-7pm
    elif dia == 5: hora = np.random.choice(range(7, 17)) # S: 7am-5pm
    else: hora = np.random.choice(range(7, 14))          # D: 7am-2pm
    
    data.append([est_id, dia, hora, doc_id])

df = pd.DataFrame(data, columns=['estudio_id', 'dia_semana', 'hora', 'id_doctor'])

# 3. CÁLCULO DE DURACIÓN REAL (Target Variable)
def calcular_duracion(row):
    info = estudios_info[row['estudio_id']]
    base = info["base"]
    
    # Penalización por Hora Pico (7-9 am y 2-4 pm)
    if row['hora'] in [7, 8, 9, 14, 15]: base *= 1.25
    
    # Penalización por Domingo (Menos personal staff)
    if row['dia_semana'] == 6: base *= 1.15
    
    # Eficiencia de Doctores (Simulamos que los pares son 10% más rápidos)
    if row['id_doctor'] % 2 == 0: base *= 0.9
    
    return base + np.random.normal(0, 3) # Ruido natural

df['duracion_real'] = df.apply(calcular_duracion, axis=1)

# 4. ENTRENAMIENTO
X = df[['estudio_id', 'dia_semana', 'hora', 'id_doctor']]
y = df['duracion_real']

model = RandomForestRegressor(n_estimators=300, max_depth=12, random_state=42)
model.fit(X, y)

# 5. EXPORTACIÓN
os.makedirs('modelos', exist_ok=True)
joblib.dump(model, 'modelos/modelo_duracion_salud_digna.pkl')
print("🚀 Modelo de Alta Precisión generado para Salud Digna.")