-- ─────────────────────────────────────────────────────────────
-- Fotos por momento + color del punto en la línea
--
-- Supabase > SQL Editor > New query > pega esto > Run.
-- Esta migración NO borra nada: solo agrega columnas y el bucket
-- de fotos. Se puede correr varias veces sin problema.
-- ─────────────────────────────────────────────────────────────

-- 1. Columnas nuevas ------------------------------------------------------

-- Varias fotos por momento (antes solo cabía una URL suelta)
alter table public.events add column if not exists photos text[] not null default '{}';

-- Color del punto en la línea. '' = el dorado de siempre.
alter table public.events add column if not exists color text not null default '';

-- Si había una foto en la columna vieja, se conserva
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'photo_url'
  ) then
    update public.events
       set photos = array[photo_url]
     where photo_url <> '' and cardinality(photos) = 0;
    alter table public.events drop column photo_url;
  end if;
end $$;

-- 2. Bucket de fotos ------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recuerdos',
  'recuerdos',
  true,
  10485760,  -- 10 MB por foto
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Permisos del bucket --------------------------------------------------
--
-- Igual que la tabla: cualquiera puede ver y subir. Para cerrarlo después,
-- borra las políticas de subida y borrado y deja solo la de lectura.

drop policy if exists "recuerdos lectura"      on storage.objects;
drop policy if exists "recuerdos subida"       on storage.objects;
drop policy if exists "recuerdos actualizacion" on storage.objects;
drop policy if exists "recuerdos borrado"      on storage.objects;

create policy "recuerdos lectura"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'recuerdos');

create policy "recuerdos subida"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'recuerdos');

create policy "recuerdos actualizacion"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'recuerdos') with check (bucket_id = 'recuerdos');

create policy "recuerdos borrado"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'recuerdos');
