# Reentrenar el modelo de IA

El administrador reentrena el modelo desde el Panel de IA con un botón. El
entrenamiento no corre dentro del sistema: lo ejecuta GitHub Actions, que lee las
ventas reales de la base, entrena y publica el modelo nuevo en el repositorio.

Se hace así por una razón concreta: el servicio de IA vive en el plan gratuito de
Render, donde el disco es efímero. Un modelo entrenado dentro del contenedor se
perdería en el primer reinicio y el sistema volvería en silencio al modelo viejo.

## Qué pasa cuando se toca "Reentrenar"

1. El backend le pide a GitHub que ejecute el flujo `entrenar-modelo.yml`.
2. El runner instala Python, se conecta a la base y ejecuta `entrenar.py`.
3. El modelo queda guardado como `euphoria-ia/modelos/modelo-AAAA-MM-DD-hhmm.pkl`,
   junto a un `.json` con la fecha, cuántas ventas se usaron y el acierto obtenido.
   **El modelo anterior no se borra.**
4. El flujo hace commit y Render vuelve a desplegar el servicio de IA.
5. Al arrancar, el servicio toma automáticamente el modelo más reciente.

Tarda entre 2 y 3 minutos. El panel muestra el avance y avisa cuando termina.

## Volver a un modelo anterior

En la tarjeta **Modelo** del Panel de IA se listan las versiones entrenadas, de la
más nueva a la más vieja, con su fecha y su acierto. La que está en uso aparece
marcada; en las demás hay un botón **Usar este**.

El cambio es inmediato: el servicio carga esa versión en caliente, sin reiniciar
y sin volver a desplegar.

Se conservan las últimas 6 versiones. Las más antiguas se retiran solas para que
el repositorio no crezca sin control.

## Qué hay que configurar una sola vez

**1. Un secreto en el repositorio de GitHub**

En `Settings > Secrets and variables > Actions > New repository secret`:

| Nombre | Valor |
|---|---|
| `URL_BD_ENTRENAMIENTO` | La cadena de conexión a la base de producción, en formato SQLAlchemy: `mysql+pymysql://usuario:clave@host:puerto/defaultdb` |

Los datos de conexión están en el panel de Aiven. Es la misma base que usa el
sistema, solo cambia el formato de la cadena.

**2. Dos variables de entorno en el backend (Render)**

| Nombre | Valor |
|---|---|
| `TOKEN_GITHUB` | Un token personal de GitHub con permiso sobre el repositorio |
| `REPO_GITHUB` | `Dilxn25/tickets` (ya viene por defecto; solo si cambia el repo) |

El token se crea en `github.com > Settings > Developer settings > Personal access
tokens > Fine-grained tokens`, dando acceso al repositorio y permiso de lectura y
escritura sobre **Actions** y **Contents**.

Sin el token, el botón avisa que falta configurar el acceso; el resto del panel
sigue funcionando igual.

## Cuánto aguanta

Medido con los datos actuales (7.166 ventas, 75 productos):

- Entrenamiento: 4,1 segundos
- Memoria: 235 MB
- Modelo resultante: 470 KB

El runner de GitHub tiene 7 GB de memoria, así que hay margen de sobra. El
consumo crece junto con las ventas y los productos; pasadas unas 40.000 ventas
conviene revisar el tiempo del flujo y la memoria en el registro de Actions.

## Si el flujo falla

El panel muestra el error y un enlace directo a la corrida en GitHub, donde está
el registro completo. Las causas habituales son el secreto mal escrito o la base
sin aceptar la conexión desde el runner.
