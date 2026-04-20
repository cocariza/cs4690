import { model, Model, Schema } from 'mongoose';
import { Entity } from './Entity';
import { Tenant, TENANTS } from '../types';

interface Log extends Entity {
  courseId: string;
  uvuId: string;
  date: string;
  text: string;
  tenant: Tenant;
}

const LogSchema: Schema<Log> = new Schema<Log>(
  {
    courseId: { type: String, required: true },
    uvuId: { type: String, required: true },
    date: { type: String, required: true },
    text: { type: String, required: true },
    tenant: { type: String, required: true, enum: TENANTS },
  },
  { timestamps: true }
);

const LogModel: Model<Log> = model<Log>('logs', LogSchema);

export { Log, LogSchema, LogModel };
