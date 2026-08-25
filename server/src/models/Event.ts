import { Schema, model, InferSchemaType } from 'mongoose';

export const EVENT_KINDS = [
  'origen',     // causas lejanas: amistades que hicieron posible el encuentro
  'conexion',   // el hilo social que acerca las dos lineas
  'encuentro',  // el punto donde las lineas se tocan
  'hito',       // momentos grandes de la relacion
  'recuerdo',   // momentos pequenos que valen igual
] as const;

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 4000 },
    date: { type: Date, required: true, index: true },
    kind: { type: String, enum: EVENT_KINDS, default: 'recuerdo' },
    place: { type: String, default: '', maxlength: 160 },
    people: { type: [String], default: [] },
    /** true = punto nexo absoluto: si cambia, toda la linea se reescribe */
    isPivot: { type: Boolean, default: false },
    /** 1..5, controla el tamano y el brillo del nodo en la linea */
    importance: { type: Number, min: 1, max: 5, default: 3 },
    emoji: { type: String, default: '', maxlength: 8 },
    photoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

eventSchema.index({ date: 1, createdAt: 1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const EventModel = model('Event', eventSchema);
