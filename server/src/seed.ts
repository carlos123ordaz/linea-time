import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './lib/db.js';
import { EventModel } from './models/Event.js';
import { historia } from './lib/story.js';

/**
 * Siembra la historia en una Mongo REAL (local o Atlas).
 * Con la base en memoria no hace falta: el server la siembra solo al arrancar.
 */
async function main() {
  const force = process.argv.includes('--force');
  const where = await connectDB();
  console.log(`[db] ${where}`);

  if (!process.env.MONGODB_URI?.trim()) {
    console.log(
      '[seed] Estas usando la base en memoria: el server siembra la historia solo al arrancar.\n' +
        '       Para guardar de verdad, pon MONGODB_URI en server/.env'
    );
  }

  const count = await EventModel.countDocuments();
  if (count > 0 && !force) {
    console.log(`[seed] Ya hay ${count} momentos. Usa "npm run seed -- --force" para reemplazarlos.`);
    await mongoose.disconnect();
    return;
  }

  if (force) {
    const { deletedCount } = await EventModel.deleteMany({});
    console.log(`[seed] Borrados ${deletedCount} momentos anteriores.`);
  }

  await EventModel.insertMany(historia);
  console.log(`[seed] Listo: ${historia.length} momentos escritos en la linea de tiempo.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
