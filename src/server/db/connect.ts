import mongoose from "mongoose";
import { logger } from "../lib/logger";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __cowscueMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = (globalThis.__cowscueMongoose ??= { conn: null, promise: null });

/**
 * Connection is cached on globalThis so hot-reloads and serverless warm starts reuse one pool.
 * Pool size is tuned per process: web replicas keep a modest pool, the worker can raise it.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 10),
        minPoolSize: 1,
        serverSelectionTimeoutMS: 8_000,
        socketTimeoutMS: 30_000,
        appName: process.env.SERVICE_NAME || "cowscue-web",
      })
      .then((m) => {
        logger.info("mongodb connected");
        return m;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}

export function mongoHealthy(): boolean {
  return mongoose.connection.readyState === 1;
}

export default connectDB;
