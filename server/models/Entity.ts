import { Schema } from 'mongoose';

interface Entity {
  createdAt: Date;
  updatedAt: Date;
}

const EntitySchema: Schema<Entity> = new Schema<Entity>(
  {
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export { Entity, EntitySchema };
