import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

mongoose.set('strictQuery', true);

let listenersBound = false;
let connectPromise: Promise<typeof mongoose> | null = null;

function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
}

/**
 * Connects to MongoDB. The connection (and its in-flight promise) is cached so
 * repeated calls — one per request in a serverless environment — reuse a single
 * pooled connection instead of opening a new one each time.
 */
export function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (connectPromise) return connectPromise;

  bindListeners();
  connectPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: env.NODE_ENV !== 'production',
    })
    .catch((err) => {
      connectPromise = null; // allow a retry on the next request
      throw err;
    });

  return connectPromise;
}

export async function disconnectDatabase(): Promise<void> {
  connectPromise = null;
  await mongoose.connection.close();
}
