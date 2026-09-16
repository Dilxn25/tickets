# Frontend (`euphoria-frontend`)

Lo que ven y tocan las personas. Está hecho con **Vue 3 + Vite**. No tiene la lógica del negocio: solo
muestra pantallas y le pide todo al backend. Son **56 pantallas** (`.vue`) organizadas por rol.

## Cómo arranca

- **`src/main.js`** — el punto de entrada: crea la app de Vue, activa el enrutador y las tiendas.
- **`vite.config.js`** — la configuración de Vite (el que compila y sirve el frontend).
- **`package.json`** — librerías y comandos (`npm run dev` para desarrollo).

## Las carpetas de `src/`

| Carpeta | Qué contiene |
|---|---|
| **`vistas/`** | Las **pantallas**, agrupadas por rol (ver abajo). |
| **`componentes/comunes/`** | Piezas **reutilizables** que aparecen en varias pantallas. |
| **`servicios-api/`** | Los **clientes HTTP**: el código que llama al backend. |
| **`tiendas/`** | El **estado global** (datos que se comparten entre pantallas). |
| **`enrutador/`** | Las **rutas** (qué pantalla se muestra en cada dirección) y el control de acceso por rol. |
| **`composables/`** | Lógica reutilizable, como la conexión de **tiempo real**. |
| **`utilidades/`** | Ayudantes: formato de números/fechas, colores, validación. |
| **`estilos/`** | Los estilos (CSS) globales. |
| **`activos/`** | Imágenes y recursos estáticos. |

## Pantallas por rol (`vistas/`)

- **`publica/VistaLogin.vue`** — la pantalla de inicio de sesión (antes de entrar).
- **`administrador/`** — el panel del dueño: `VistaEventos`, `VistaProductos`, `VistaUsuarios`,
  `VistaMapas` (editor de mapas), `VistaAforoAdmin` (aforo en vivo), `VistaReportes`, `VistaVentas`,
  `VistaIA` (control de la IA), `VistaFidelizacion`.
- **`cajero/`** — `VistaCajero` con sus paneles: `PanelRecarga`, `PanelRetiros`, `FichaCliente`,
  `MovimientosCliente`, `PinCliente`, `QrsCliente`, etc.
- **`mesero/VistaMesero.vue`** — toma de pedidos, con la sugerencia de la IA y el cobro.
- **`bartender/VistaBartender.vue`** — la cola de pedidos de la barra (más `HistorialBarra`).
- **`recepcionista/`** — `VistaRecepcion` con sus paneles: `IngresoEvento`, `EntradaGeneral`,
  `GruposGrandes`, `TarjetaMesa` (control de puerta).
- **`cliente/`** — la app del cliente: `VistaEventosCliente`, `VistaReservaMapa` (reservar sobre el
  mapa), `VistaBilletera`, `VistaCatalogo`, `VistaCarrito`, `VistaMisReservas`, `VistaMovimientos`,
  `VistaPerfil`, etc.
- **`Disposicion*.vue`** — el "marco" de cada rol (menú lateral, cabecera) donde se cargan las vistas.

## Cómo el frontend habla con el backend (`servicios-api/`)

- **`cliente-http.js`** — la base: crea la conexión (axios) al backend y **le pega el token** a cada
  petición automáticamente. Todos los demás lo usan.
- **`servicio-autenticacion.js`, `servicio-billetera.js`, `servicio-comandas.js`, `servicio-aforo.js`,
  `servicio-eventos.js`, `servicio-productos.js`, `servicio-reservas.js`, `servicio-roles.js`,
  `servicio-usuarios.js`** — cada uno agrupa las llamadas de un tema. Por ejemplo, `servicio-billetera`
  tiene las funciones para consultar saldo, recargar o retirar.

## Estado global (`tiendas/`)

Datos que varias pantallas comparten (con Pinia):

- **`tienda-autenticacion.js`** — quién inició sesión, su rol y su token.
- **`tienda-carrito.js`** — el carrito de pedido que arma el mesero o el cliente.
- **`tienda-notificaciones.js`** — los avisos que llegan en vivo.

## Tiempo real (`composables/useTiempoReal.js`)

Es la conexión de **Socket.io** del lado del frontend. Gracias a esto, cuando el backend avisa que algo
cambió (un ingreso en la puerta, un pedido nuevo), la pantalla **se actualiza sola**, sin recargar. Es
lo que hace que el aforo suba en vivo y que la cola del bartender crezca al momento.

## Componentes reutilizables (`componentes/comunes/`)

Piezas que se usan en muchas pantallas: **`BaseFecha`** (selector de fecha propio), **`BaseSelect`**,
**`BaseTelefono`**, **`SelectorMesa`**, **`CobroPago`** (el cobro con QR y PIN), **`CapturaCamara`**
(tomar foto del comprobante), **`BuscadorCliente`**, **`CampanaNotificaciones`**, **`Paginacion`**,
**`ComboImagen`**.

## Utilidades (`utilidades/`)

- **`formato.js`** — dar formato a dinero, fechas y números.
- **`colores-zona.js`** — los colores del aforo según qué tan llena está una zona.
- **`validar-comprobante.js`** — revisa la foto del comprobante antes de mandarla.

## Resumen mental

> Cada pantalla (`.vue`) pide datos con un `servicio-api`, guarda lo compartido en una `tienda`, y
> escucha los cambios en vivo con `useTiempoReal`. El enrutador decide qué pantalla ver según tu rol.
