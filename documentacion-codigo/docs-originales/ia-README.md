# Euphoria IA — Servicio de Recomendación (PRODUCCIÓN)

Esta carpeta contiene la **IA del programa en ejecución**: el microservicio que el sistema Euphoria
consume en vivo para dar recomendaciones. El **entrenamiento y las pruebas** viven aparte, en
`../modelo_entrenado/`.

## Modelo: HÍBRIDO (contenido + colaborativo)

El recomendador es un **modelo híbrido** que combina los dos paradigmas del marco teórico y los
fusiona con un algoritmo de aprendizaje supervisado:

| Paradigma (marco teórico) | Cómo participa aquí |
|---|---|
| **Filtrado colaborativo** | Co-ocurrencia de productos (`coocc`) y similitud item-item por coseno (`simax`) |
| **Basado en contenido** | Categoría del producto, precio, coincidencia de categoría (`cat`, `precio`, `catmatch`) |
| **Fusión (algoritmo)** | **Gradient Boosting (LightGBM)** que pondera todas las señales + contexto horario |

Es decir: el **modelo** es híbrido; el **algoritmo** que lo implementa es gradient boosting.
Sobre el score del modelo se aplica una **capa de reglas de negocio** (stock, margen, hora, promociones).

## Cómo se ejecuta

```bash
pip install -r requirements.txt
uvicorn api:app --port 8000
```
Se levanta automáticamente con `../iniciar-euphoria.ps1`. El backend Node lo consume vía
`URL_SERVICIO_IA` (http://localhost:8000) en el endpoint `POST /api/recomendaciones`.

Prueba: `http://localhost:8000/docs`

## Archivos

| Archivo | Rol |
|---|---|
| `api.py` | Servicio web FastAPI (`/recomendar`, `/salud`) |
| `recomendador.py` | Motor: carga el modelo y arma la respuesta JSON |
| `nucleo.py` | Ingeniería de características (mismas que en entrenamiento) |
| `reglas.py` / `reglas.json` | Capa de reglas de negocio (editable sin reentrenar) |
| `artefacto_modelo.pkl` | Modelo entrenado + catálogo (producción) |
| `config.json`, `mejores_hiperparametros.json` | Configuración |

## Actualizar el modelo

El modelo se **entrena** en `../modelo_entrenado/` (`entrenar.py`). Tras reentrenar, copia el nuevo
`artefacto_modelo.pkl` a esta carpeta para que producción use la versión nueva.
