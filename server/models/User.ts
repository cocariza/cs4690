import { model, Model, Schema } from 'mongoose';
import { Entity } from './Entity';
import { Role, Tenant, ROLES, TENANTS } from '../types';

interface User extends Entity {
  username: string;
  passwordHash: string;
  role: Role;
  tenant: Tenant;
  createdBy?: string;
}

const UserSchema: Schema<User> = new Schema<User>(
  {
    username: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ROLES },
    tenant: { type: String, required: true, enum: TENANTS },
    createdBy: { type: String, required: false },
  },
  { timestamps: true }
);

UserSchema.index({ username: 1, tenant: 1 }, { unique: true });

const UserModel: Model<User> = model<User>('users', UserSchema);

export { User, UserSchema, UserModel };
