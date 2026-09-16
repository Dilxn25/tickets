# Backend (`euphoria-backend`)

El servidor. Está hecho con **Node.js + Express** y habla con **MySQL** a través de **Prisma**. Es el
único programa que toca la base de datos y donde vive toda la lógica del negocio (cobros, aforo,
permisos). Son unas 10.000 líneas repartidas en servicios.

## Cómo arranca

- **`index.js`** — el punto de entrada. Levanta el servidor Express, activa **Socket.io** (tiempo real)
  y **monta cada servicio** bajo su dirección `/api/...`. Se ejecuta con `node index.js`.
- **`.env`** — la configuración secreta: la conexión a la base (`URL_BASE_DATOS`), la clave para firmar
  los tokens, el correo remitente y la dirección del servicio de IA.
- **`package.json`** — las librerías que usa y los comandos (`npm run iniciar`, `db:sembrar`, etc.).

## La base de datos

- **`prisma/schema.prisma`** — el **modelo de datos**: las **28 tablas** del sistema (usuario, billetera,
  evento, mesa, zona, comanda, entrada, etc.) y cómo se relacionan. Es el mapa de todo lo que se guarda.
- **`prisma/semilla.js`** — llena la base con datos iniciales (roles, usuarios de ejemplo, productos).
  Se corre con `npm run db:sembrar`.

## Seguridad (quién puede hacer qué)

- **`src/middlewares/autenticacion.js`** — dos "porteros" que se ponen antes de cada ruta protegida:
  - `verificarToken`: revisa que traigas un token válido (que hayas iniciado sesión).
  - `soloRoles('Administrador', ...)`: revisa que tu rol tenga permiso para esa acción.

## Configuración

- **`src/config/base-de-datos.js`** — crea el cliente de Prisma (la conexión a MySQL que usan todos).
- **`src/config/cloudinary.js`** — conexión al servicio donde se guardan las imágenes (portadas de
  eventos, comprobantes).

## Los servicios (la parte importante)

Cada carpeta en `src/servicios/` es un **módulo** con sus rutas. Esto es lo que hace cada uno:

| Servicio | Dirección | Qué hace |
|---|---|---|
| **autenticacion** | `/api/auth` | Iniciar sesión, entregar el token, recuperar contraseña. |
| **usuarios** | `/api/usuarios` | Crear, editar y activar/desactivar usuarios. |
| **roles** | `/api/roles` | Definir los roles y sus permisos (solo administrador). |
| **productos** | `/api/productos` | El catálogo: productos, categorías, precios, imágenes. |
| **eventos** | `/api/eventos` | Crear y configurar los eventos (la noche), con su fecha y estado. |
| **mesas** | `/api/mesas` | Las mesas de cada evento y el mapa donde se ubican. |
| **espacios** | `/api/espacios` | Las **zonas** del local y el editor del mapa (dibujar el plano). |
| **reservas** | `/api/reservas` | Reservar una mesa sobre el mapa (descuenta de la billetera). |
| **aforo** | `/api/aforo` | Control de **ingreso y salida** en la puerta y el **aforo en vivo** por zona. |
| **billetera** | `/api/billetera` | Saldo, recargas, **PIN**, códigos **QR**, retiros y los **reportes de dinero** del administrador. |
| **cajero** | `/api/cajero` | Lo que hace el cajero: recargar saldo y gestionar retiros de clientes. |
| **comandas** | `/api/comandas` | Los **pedidos** y el **cobro** (de la billetera o en efectivo). |
| **recomendaciones** | `/api/recomendaciones` | El **puente hacia la IA**: pide la sugerencia y le suma las reglas y combos. |
| **notificaciones** | `/api/notificaciones` | Los avisos que se muestran a cada rol. |

> Cada archivo `*.rutas.js` contiene las acciones de ese servicio. Por ejemplo, en
> `servicio-billetera/billetera.rutas.js` está `POST /recargar`, `POST /pin`, `GET /saldo`, etc.

## Utilidades (ayudantes reutilizables)

En `src/utilidades/` hay funciones que usan varios servicios:

- **`tiempo.js`** — maneja la hora de **Bolivia** (`hoyBolivia()`). Importante porque el servidor corre
  en hora universal, y sin esto las fechas se comparan mal.
- **`pin-billetera.js`** — cifra y verifica el PIN de la billetera.
- **`qr-utilidades.js`** (en billetera) — genera y lee los códigos QR de pago.
- **`ocr-comprobantes.js`** y **`validar-comprobante`** — leen la foto de un comprobante de pago (OCR)
  para las recargas.
- **`correo.js`** / **`vigia-correo.js`** — envían correos (por ejemplo, recuperar contraseña).
- **`historial-precios.js`** — guarda cómo cambian los precios en el tiempo.
- **`purgar-espacios.js`** — libera reservas o mesas vencidas.
- **`notificaciones.js`** — arma los avisos en tiempo real.
- **`config-runtime.js`**, **`premio-perfil.js`**, **`texto.js`** — configuración en caliente, premios
  de perfil y limpieza de texto.

## Pruebas del OCR

- **`pruebas-ocr/`** — casos para probar el lector de comprobantes (imágenes que deben pasar y otras
  que deben rechazarse).

## Resumen mental

> El frontend pide algo → pasa por los porteros (token + rol) → entra al servicio que corresponde →
> ese servicio lee o escribe en MySQL con Prisma → responde → y si algo cambió para otros, lo avisa en
> vivo con Socket.io.
