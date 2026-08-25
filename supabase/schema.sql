-- ─────────────────────────────────────────────────────────────
-- Nuestra línea de tiempo — esquema de Supabase
--
-- Cómo usarlo: Supabase > SQL Editor > New query > pega esto > Run.
-- Es seguro correrlo dos veces: borra la tabla y la vuelve a crear.
-- ⚠️ Correrlo de nuevo BORRA los momentos que hayas agregado después.
-- ─────────────────────────────────────────────────────────────

drop table if exists public.events cascade;

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null check (char_length(title) between 1 and 120),
  description text        not null default '',
  date        timestamptz not null,
  kind        text        not null default 'recuerdo'
              check (kind in ('origen', 'conexion', 'encuentro', 'hito', 'recuerdo')),
  place       text        not null default '',
  people      text[]      not null default '{}',
  is_pivot    boolean     not null default false,
  importance  smallint    not null default 3 check (importance between 1 and 5),
  emoji       text        not null default '',
  photo_url   text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index events_date_idx on public.events (date);

-- updated_at se mantiene solo
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
--
-- Elegiste que cualquiera pueda editar, así que estas políticas dejan
-- leer y escribir a visitantes anónimos. Es lo que hace que el sitio
-- funcione sin login, PERO significa que cualquiera con el link puede
-- borrar o cambiar sus recuerdos.
--
-- Para cerrarlo más adelante: borra las tres políticas de escritura de
-- abajo y deja solo la de lectura. Tú seguirás editando desde el panel
-- de Supabase (Table Editor), que no pasa por RLS.
-- ─────────────────────────────────────────────────────────────

alter table public.events enable row level security;

create policy "lectura publica"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "insercion publica"
  on public.events for insert
  to anon, authenticated
  with check (true);

create policy "actualizacion publica"
  on public.events for update
  to anon, authenticated
  using (true) with check (true);

create policy "borrado publico"
  on public.events for delete
  to anon, authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- Su historia, tal como la dejaron
-- ─────────────────────────────────────────────────────────────

insert into public.events
  (title, description, date, kind, place, people, is_pivot, importance, emoji, photo_url)
values
  ('Dos invitaciones para la misma fiesta', 'Su amiga invita a Diesslly, porque son abogadas y son amigas.
Tu amigo te invita a ti, porque son ingenieros de sistemas y son amigos.

Dos invitaciones distintas, hechas por razones distintas, que apuntaban sin saberlo al mismo lugar y a la misma noche. Este es el punto nexo: si una sola de las dos no se hubiera enviado, la fiesta habría pasado igual y ustedes nunca se habrían visto.

(Ajusta la fecha al día en que realmente los invitaron.)', '2026-07-16T17:00:00.000Z', 'conexion', 'La fiesta', array['Carlos', 'Diesslly', 'Tu amigo', 'Su amiga']::text[], true, 5, '✉️', ''),
  ('La noche en que nos conocimos', '18 de julio. Todas las líneas de arriba (Víctor, Tu amigo, Su amiga, las dos invitaciones) existieron únicamente para llegar a este punto exacto.

Se conocieron. Y bailaron por primera vez.

De todos los futuros posibles, este es el único donde Carlos y Diesslly están en la misma canción al mismo tiempo.', '2026-07-18T17:00:00.000Z', 'encuentro', 'La fiesta', array['Carlos', 'Diesslly']::text[], true, 5, '💃', ''),
  ('Le pido a Diesslly que sea mi novia', 'Un mes exacto después de la primera canción, el 18 de agosto, se lo preguntaste.

Y dijo que sí.

A partir de aquí la línea deja de ser casualidad y empieza a ser decisión: ya no es el universo el que los junta, son ustedes dos los que eligen quedarse.', '2026-08-18T17:00:00.000Z', 'hito', '', array['Carlos', 'Diesslly']::text[], false, 5, '💍', ''),
  ('Nuestro primer pollito juntos en SJL', 'Nuestra primera cena comiendo pollito broster como novios en SJL', '2026-08-24T17:00:00.000Z', 'recuerdo', 'SJL', array['Carlos', 'Diesslly']::text[], false, 2, ':v', '');
