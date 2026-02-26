import mongoose from 'mongoose';
import { env } from '$env/dynamic/private';

type MongooseCache = {
	conn: typeof mongoose | null;
	promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
	mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose.mongooseCache ?? {
	conn: null,
	promise: null
};

globalForMongoose.mongooseCache = cache;

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017';
const DEFAULT_MONGODB_DB = 'recipes';

export async function connectToDatabase() {
	if (cache.conn) return cache.conn;

	const mongoUri = env.MONGODB_URI || DEFAULT_MONGODB_URI;
	const dbName = env.MONGODB_DB || DEFAULT_MONGODB_DB;

	if (!cache.promise) {
		cache.promise = mongoose.connect(mongoUri, {
			dbName
		});
	}

	cache.conn = await cache.promise;
	return cache.conn;
}
