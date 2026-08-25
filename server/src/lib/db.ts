import mongoose from 'mongoose';

/**
 * Conecta a Mongo. Si no hay MONGODB_URI (o falla la conexion) levanta una
 * instancia en memoria para que la app corra sin instalar nada.
 */
export async function connectDB(): Promise<string> {
  const uri = process.env.MONGODB_URI?.trim();

  if (uri) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    return uri;
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mem = await MongoMemoryServer.create();
  const memUri = mem.getUri('line-love');
  await mongoose.connect(memUri);
  return `${memUri} (en memoria: los datos se borran al apagar el server)`;
}
