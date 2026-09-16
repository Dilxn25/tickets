# Documentación del código de Euphoria

Esta carpeta explica, en lenguaje simple, **qué hace tu código**. No está dentro de las carpetas de
código para no mezclar documentación con programa.

- [1. Backend](backend.md) — el servidor: la lógica, la base de datos y los cobros.
- [2. Frontend](frontend.md) — las pantallas que usan las personas.
- [3. IA](ia.md) — el servicio que da las recomendaciones.
- `docs-originales/` — los `.md` que estaban dentro de las carpetas de código (se movieron aquí).

---

## El sistema en una imagen

Euphoria son **tres programas que trabajan juntos**:

```
   PERSONAS (admin, cajero, mesero, bartender, recepcionista, cliente)
        │
        ▼
┌───────────────────┐   pide datos (HTTP)   ┌────────────────────┐
│    FRONTEND       │ ────────────────────► │      BACKEND       │
│  (Vue, el diseño) │ ◄──────────────────── │ (Node, la lógica)  │
└───────────────────┘   respuesta + tiempo  └─────────┬──────────┘
                          real (Socket.io)            │
                                          guarda/lee   │   pide una sugerencia
                                                       ▼   (HTTP)
                                          ┌───────────────┐   ┌──────────────┐
                                          │  MySQL (BD)   │   │   IA (Python)│
                                          │  28 tablas    │   │  LightGBM    │
                                          └───────────────┘   └──────────────┘
```

- **Frontend (Vue):** lo que se ve y se toca. No tiene la lógica del negocio, solo pinta pantallas y
  le pide todo al backend.
- **Backend (Node/Express):** el cerebro. Valida quién eres, cobra, guarda en la base de datos,
  controla el aforo y avisa en tiempo real. Es el único que toca la base de datos.
- **IA (Python/FastAPI):** un servicio aparte al que el backend le pregunta "¿qué le conviene ofrecer a
  esta mesa?" y devuelve una sugerencia.
- **Base de datos (MySQL):** donde vive todo (usuarios, dinero, eventos, reservas, aforo).

---

## Cómo se comunican

1. El frontend llama al backend por **HTTP** (peticiones a `/api/...`).
2. El backend responde con datos y, cuando algo cambia (un ingreso, un cobro), **empuja el cambio en
   vivo** al frontend con **Socket.io** (por eso el aforo sube solo, sin recargar).
3. Para las recomendaciones, el backend llama por HTTP al servicio de **IA** (puerto 8000).
4. Todo lo permanente se guarda en **MySQL**, y el backend habla con la base mediante **Prisma**.

---

## Una noche, de principio a fin (para atar todo)

Así se conectan las piezas en un caso real:

1. El **administrador** crea el evento y arma el mapa de mesas → *backend: eventos, espacios*.
2. El **cajero** carga saldo a la billetera del cliente → *backend: cajero, billetera*.
3. El **cliente** reserva su mesa sobre el mapa y paga con la billetera → *frontend: VistaReservaMapa;
   backend: reservas, billetera*.
4. El **recepcionista** valida el ingreso leyendo el código en la puerta → *backend: aforo*. El aforo
   sube **en vivo** en el panel → *Socket.io*.
5. El **mesero** toma el pedido; el sistema le sugiere un producto → *backend: recomendaciones → IA*.
   Luego cobra de la billetera → *backend: comandas, billetera*.
6. El **bartender** ve el pedido en su cola y lo prepara → *frontend: VistaBartender*.
7. Al final, el **cliente** retira lo que no gastó y el **administrador** ve el reporte del dinero →
   *backend: billetera (retiros y reportes)*.

Cada uno de esos pasos es una pantalla del frontend que llama a un servicio del backend, que a su vez
lee o escribe en la base de datos.
