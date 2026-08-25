import { Schema, model, InferSchemaType } from 'mongoose';

const branchEventSchema = new Schema(
  {
    date: { type: String, required: true },   // ISO corto: YYYY-MM-DD
    title: { type: String, required: true },
    description: { type: String, default: '' },
    /** 'igual' = pasa como en la realidad, 'nuevo' = solo existe en esta rama */
    nature: { type: String, enum: ['igual', 'nuevo', 'roto'], default: 'nuevo' },
  },
  { _id: false }
);

const simulationSchema = new Schema(
  {
    /** El "que hubiera pasado si..." que escribio el usuario */
    premise: { type: String, required: true, trim: true, maxlength: 500 },
    /** Evento desde el cual se abre la rama */
    pivotEventId: { type: Schema.Types.ObjectId, ref: 'Event', default: null },
    pivotDate: { type: Date, default: null },

    /** Resultado del modelo */
    verdict: {
      type: String,
      enum: ['nunca', 'reconstruida', 'inevitable'],
      default: 'reconstruida',
    },
    probability: { type: Number, min: 0, max: 100, default: 50 },
    headline: { type: String, default: '' },
    summary: { type: String, default: '' },
    collapseReason: { type: String, default: '' },
    /** Fecha real en la que la realidad se parte (puede ser anterior al pivote elegido) */
    divergenceDate: { type: String, default: '' },
    alternateMeetDate: { type: String, default: '' },
    closingLine: { type: String, default: '' },
    branchEvents: { type: [branchEventSchema], default: [] },

    model: { type: String, default: '' },
  },
  { timestamps: true }
);

export type SimulationDoc = InferSchemaType<typeof simulationSchema>;
export const SimulationModel = model('Simulation', simulationSchema);
