# Reentrenar el modelo con la BD NUEVA (db_euphoria)

Estado: **LISTO PARA ENTRENAR**. El cargador de la BD nueva ya funciona
(verificado: 11,396 filas de canastas / 7,008 ventas / 15 productos).

## Cómo está conectado

- `config.json` → `"fuente": "mysql_prisma"` apunta a la BD nueva (db_euphoria).
- `fuentes_datos.py` devuelve SIEMPRE el mismo formato canónico
  (`df_canastas` + `meta`), venga del dump viejo de Postgres
  (`modelo_entrenado/Entrenamiento de modelos/database`) o de MySQL nueva.
- Los notebooks de entrenamiento están en
  `modelo_entrenado/Entrenamiento de modelos/notebooks/` (01 a 06).
- Hiperparámetros ya optimizados: `mejores_hiperparametros.json`.

## Pasos para reentrenar (cuando haya datos nuevos de producción)

1. Respaldar el artefacto actual: copiar `artefacto_modelo.pkl` con fecha.
2. Abrir `notebooks/02_supervisado.ipynb` y cargar los datos con
   `fuentes_datos.desde_mysql_prisma(config["database_url"])`.
   - Para entrenar con AMBAS bases: cargar también
     `desde_postgres_dump(...)` y concatenar los `df_canastas`
     (mismo formato); el `meta` manda el de la BD nueva.
3. Entrenar LightGBM con `mejores_hiperparametros.json`
   (o re-tunear con `05_optuna_tuning.ipynb` si el volumen creció mucho).
4. Comparar el AUC de test contra el del artefacto actual
   (visible en `GET /salud` del servicio). Solo reemplazar si mejora.
5. Guardar el nuevo `artefacto_modelo.pkl` en `euphoria-ia/` y reiniciar
   uvicorn. Nada más cambia: la API es la misma.

## Fase 7.4 pendiente — features de CLIENTE (VIP / recurrente / normal)

La BD no tiene campo "tipo de cliente": se DERIVA al armar el dataset:
- gasto_total y nº de visitas por `id_cliente` (tabla comanda) →
  reglas: VIP (top gasto), recurrente (>= N visitas), normal (resto).
- Agregar esas columnas como features del modelo + aceptar `id_cliente`
  opcional en `POST /recomendar` para personalizar la sugerencia.
- Solo aplica a la BD nueva (la vieja no comparte usuarios).
