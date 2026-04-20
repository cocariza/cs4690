import bcrypt from 'bcryptjs';
import request from 'supertest';
import { Express } from 'express';
import { UserModel } from '../server/models/User';
import { CourseModel } from '../server/models/Course';
import { Role, Tenant } from '../server/types';

const seedUser = async (
  username: string,
  password: string,
  role: Role,
  tenant: Tenant
): Promise<string> => {
  const passwordHash = await bcrypt.hash(password, 4);
  const created = await UserModel.create({ username, passwordHash, role, tenant });
  return created._id.toString();
};

const seedCourse = async (
  id: string,
  tenant: Tenant,
  teacherId?: string,
  studentIds: string[] = []
): Promise<void> => {
  await CourseModel.create({
    id,
    display: `${id.toUpperCase()} Display`,
    tenant,
    teacherId,
    studentIds,
  });
};

const loginAgent = async (
  app: Express,
  tenant: Tenant,
  username: string,
  password: string
) => {
  const agent = request.agent(app);
  const res = await agent
    .post(`/api/v1/${tenant}/auth/login`)
    .send({ username, password })
    .expect(200);
  if (!res.body.user) throw new Error('Login failed in test');
  return agent;
};

export { seedUser, seedCourse, loginAgent };
