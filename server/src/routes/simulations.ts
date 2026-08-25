import { Router } from 'express';
import { z } from 'zod';
import { EventModel } from '../models/Event.js';
import { SimulationModel } from '../models/Simulation.js';
import { simulateTimeline, geminiConfigured } from '../services/gemini.js';

export const simulationsRouter = Router();

/**
 * Fecha en hora LOCAL, no en UTC. Con toISOString(), una fiesta a las 22:30 del 18
 * de julio le llegaba a Gemini como "19 de julio" y ese error terminaba escrito en
 * el texto que lee la pareja.
 */
const fmt = (d: Date) => {
  const x = new Date(d);
  const mes = String(x.getMonth() + 1).padStart(2, '0');
  const dia = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${mes}-${dia}`;
};

function timelineToText(events: Array<Record<string, any>>): string {
  return events
    .map((e) => {
      const bits = [
        `- ${fmt(e.date)} | ${e.title}`,
        e.place ? `(en ${e.place})` : '',
        e.people?.length ? `[personas: ${e.people.join(', ')}]` : '',
      ]
        .filter(Boolean)
        .join(' ');
      return e.description ? `${bits}\n    ${e.description}` : bits;
    })
    .join('\n');
}

simulationsRouter.get('/', async (_req, res, next) => {
  try {
    const sims = await SimulationModel.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(sims);
  } catch (err) {
    next(err);
  }
});

const simInput = z.object({
  premise: z.string().min(4).max(500),
  pivotEventId: z.string().optional().nullable(),
});

simulationsRouter.post('/', async (req, res, next) => {
  try {
    if (!geminiConfigured()) {
      return res.status(503).json({
        error:
          'Falta GEMINI_API_KEY. Copia server/.env.example a server/.env y pon tu key de https://aistudio.google.com/apikey',
      });
    }

    const parsed = simInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos invalidos', issues: parsed.error.issues });
    }
    const { premise, pivotEventId } = parsed.data;

    const events = await EventModel.find().sort({ date: 1 }).lean();
    if (events.length === 0) {
      return res
        .status(400)
        .json({ error: 'No hay momentos en la linea todavia. Agrega al menos uno.' });
    }

    const pivot = pivotEventId ? events.find((e) => String(e._id) === pivotEventId) : null;
    const pivotText = pivot
      ? `${fmt(pivot.date)} — ${pivot.title}${pivot.place ? ` (en ${pivot.place})` : ''}`
      : 'El inicio de todo (la rama se abre desde el evento mas antiguo de la linea).';

    const { result, model } = await simulateTimeline({
      premise,
      timelineText: timelineToText(events),
      pivotText,
    });

    const saved = await SimulationModel.create({
      premise,
      pivotEventId: pivot?._id ?? null,
      pivotDate: pivot?.date ?? events[0].date,
      model,
      ...result,
    });

    res.status(201).json(saved.toObject());
  } catch (err) {
    next(err);
  }
});

simulationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await SimulationModel.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ error: 'Esa realidad no existe' });
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});
