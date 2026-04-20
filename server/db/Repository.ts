import 'dotenv/config';
import { Entity } from '../models/Entity';
import { Model, connect, connection } from 'mongoose';

class Repository<T extends Entity> {
  private static connected = false;
  protected entityModel: Model<T>;

  public constructor(entityModel: Model<T>) {
    this.entityModel = entityModel;
  }

  public async save(t: Partial<T>): Promise<T> {
    await Repository.connect();
    const modelT = new this.entityModel(t);
    const saved = await modelT.save();
    return saved as unknown as T;
  }

  public async get(filters?: Map<string, unknown>): Promise<T[]> {
    await Repository.connect();
    const query = this.entityModel.find<T>();
    if (filters && filters.size > 0) {
      for (const [key, value] of filters.entries()) {
        query.where(key).equals(value);
      }
    }
    return query.exec();
  }

  public async findOne(filters: Record<string, unknown>): Promise<T | null> {
    await Repository.connect();
    return this.entityModel.findOne(filters).exec() as Promise<T | null>;
  }

  public async update(
    filters: Record<string, unknown>,
    updates: Record<string, unknown>
  ): Promise<T | null> {
    await Repository.connect();
    return this.entityModel
      .findOneAndUpdate(filters, updates, { new: true })
      .exec() as Promise<T | null>;
  }

  public async count(filters?: Record<string, unknown>): Promise<number> {
    await Repository.connect();
    return this.entityModel.countDocuments(filters ?? {});
  }

  protected static async connect(): Promise<void> {
    if (Repository.connected) return;
    if (connection.readyState === 1) {
      Repository.connected = true;
      return;
    }
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set in .env');
    await connect(uri);
    Repository.connected = true;
  }
}

export { Repository };
