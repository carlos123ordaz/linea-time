# Nuestra línea de tiempo

Una línea de tiempo de amor, con la estética del Ojo de Agamotto de *Doctor Strange*:
un hilo dorado que recorre cómo se conocieron, y ramas que se abren cuando le preguntas
al pasado *"¿qué hubiera pasado si…?"*.

**React + TypeScript · Express · MongoDB · Gemini**

---

## Arrancar

```bash
npm run setup     # instala todo (raíz + server + client)
npm run dev       # levanta API (4000) y web (5173)
```

Abre **http://localhost:5173**.

La primera vez, si la base está vacía, el servidor escribe su historia automáticamente.

---

## Configurar

Copia `server/.env.example` a `server/.env`:

```bash
cp server/.env.example server/.env
```

| Variable | Para qué |
|---|---|
| `MONGODB_URI` | Tu Mongo. **Si lo dejas vacío se usa una base en memoria y todo se borra al apagar el server.** Para que quede guardado de verdad, usa MongoDB Atlas (gratis) o un Mongo local. |
| `GEMINI_API_KEY` | Tu key de https://aistudio.google.com/apikey. Sin ella la app funciona, pero no puedes abrir realidades alternas. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` por defecto. Si sale uno nuevo, solo cambia esa variable. |

### Personalizar la historia

Los nombres y el año están en un solo lugar: **`server/src/lib/story.ts`**, arriba del todo.

```ts
const YO = 'Carlos';
const ELLA = 'Diesslly';
const VICTOR = 'Víctor';
const AMIGO = 'Tu amigo';     // <-- falta: el ingeniero de sistemas, novio de su amiga
const SU_AMIGA = 'Su amiga';  // <-- falta: la abogada que la invitó a la fiesta
const ANIO = 2026;
```

⚠️ **`npm run seed -- --force` borra TODO y reescribe la historia base.** Úsalo solo
mientras no hayas agregado recuerdos propios desde la app. Después de eso, edita los
momentos desde la interfaz (clic en el nodo → Editar), que no borra nada.

Las fechas de los tres primeros momentos son aproximadas: ajústalas desde la app.

---

## Cómo se usa

- **Clic en un nodo** → se abre el momento: qué pasó, quiénes estaban, editar o eliminar.
  Dentro del panel, las flechas `‹ ›` recorren la línea sin cerrarlo.
- **+ Momento** → agrega algo nuevo en cualquier fecha (la primera vez en el cine, el
  primer viaje, lo que venga). La línea se reordena sola.
- **¿Qué hubiera pasado si…?** → escribe un cambio en el pasado, elige desde qué punto
  se abre la rama, y Gemini recorre la cadena causal real para contarte qué se rompe.
- **Si borras algo por error**, el aviso de abajo trae **Deshacer** durante 14 segundos.

### Atajos y navegación

| | |
|---|---|
| `←` `→` | Recorrer los momentos uno por uno |
| `N` | Agregar un momento |
| `Esc` | Cerrar el panel abierto |
| Arrastrar | Mover la línea de tiempo |
| Rueda del ratón | Mover la línea |
| `Cmd`/`Ctrl` + rueda | Acercar y alejar |
| `Cmd`/`Ctrl` + `Enter` | Lanzar la simulación desde el cuadro de texto |

La rama se dibuja sobre la línea con tres desenlaces posibles:

| Color | Veredicto | Qué significa |
|---|---|---|
| 🔴 rojo | `nunca` | Ese cambio corta un eslabón necesario. La línea cae y se apaga: nunca se conocen. |
| 🔵 cian | `reconstruida` | La línea encuentra otro camino y se vuelve a unir, pero en otra fecha. |
| 🟢 verde | `inevitable` | Se conocían igual. El cambio casi no importa. |

Cada realidad queda guardada en "Realidades guardadas" y se puede borrar.

---

## Estructura

```
line-love/
├── server/
│   └── src/
│       ├── index.ts              API + auto-seed si la línea está vacía
│       ├── lib/story.ts          ← LA HISTORIA REAL (edita los nombres aquí)
│       ├── lib/db.ts             Mongo (Atlas, local o en memoria)
│       ├── models/               Event, Simulation
│       ├── routes/               /api/events, /api/simulations
│       └── services/gemini.ts    Llamada a Gemini con salida estructurada
└── client/
    └── src/
        ├── components/
        │   ├── TimelineCanvas.tsx  el hilo dorado y las ramas (SVG)
        │   ├── SimulationPanel.tsx el Ojo de Agamotto
        │   ├── EventDetail.tsx     el momento abierto
        │   ├── EventForm.tsx       agregar / editar
        │   └── Starfield.tsx       el polvo dorado del fondo
        ├── lib/scale.ts            escala de tiempo logarítmica
        └── styles/index.css        toda la estética
```

### Detalles que importan

- **La escala del tiempo es logarítmica.** Tres años de "origen" y treinta días de julio
  no pueden medir lo mismo en pantalla, o los días importantes quedarían aplastados.
- **Tema claro sobre papel cálido**, con el oro oscurecido para que contraste. Los títulos
  van en Fraunces y todo el texto de lectura en Inter.
- **Las fechas se manejan siempre en hora local.** En UTC, una fiesta a las 22:30 del 18 de
  julio se convierte en el 19, y ese error terminaba escrito en el texto generado.
- **Gemini responde con `responseSchema`**, así que siempre devuelve el mismo JSON y la
  rama se puede dibujar sin adivinar nada.
- **Los "puntos nexo"** (los momentos de los que depende todo lo demás) llevan anillos
  místicos girando. Se marcan con el switch "Punto nexo" al editar.

---

## API

| Método | Ruta | |
|---|---|---|
| `GET` | `/api/health` | estado + si Gemini está configurado |
| `GET` | `/api/events` | todos los momentos, ordenados |
| `POST` | `/api/events` | crear |
| `PATCH` | `/api/events/:id` | editar |
| `DELETE` | `/api/events/:id` | eliminar |
| `GET` | `/api/simulations` | realidades guardadas |
| `POST` | `/api/simulations` | `{ premise, pivotEventId }` → simula con Gemini |
| `DELETE` | `/api/simulations/:id` | eliminar una realidad |
