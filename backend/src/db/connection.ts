import mongoose from 'mongoose';
import { loadConfig } from '../config/config';

export async function connectMongo(): Promise<void> {
  const config = loadConfig();
  const uri = config.mongoUri ?? 'mongodb://127.0.0.1:27017/dm-support';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[mongo] connected to ${uri}`);
  } catch (err) {
    console.error('[mongo] connection failed:', (err as Error).message);
    throw err;
  }
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
