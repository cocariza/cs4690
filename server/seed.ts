import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connection, disconnect } from 'mongoose';
import { Repository } from './db/Repository';
import { User, UserModel } from './models/User';
import { Course, CourseModel } from './models/Course';

const seedUser = async (
  username: string,
  password: string,
  tenant: 'uvu' | 'uofu'
): Promise<void> => {
  const repo = new Repository<User>(UserModel);
  const existing = await repo.findOne({ username, tenant });
  if (existing) {
    console.log(`[seed] ${tenant}:${username} already exists, skipping`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await repo.save({
    username,
    passwordHash,
    role: 'admin',
    tenant,
  } as Partial<User>);
  console.log(`[seed] created ${tenant}:${username}`);
};

const seedSampleCourses = async (): Promise<void> => {
  const repo = new Repository<Course>(CourseModel);
  const samples: Array<{ id: string; display: string; tenant: 'uvu' | 'uofu' }> = [
    { id: 'cs1400', display: 'CS 1400 - Fundamentals', tenant: 'uvu' },
    { id: 'cs4690', display: 'CS 4690 - Web Development', tenant: 'uvu' },
    { id: 'cs3005', display: 'CS 3005 - Programming in C++', tenant: 'uofu' },
    { id: 'cs4400', display: 'CS 4400 - Computer Systems', tenant: 'uofu' },
  ];
  for (const s of samples) {
    const existing = await repo.findOne({ id: s.id, tenant: s.tenant });
    if (existing) {
      console.log(`[seed] course ${s.tenant}:${s.id} exists, skipping`);
      continue;
    }
    await repo.save({
      id: s.id,
      display: s.display,
      tenant: s.tenant,
      studentIds: [],
    } as Partial<Course>);
    console.log(`[seed] created course ${s.tenant}:${s.id}`);
  }
};

const run = async (): Promise<void> => {
  try {
    await seedUser('root_uvu', 'willy', 'uvu');
    await seedUser('root_uofu', 'swoopy', 'uofu');
    await seedSampleCourses();
    console.log('[seed] done');
  } catch (error) {
    console.error('[seed] error:', error);
    process.exitCode = 1;
  } finally {
    if (connection.readyState === 1) {
      await disconnect();
    }
  }
};

run();
