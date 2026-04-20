import { model, Model, Schema } from 'mongoose';
import { Entity } from './Entity';
import { Tenant, TENANTS } from '../types';

interface Course extends Entity {
  id: string;
  display: string;
  tenant: Tenant;
  teacherId?: string;
  studentIds: string[];
}

const CourseSchema: Schema<Course> = new Schema<Course>(
  {
    id: { type: String, required: true },
    display: { type: String, required: true },
    tenant: { type: String, required: true, enum: TENANTS },
    teacherId: { type: String, required: false },
    studentIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

CourseSchema.index({ id: 1, tenant: 1 }, { unique: true });

const CourseModel: Model<Course> = model<Course>('courses', CourseSchema);

export { Course, CourseSchema, CourseModel };
