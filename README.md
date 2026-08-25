# Nuestra línea de tiempo

Una línea de tiempo de amor con la estética del Ojo de Agamotto de *Doctor Strange*:
un hilo dorado sobre papel cálido que recorre cómo se conocieron, momento a momento.

**React + TypeScript + Vite · Supabase · listo para Vercel**

Sin servidor propio: el frontend habla directo con Supabase.

---

## Ponerlo a andar

### 1. Preparar Supabase

Abre tu proyecto → **SQL Editor** → **New query**, y corre estos dos archivos, en orden:

| Archivo | Qué hace |
|---|---|
| [`supabase/schema.sql`](supabase/schema.sql) | Crea la tabla `events`, sus políticas y escribe su historia |
| [`supabase/02_fotos_y_colores.sql`](supabase/02_fotos_y_colores.sql) | Agrega fotos y color por momento, y crea el bucket `recuerdos` |

> ⚠️ El primero empieza con `drop table if exists`: correrlo de nuevo **borra los momentos
> que hayas agregado después**. Es solo para la primera vez.
> El segundo no borra nada y se puede correr las veces que quieras.

### 2. Configurar las llaves

```bash
cp .env.example .env
```

Y pon los dos valores de **Supabase → Project Settings → API**:

| Variable | Dónde sale |
|---|---|
| `VITE_SUPABASE_URL` | *Project URL* |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | *Publishable key* (la que empieza con `sb_publishable_`) |

Las dos son **públicas por diseño**: viajan al navegador de quien abra el sitio. Lo que
protege los datos no es esconderlas, son las políticas RLS de la tabla.

### 3. Correrlo

```bash
npm install
npm run dev
```

Abre **http://localhost:5173**.

---

## Publicarlo en Vercel

1. **New Project** → importa `carlos123ordaz/linea-time`.
2. Vercel detecta Vite solo. No cambies nada del build.
3. En **Environment Variables** agrega las dos: `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. **Deploy**.

Cada `git push` a `main` vuelve a desplegar solo.

> Si agregas las variables **después** del primer deploy, hay que redesplegar
> (Deployments → ⋯ → Redeploy): Vite las incrusta en el bundle al compilar.

---

## Quién puede editar

Las políticas RLS dejan que **cualquier visitante lea y escriba**, tanto los momentos como
las fotos. Así el sitio funciona sin login, pero significa que cualquiera con el link puede
editar o borrar sus recuerdos.

Para cerrarlo cuando quieras, corre esto en el SQL Editor:

```sql
drop policy "insercion publica"     on public.events;
drop policy "actualizacion publica" on public.events;
drop policy "borrado publico"       on public.events;

drop policy "recuerdos subida"       on storage.objects;
drop policy "recuerdos actualizacion" on storage.objects;
drop policy "recuerdos borrado"      on storage.objects;
```

El sitio queda de solo lectura y tú sigues editando desde **Table Editor** y **Storage**
en Supabase, que no pasan por RLS.

---

## Cómo se usa

- **Clic en un momento** → se abre una ficha centrada con qué pasó, quiénes estaban y sus
  fotos. Las flechas `‹ ›` recorren la línea sin cerrarla, y editar, eliminar y cerrar están
  en iconos para que lo único que pese sea el recuerdo.
- **+ Momento** → agrega algo nuevo en cualquier fecha. La línea se reordena sola.
- **Si borras algo por error**, el aviso de abajo trae **Deshacer** durante 14 segundos.

### Fotos

Al agregar o editar un momento puedes **arrastrar fotos** al recuadro o buscarlas en tu
computadora. Se suben al bucket `recuerdos` de Supabase (hasta 10 MB cada una).

En el panel del momento aparecen como galería; al tocar una se abre a pantalla completa,
con el título y la fecha debajo. Ahí las flechas `←` `→` pasan de foto en foto y `Esc` cierra.

En la línea, los momentos con fotos llevan una **insignia con el número** de fotos.

### Emoji

Cada momento puede llevar un emoji, que aparece junto a su título en la línea. Se elige de
una **lista agrupada** (Amor, Nosotros, Momentos, Salidas, Comida, Lugares, Cielo y tiempo,
Recuerdos) en vez de escribirlo a mano, así no se cuela texto que no es un emoji. El botón
**Sin emoji** lo quita.

Si un momento viejo tiene algo que no está en la lista, se conserva tal cual hasta que
elijas otro.

### Colores

Cada punto puede llevar uno de **ocho colores** (oro, rosa, rojo, naranja, verde, turquesa,
azul, violeta) para agrupar momentos o destacar los más especiales. El color se elige al
crear o editar el momento, y también tiñe la franja superior de su panel.

### Atajos

| | |
|---|---|
| `←` `→` | Recorrer los momentos |
| `N` | Agregar un momento |
| `Esc` | Cerrar el panel |
| Arrastrar | Mover la línea |
| Rueda | Mover la línea |
| `Cmd`/`Ctrl` + rueda | Acercar y alejar |
| `←` `→` (con una foto abierta) | Pasar de foto en foto |
| `Esc` (con una foto abierta) | Cerrar el visor |

---

## Estructura

```
linea-time/
├── supabase/
│   ├── schema.sql             tabla, políticas RLS y su historia
│   └── 02_fotos_y_colores.sql fotos, colores y bucket de imágenes
├── index.html
├── vercel.json                rewrites para que funcione como SPA
└── src/
    ├── components/
    │   ├── TimelineCanvas.tsx   el hilo dorado (SVG)
    │   ├── EventDetail.tsx      la ficha centrada del momento
    │   ├── EventForm.tsx        agregar / editar, subir fotos, elegir color
    │   ├── EmojiPicker.tsx      lista de emojis por categoría
    │   ├── Icono.tsx            iconos de trazo, sin librería
    │   ├── Lightbox.tsx         ver las fotos a pantalla completa
    │   ├── Toast.tsx            avisos y deshacer
    │   └── Starfield.tsx        el polvo dorado del fondo
    ├── lib/
    │   ├── supabase.ts          único lugar que sabe de la base y del bucket
    │   ├── colores.ts           la paleta de los puntos
    │   ├── emojis.ts            los emojis disponibles, por grupo
    │   ├── scale.ts             escala de tiempo logarítmica
    │   └── format.ts            fechas en español
    └── styles/index.css
```

### Detalles que importan

- **La escala del tiempo es logarítmica.** Tres años y treinta días no pueden medir lo
  mismo en pantalla, o los días importantes quedarían aplastados.
- **La traducción snake_case ↔ camelCase vive solo en `lib/supabase.ts`.** Ningún
  componente sabe cómo se llaman las columnas.
- **Las fechas se manejan siempre en hora local.** En UTC, algo a las 22:30 del 18 de julio
  se convierte en el 19.
- **Las fotos de un momento borrado no se van de inmediato:** se sueltan del bucket recién
  cuando vence el deshacer. Si desaparecieran antes, restaurar el recuerdo lo dejaría sin
  sus fotos.
- **Si cancelas el formulario**, las fotos que habías subido en esa sesión se borran del
  bucket para no dejar basura.
- **El panel de emojis se ancla a la fila, no al campo**, y se abre empujando hacia abajo:
  dentro de un modal con scroll, un panel flotante se corta contra los bordes.

---

## Lo que se quitó

Antes esto tenía un backend en Express + MongoDB y un "¿qué hubiera pasado si…?" que
usaba Gemini para simular realidades alternas donde la línea se rompía o se reconstruía.

Se quitó al migrar a Supabase, porque la API key de Gemini no puede vivir en el frontend
(quedaría visible para cualquiera que abra el sitio). Sigue completo en el historial de
git, en el commit `first commit`.

Para recuperarlo bastaría con una función serverless de Vercel (`api/simulate.ts`) que
guarde la key como variable de entorno.
