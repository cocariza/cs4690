import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer | null = null;

const setupTestDb = async (): Promise<void> => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.SESSION_SECRET = 'test_secret';
  await mongoose.connect(process.env.MONGO_URI);
};

const teardownTestDb = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  mongo = null;
};

const clearTestDb = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export { setupTestDb, teardownTestDb, clearTestDb };
