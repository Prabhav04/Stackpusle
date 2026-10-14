import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { prisma } from './config/prisma.js';

describe('Auth & Data Ownership Isolation Tests', () => {
  const app = createApp();

  const user1Email = `user1_${Date.now()}@example.com`;
  const user2Email = `user2_${Date.now()}@example.com`;
  const password = 'securepassword123';

  let user1Cookie: string[] = [];
  let user2Cookie: string[] = [];
  let user1ComparisonId: string = '';
  let user1PinId: string = '';

  beforeAll(async () => {
    // 1. Create a dummy developer and repo in DB to test pinning
    const dev = await prisma.developer.upsert({
      where: { username: 'testdeveloper' },
      create: {
        username: 'testdeveloper',
        name: 'Test Developer',
        followers: 100,
        publicRepos: 5,
        fetchedAt: new Date(),
      },
      update: {},
    });

    const repo = await prisma.repo.upsert({
      where: { githubId: BigInt(99999999) },
      create: {
        developerId: dev.id,
        githubId: BigInt(99999999),
        name: 'test-repo',
        url: 'https://github.com/testdeveloper/test-repo',
        stars: 42,
        language: 'TypeScript',
        isFork: false,
      },
      update: {},
    });

    // 2. Register User 1
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ email: user1Email, password })
      .expect(201);
    const rawCookie1 = res1.headers['set-cookie'];
    user1Cookie = Array.isArray(rawCookie1) ? rawCookie1 : rawCookie1 ? [rawCookie1] : [];

    // 3. Register User 2
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ email: user2Email, password })
      .expect(201);
    const rawCookie2 = res2.headers['set-cookie'];
    user2Cookie = Array.isArray(rawCookie2) ? rawCookie2 : rawCookie2 ? [rawCookie2] : [];

    // 4. User 1 creates a saved comparison
    const compRes = await request(app)
      .post('/api/comparisons')
      .set('Cookie', user1Cookie)
      .send({
        name: "User 1's Private Comparison",
        usernames: ['testdeveloper', 'testdeveloper2'],
      });

    // If testdeveloper2 doesn't exist on github, mock creating directly in DB for ownership test
    if (compRes.status === 201) {
      user1ComparisonId = compRes.body.comparison.id;
    } else {
      const dbComp = await prisma.comparison.create({
        data: {
          name: "User 1's Private Comparison",
          user: { connect: { email: user1Email } },
        },
      });
      user1ComparisonId = dbComp.id;
    }

    // 5. User 1 creates a pin
    const pinRes = await request(app)
      .post('/api/pins')
      .set('Cookie', user1Cookie)
      .send({
        repoId: repo.id,
        note: "User 1's secret assessment",
      })
      .expect(201);

    user1PinId = pinRes.body.pin.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { in: [user1Email, user2Email] } },
    });
    await prisma.developer.deleteMany({
      where: { username: 'testdeveloper' },
    });
  });

  describe('Unauthenticated Access Guards', () => {
    it('returns 401 when fetching pins without session', async () => {
      const res = await request(app).get('/api/pins');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 401 when fetching comparisons without session', async () => {
      const res = await request(app).get('/api/comparisons');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 401 when accessing developer profile without session', async () => {
      const res = await request(app).get('/api/developers/torvalds');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Cross-Tenant Isolation (User 2 cannot read or tamper User 1 data)', () => {
    it("returns 404 when User 2 attempts to GET User 1's comparison", async () => {
      const res = await request(app)
        .get(`/api/comparisons/${user1ComparisonId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it("returns 404 when User 2 attempts to DELETE User 1's comparison", async () => {
      const res = await request(app)
        .delete(`/api/comparisons/${user1ComparisonId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it("returns 404 when User 2 attempts to edit User 1's pin note", async () => {
      const res = await request(app)
        .patch(`/api/pins/${user1PinId}`)
        .set('Cookie', user2Cookie)
        .send({ note: 'Malicious modification attempt' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it("returns 404 when User 2 attempts to DELETE User 1's pin", async () => {
      const res = await request(app)
        .delete(`/api/pins/${user1PinId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it("User 1 CAN successfully read and edit their own pin", async () => {
      const res = await request(app)
        .patch(`/api/pins/${user1PinId}`)
        .set('Cookie', user1Cookie)
        .send({ note: 'Updated legitimate note' });

      expect(res.status).toBe(200);
      expect(res.body.pin.note).toBe('Updated legitimate note');
    });
  });
});
