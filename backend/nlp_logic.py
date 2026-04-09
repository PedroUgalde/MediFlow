import json
from sklearn.feature_extraction.text import TfidfVectorizer # type: ignore
from sklearn.metrics.pairwise import cosine_similarity # type: ignore
from sentence_transformers import SentenceTransformer, util
class ProcesadorIncidencias:
    def __init__(self):
        # Definición de categorías base del sistema
        # Actualiza esto en tu nlp_logic.py
        self.categorias_master = {
            "falla_equipo": "error, dañado, calibracion, falla, transductor dañado, error de software, calibración de mastógrafo, tubo de rayos x, falla de electrodos, equipo no enciende",
            "limpieza_sala": "limpieza, aseo, sanitizacion, sanitización post-paciente, derrame de gel, limpieza de camilla, desinfección de laboratorio, residuos biológicos",
            "personal_ausente": "descanso, cambio de turno, motivos personales, urgencia de enfermería, cambio de turno laboratorio, falta de técnico radiólogo",
            "infraestructura": "aire acondicionado, luz, agua, internet, falla de luz en clínica, red caída, problemas de papelería o impresora",
            "paciente_complejo": "movilidad reducida, dificultad en toma de muestra, re-estudio solicitado, pediátrico"
        }
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        self.categorias_nombres = list(self.categorias_master.keys())
        self.vectorizer = TfidfVectorizer()
        # Pre-calculamos los embeddings de las categorías para ahorrar tiempo
        self.embeddings_categorias = self.model.encode(list(self.categorias_master.values()))

    def categorizar_motivo_embeddings(self, descripcion_doc: str):
        emb_nuevo = self.model.encode(descripcion_doc)
        # Calculamos similitud de coseno entre el texto nuevo y todas las categorías
        similitudes = util.cos_sim(emb_nuevo, self.embeddings_categorias)[0]
        print(similitudes)
        indice_ganador = similitudes.argmax()
        return self.categorias_nombres[indice_ganador], round(float(similitudes[indice_ganador]), 2)

    def categorizar_motivo(self, descripcion_doc: str):
        """
        Usa Similitud de Coseno para encontrar la categoría más cercana al texto del doctor.
        """
        descripcion_nueva = descripcion_doc.lower()
        nombres_cats = list(self.categorias_master.keys())
        descripciones_cats = list(self.categorias_master.values())
        
        # Vectorización y comparación
        textos_a_comparar = [descripcion_nueva] + descripciones_cats
        matriz_tfidf = self.vectorizer.fit_transform(textos_a_comparar)
        
        # Comparamos el nuevo error (pos 0) contra las categorías (pos 1 en adelante)
        similitudes = cosine_similarity(matriz_tfidf[0:1], matriz_tfidf[1:])
        print(similitudes)
        indice_ganador = similitudes.argmax()
        puntaje_confianza = similitudes[0][indice_ganador]
        categoria_asignada = nombres_cats[indice_ganador]
        
        return categoria_asignada, round(float(puntaje_confianza), 2)

    def calcular_tiempo_retraso(self, categoria: str, confianza: float):
        """
        Lógica heurística: a mayor confianza en una categoría crítica, 
        mayor es el tiempo de retraso sugerido.
        """
        tiempos_base = {
            "falla_equipo": 45,
            "limpieza_sala": 15,
            "personal_ausente": 30,
            "infraestructura": 60
        }
        
        tiempo_sugerido = tiempos_base.get(categoria, 20)
        # Si la confianza es baja, aplicamos un factor de incertidumbre
        if confianza < 0.3:
            tiempo_sugerido += 10 
            
        return tiempo_sugerido
    
    
