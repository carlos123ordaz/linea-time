import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './lib/db.js';
import { EventModel } from './models/Event.js';
import { historia } from './lib/story.js';
import { eventsRouter } from './routes/events.js';
import { simulationsRouter } from './routes/simulations.js';
import { geminiConfigured } from './services/gemini.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, gemini: geminiConfigured() });
});

app.use('/api/events', eventsRouter);
app.use('/api/simulations', simulationsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err?.message ?? err);
  res.status(500).json({ error: err?.message ?? 'Error interno' });
});

const PORT = Number(process.env.PORT ?? 4000);

connectDB()
  .then(async (where) => {
    console.log(`[db]     conectado -> ${where}`);

    // Si la linea esta vacia, escribimos la historia real para que nunca
    // veas la app en blanco (importa sobre todo con la base en memoria).
    if ((await EventModel.countDocuments()) === 0) {
      await EventModel.insertMany(historia);
      console.log(`[db]     linea vacia -> sembrados ${historia.length} momentos`);
    }

    app.listen(PORT, () => {
      console.log(`[api]    http://localhost:${PORT}`);
      console.log(`[gemini] ${geminiConfigured() ? 'configurado' : 'SIN API KEY (simulaciones desactivadas)'}`);
    });
  })
  .catch((err) => {
    console.error('[db] no se pudo conectar:', err.message);
    process.exit(1);
  });
