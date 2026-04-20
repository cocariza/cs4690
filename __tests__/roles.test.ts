import type { Express } from 'express';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup';
import { seedUser, seedCourse, loginAgent } from './helpers';

let app: Express;

beforeAll(async () => {
  await setupTestDb();
  app = require('../app').default;
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('Role gating', () => {
  test('admin can create a teacher', async () => {
    await seedUser('root_uvu', 'willy', 'admin', 'uvu');
    const agent = await loginAgent(app, 'uvu', 'root_uvu', 'willy');
    const res = await agent
      .post('/api/v1/uvu/users')
      .send({ username: 'prof', password: 'pw', role: 'teacher' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('teacher');
  });

  test('teacher cannot create an admin and gets logged out', async () => {
    await seedUser('prof', 'pw', 'teacher', 'uvu');
    const agent = await loginAgent(app, 'uvu', 'prof', 'pw');
    const res = await agent
      .post('/api/v1/uvu/users')
      .send({ username: 'evil_admin', password: 'pw', role: 'admin' });
    expect(res.status).toBe(401);
    const me = await agent.get('/api/v1/uvu/auth/me');
    expect(me.status).toBe(401);
  });

  test('student cannot list users and gets logged out', async () => {
    await seedUser('10000001', 'pw', 'student', 'uvu');
    const agent = await loginAgent(app, 'uvu', '10000001', 'pw');
    const res = await agent.get('/api/v1/uvu/users');
    expect(res.status).toBe(401);
    const me = await agent.get('/api/v1/uvu/auth/me');
    expect(me.status).toBe(401);
  });

  test('teacher can create a course and see it', async () => {
    const teacherId = await seedUser('prof', 'pw', 'teacher', 'uvu');
    const agent = await loginAgent(app, 'uvu', 'prof', 'pw');
    await agent
      .post('/api/v1/uvu/courses')
      .send({ id: 'cs4690', display: 'Web Dev' })
      .expect(201);
    const list = await agent.get('/api/v1/uvu/courses').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].teacherId).toBe(teacherId);
  });

  test('student can self-enroll', async () => {
    const studentId = await seedUser('10000001', 'pw', 'student', 'uvu');
    await seedCourse('cs4690', 'uvu');
    const agent = await loginAgent(app, 'uvu', '10000001', 'pw');
    const res = await agent.post('/api/v1/uvu/courses/cs4690/enroll').send({}).expect(200);
    expect(res.body.studentIds).toContain(studentId);
  });

  test('student only sees their own logs', async () => {
    await seedUser('10000001', 'pw', 'student', 'uvu');
    await seedCourse('cs4690', 'uvu');
    const agent = await loginAgent(app, 'uvu', '10000001', 'pw');
    await agent.post('/api/v1/uvu/courses/cs4690/enroll').send({}).expect(200);
    await agent
      .post('/api/v1/uvu/logs')
      .send({ courseId: 'cs4690', uvuId: '10000001', text: 'hello' })
      .expect(201);
    const res = await agent.get('/api/v1/uvu/logs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].uvuId).toBe('10000001');
  });

  test('student cannot post a log under another uvuId', async () => {
    await seedUser('10000001', 'pw', 'student', 'uvu');
    const agent = await loginAgent(app, 'uvu', '10000001', 'pw');
    const res = await agent
      .post('/api/v1/uvu/logs')
      .send({ courseId: 'cs4690', uvuId: '99999999', text: 'impersonate' });
    expect(res.status).toBe(401);
  });
});
