import request from 'supertest';
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

describe('Tenant isolation', () => {
  test('UVU admin cannot list UofU users (cross-tenant blocked, session destroyed)', async () => {
    await seedUser('root_uvu', 'willy', 'admin', 'uvu');
    await seedUser('root_uofu', 'swoopy', 'admin', 'uofu');
    const agent = await loginAgent(app, 'uvu', 'root_uvu', 'willy');
    const res = await agent.get('/api/v1/uofu/users');
    expect(res.status).toBe(401);
    const me = await agent.get('/api/v1/uvu/auth/me');
    expect(me.status).toBe(401);
  });

  test('same username in different tenants is allowed and isolated', async () => {
    await seedUser('shared', 'pw', 'admin', 'uvu');
    await seedUser('shared', 'pw', 'admin', 'uofu');
    const uvuAgent = await loginAgent(app, 'uvu', 'shared', 'pw');
    const meUvu = await uvuAgent.get('/api/v1/uvu/auth/me').expect(200);
    expect(meUvu.body.user.tenant).toBe('uvu');
    const uofuAgent = await loginAgent(app, 'uofu', 'shared', 'pw');
    const meUofu = await uofuAgent.get('/api/v1/uofu/auth/me').expect(200);
    expect(meUofu.body.user.tenant).toBe('uofu');
  });

  test('UVU courses not visible from UofU endpoints', async () => {
    await seedUser('root_uvu', 'willy', 'admin', 'uvu');
    await seedUser('root_uofu', 'swoopy', 'admin', 'uofu');
    await seedCourse('cs4690', 'uvu');
    await seedCourse('cs3005', 'uofu');
    const uofu = await loginAgent(app, 'uofu', 'root_uofu', 'swoopy');
    const res = await uofu.get('/api/v1/uofu/courses/all').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('cs3005');
  });

  test('invalid tenant returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/utsu/auth/login')
      .send({ username: 'x', password: 'y' });
    expect(res.status).toBe(400);
  });

  test('page redirect for non-admin hitting admin page logs and destroys session', async () => {
    await seedUser('10000001', 'pw', 'student', 'uvu');
    const agent = await loginAgent(app, 'uvu', '10000001', 'pw');
    const res = await agent.get('/uvu/admin.html');
    expect([302, 303]).toContain(res.status);
    expect(res.headers.location).toBe('/uvu/login.html');
    const me = await agent.get('/api/v1/uvu/auth/me');
    expect(me.status).toBe(401);
  });

  test('admin page accessible to admin', async () => {
    await seedUser('root_uvu', 'willy', 'admin', 'uvu');
    const agent = await loginAgent(app, 'uvu', 'root_uvu', 'willy');
    const res = await agent.get('/uvu/admin.html');
    expect(res.status).toBe(200);
  });
});
