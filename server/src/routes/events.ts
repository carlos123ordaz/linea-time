import { Router } from 'express';
import { z } from 'zod';
import { EventModel, EVENT_KINDS } from '../models/Event.js';

export const eventsRouter = Router();

const eventInput = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(4000).optional().default(''),
  date: z.coerce.date(),
  kind: z.enum(EVENT_KINDS).optional().default('recuerdo'),
  place: z.string().max(160).optional().default(''),
  people: z.array(z.string().max(60)).max(12).optional().default([]),
  isPivot: z.boolean().optional().default(false),
  importance: z.number().int().min(1).max(5).optional().default(3),
  emoji: z.string().max(8).optional().default(''),
  photoUrl: z.string().max(2000).optional().default(''),
});

eventsRouter.get('/', async (_req, res, next) => {
  try {
    const events = await EventModel.find().sort({ date: 1, createdAt: 1 }).lean();
    res.json(events);
  } catch (err) {
    next(err);
  }
});

eventsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = eventInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos invalidos', issues: parsed.error.issues });
    }
    const created = await EventModel.create(parsed.data);
    res.status(201).json(created.toObject());
  } catch (err) {
    next(err);
  }
});

eventsRouter.patch('/:id', async (req, res, next) => {
  try {
    const parsed = eventInput.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos invalidos', issues: parsed.error.issues });
    }
    const updated = await EventModel.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) return res.status(404).json({ error: 'Ese momento no existe' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

eventsRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await EventModel.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ error: 'Ese momento no existe' });
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});
