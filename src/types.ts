export type EventKind = 'origen' | 'conexion' | 'encuentro' | 'hito' | 'recuerdo';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  /** ISO. Se guarda como timestamptz en Postgres. */
  date: string;
  kind: EventKind;
  place: string;
  people: string[];
  isPivot: boolean;
  importance: number;
  emoji: string;
  /** URLs públicas del bucket 'recuerdos' */
  photos: string[];
  /** id de COLORES; '' es el dorado por defecto */
  color: string;
}

export type EventInput = Omit<TimelineEvent, 'id'>;
