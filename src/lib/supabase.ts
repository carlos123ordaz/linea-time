import { createClient } from '@supabase/supabase-js';
import type { EventInput, TimelineEvent } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const configurado = Boolean(url && key);

export const supabase = configurado
  ? createClient(url, key, { auth: { persistSession: false } })
  : null;

/**
 * Postgres usa snake_case y la interfaz camelCase. La traducción vive aquí y
 * en ningún otro lado, así que los componentes no saben de la base.
 */
interface Fila {
  id: string;
  title: string;
  description: string;
  date: string;
  kind: TimelineEvent['kind'];
  place: string;
  people: string[] | null;
  is_pivot: boolean;
  importance: number;
  emoji: string;
  photos: string[] | null;
  color: string;
}

const aEvento = (f: Fila): TimelineEvent => ({
  id: f.id,
  title: f.title,
  description: f.description ?? '',
  date: f.date,
  kind: f.kind,
  place: f.place ?? '',
  people: f.people ?? [],
  isPivot: f.is_pivot,
  importance: f.importance,
  emoji: f.emoji ?? '',
  photos: f.photos ?? [],
  color: f.color ?? '',
});

function aFila(e: Partial<EventInput>) {
  const fila: Record<string, unknown> = {};
  if (e.title !== undefined) fila.title = e.title;
  if (e.description !== undefined) fila.description = e.description;
  if (e.date !== undefined) fila.date = e.date;
  if (e.kind !== undefined) fila.kind = e.kind;
  if (e.place !== undefined) fila.place = e.place;
  if (e.people !== undefined) fila.people = e.people;
  if (e.isPivot !== undefined) fila.is_pivot = e.isPivot;
  if (e.importance !== undefined) fila.importance = e.importance;
  if (e.emoji !== undefined) fila.emoji = e.emoji;
  if (e.photos !== undefined) fila.photos = e.photos;
  if (e.color !== undefined) fila.color = e.color;
  return fila;
}

function cliente() {
  if (!supabase) {
    throw new Error(
      'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.'
    );
  }
  return supabase;
}

/** Traduce los errores de Postgres a algo que se entienda en pantalla. */
function explotar(error: { message: string; code?: string }): never {
  if (error.code === '42P01') {
    throw new Error(
      'La tabla "events" no existe todavía. Corre supabase/schema.sql en el SQL Editor de Supabase.'
    );
  }
  if (error.code === '42501') {
    throw new Error('Supabase rechazó la operación por las políticas RLS de la tabla.');
  }
  throw new Error(error.message);
}

const BUCKET = 'recuerdos';
const MAX_BYTES = 10 * 1024 * 1024;

export const fotos = {
  /** Sube una imagen al bucket y devuelve su URL pública. */
  async subir(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error(`"${file.name}" no es una imagen.`);
    }
    if (file.size > MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(`"${file.name}" pesa ${mb} MB. El máximo por foto es 10 MB.`);
    }

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nombre = `${crypto.randomUUID()}.${ext || 'jpg'}`;

    const { error } = await cliente()
      .storage.from(BUCKET)
      .upload(nombre, file, { cacheControl: '31536000', upsert: false });

    if (error) {
      if (/bucket not found/i.test(error.message)) {
        throw new Error(
          'Falta el bucket "recuerdos". Corre supabase/02_fotos_y_colores.sql en el SQL Editor.'
        );
      }
      throw new Error(error.message);
    }

    return cliente().storage.from(BUCKET).getPublicUrl(nombre).data.publicUrl;
  },

  /** Borra del bucket una foto a partir de su URL pública. */
  async borrar(url: string): Promise<void> {
    const nombre = url.split(`/${BUCKET}/`).pop();
    if (!nombre || nombre === url) return;
    await cliente().storage.from(BUCKET).remove([decodeURIComponent(nombre)]);
  },
};

export const api = {
  async listEvents(): Promise<TimelineEvent[]> {
    const { data, error } = await cliente()
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    if (error) explotar(error);
    return (data as Fila[]).map(aEvento);
  },

  async createEvent(input: Partial<EventInput>): Promise<TimelineEvent> {
    const { data, error } = await cliente()
      .from('events')
      .insert(aFila(input))
      .select()
      .single();
    if (error) explotar(error);
    return aEvento(data as Fila);
  },

  async updateEvent(id: string, input: Partial<EventInput>): Promise<TimelineEvent> {
    const { data, error } = await cliente()
      .from('events')
      .update(aFila(input))
      .eq('id', id)
      .select()
      .single();
    if (error) explotar(error);
    return aEvento(data as Fila);
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await cliente().from('events').delete().eq('id', id);
    if (error) explotar(error);
  },
};
