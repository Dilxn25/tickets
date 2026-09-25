# IA (`euphoria-ia`)

Un **servicio aparte**, hecho en **Python con FastAPI**, que corre en el puerto **8000**. Su único
trabajo es responder una pregunta: *"para esta mesa, ¿qué producto conviene sugerir?"*. El backend le
pregunta y la IA devuelve la sugerencia. Lee ventas de la base para calcular combos y packs, pero no
escribe en ella ni pinta pantallas.

## Qué modelo usa (en simple)

Es un **modelo híbrido** que junta las dos formas clásicas de recomendar y las combina con un algoritmo
de aprendizaje:

| Enfoque | Qué mira |
|---|---|
| **Colaborativo** | Qué productos se piden **juntos** (co-ocurrencia) y qué tan parecidos son entre sí. |
| **Basado en contenido** | La **categoría**, el **precio** y si coincide con lo que ya hay en la mesa. |
| **Fusión (el algoritmo)** | **LightGBM** (gradient boosting) pondera todas esas señales más la **hora**. |

Sobre lo que dice el modelo, se aplica una **capa de reglas de negocio** (stock disponible, margen,
hora, promociones). Así el dueño puede ajustar el comportamiento **sin reentrenar** el modelo.

> En una frase: el **modelo** es híbrido, el **algoritmo** que lo arma es gradient boosting, y encima
> hay **reglas** que se pueden editar a mano.

## Qué hace cada archivo

| Archivo | Rol |
|---|---|
| **`api.py`** | El servicio web (FastAPI). Recibe la petición del backend y devuelve la sugerencia en JSON. Tiene también una ruta de "salud" para saber si está vivo. |
| **`recomendador.py`** | El **motor**: carga el modelo entrenado y arma la respuesta final. |
| **`nucleo.py`** | Prepara las **características** (features) que el modelo necesita, igual que en el entrenamiento. |
| **`reglas.py`** + **`reglas.json`** | La **capa de reglas** de negocio. `reglas.json` se puede editar sin tocar código. |
| **`artefacto_modelo.pkl`** | El **modelo ya entrenado** + el catálogo. Es lo que usa producción. |
| **`fuentes_datos.py`** | Carga los datos para **entrenar** (desde la base MySQL o desde un respaldo). |
| **`config.json`** | Configuración: de dónde salen los datos y dónde se guarda el modelo. |
| **`mejores_hiperparametros.json`** | Los ajustes ya optimizados del modelo. |
| **`requirements.txt`** | Las librerías de Python que necesita (pandas, scikit-learn, lightgbm, fastapi, etc.). |
| **`vigilar-ia.ps1`** | Un script para levantar y vigilar el servicio. |
| **`modelos/`** | Las versiones fechadas del modelo; al arrancar se carga la más reciente. |
| **`entrenamiento/`** | El script `entrenar.py` que ejecuta GitHub Actions para reentrenar. |

## Cómo se ejecuta

```bash
pip install -r requirements.txt
uvicorn api:app --port 8000
```

- Prueba rápida en el navegador: `http://localhost:8000/docs`.
- El backend lo consume por HTTP. Cuando el mesero pide una sugerencia, el frontend llama a
  `POST /api/recomendaciones` (backend), y el backend le pregunta a este servicio.

## Cómo se actualiza el modelo (reentrenar)

El administrador pulsa **Reentrenar** en el Panel de IA y GitHub Actions ejecuta
`entrenamiento/entrenar.py`: lee las ventas de la base, entrena y deja una versión fechada en `modelos/`.
El servicio carga esa versión al volver a desplegarse. El detalle está en:

- `documentacion-codigo/reentrenar-modelo.md` (cómo funciona y cómo se configura).
- `documentacion-codigo/docs-originales/ia-README.md` (la explicación original del modelo).

## Resumen mental

> El backend le manda "esto hay en la mesa y esta es la hora" → la IA calcula con el modelo entrenado,
> le aplica las reglas de negocio, y devuelve el producto más probable con su porcentaje. Nada más.
