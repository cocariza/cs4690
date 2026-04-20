import request from 'supertest';
import type { Express } from 'express';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup';
import { seedUser, loginAgent } from './helpers';

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

describe('Auth', () => {
  test('rejects login with bad credentials', async () => {
    await seedUser('alice', 'pw123', 'admin', 'uvu');
    const res = await request(app)
      .post('/api/v1/uvu/auth/login')
      .send({ username: 'alice', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('accepts valid login and sets session', async () => {
    await seedUser('alice', 'pw123', 'admin', 'uvu');
    const agent = await loginAgent(app, 'uvu', 'alice', 'pw123');
    const me = await agent.get('/api/v1/uvu/auth/me').expect(200);
    expect(me.body.user.username).toBe('alice');
    expect(me.body.user.role).toBe('admin');
    expect(me.body.user.tenant).toBe('uvu');
  });

  test('student self-signup creates a student session', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/api/v1/uvu/auth/signup')
      .send({ username: '10000001', password: 'pass', role: 'student' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');
    const me = await agent.get('/api/v1/uvu/auth/me').expect(200);
    expect(me.body.user.username).toBe('10000001');
  });

  test('self-signup as teacher is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/uvu/auth/signup')
      .send({ username: 'sneaky', password: 'pass', role: 'teacher' });
    expect(res.status).toBe(403);
  });

  test('logout destroys session', async () => {
    await seedUser('alice', 'pw123', 'admin', 'uvu');
    const agent = await loginAgent(app, 'uvu', 'alice', 'pw123');
    await agent.post('/api/v1/uvu/auth/logout').expect(200);
    const me = await agent.get('/api/v1/uvu/auth/me');
    expect(me.status).toBe(401);
  });
});
