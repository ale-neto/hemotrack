import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../src/middleware/auth.middleware.js', () => ({
  default: (req, _res, next) => {
    req.user = { id: 1, name: 'João', email: 'joao@test.com' };
    next();
  },
}));

const mockProfile = {
  id: 1,
  userId: 1,
  name: 'João',
  relationship: 'titular',
  birthDate: '1990-05-15',
  sex: 'masculino',
  weight: 75,
  height: 178,
  diseases: [],
  medications: [],
  isDefault: true,
  toPublicJSON: () => ({
    id: 1, name: 'João', relationship: 'titular',
    bmi: 23.7, age: 34, isDefault: true,
  }),
  update: vi.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    return Promise.resolve(this);
  }),
  destroy: vi.fn().mockResolvedValue(true),
};

vi.mock('../../src/models/index.js', () => ({
  UserProfile: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

import { UserProfile } from '../../src/models/index.js';
import profileRoutes from '../../src/routes/profile.routes.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/profiles', profileRoutes);
  app.use((err, req, res, next) => res.status(500).json({ success: false, error: err.message }));
  return app;
};

describe('GET /api/profiles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return all profiles for user', async () => {
    UserProfile.findAll.mockResolvedValue([mockProfile]);

    const app = buildApp();
    const res = await request(app).get('/api/profiles');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('João');
  });

  it('should include calculated bmi and age', async () => {
    UserProfile.findAll.mockResolvedValue([mockProfile]);

    const app = buildApp();
    const res = await request(app).get('/api/profiles');

    expect(res.body.data[0].bmi).toBeDefined();
    expect(res.body.data[0].age).toBeDefined();
  });
});

describe('POST /api/profiles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a new family profile', async () => {
    const newProfile = { ...mockProfile, id: 2, name: 'Maria', isDefault: false };
    newProfile.toPublicJSON = () => ({ id: 2, name: 'Maria', isDefault: false, bmi: null, age: null });
    UserProfile.create.mockResolvedValue(newProfile);

    const app = buildApp();
    const res = await request(app).post('/api/profiles').send({
      name: 'Maria',
      relationship: 'cônjuge',
      sex: 'feminino',
      weight: 60,
      height: 165,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Maria');
  });

  it('should return 400 if name is empty', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/profiles').send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('should always create with isDefault false', async () => {
    UserProfile.create.mockResolvedValue({ ...mockProfile, isDefault: false, toPublicJSON: () => ({}) });

    const app = buildApp();
    await request(app).post('/api/profiles').send({ name: 'Filho' });

    const callArgs = UserProfile.create.mock.calls[0][0];
    expect(callArgs.isDefault).toBe(false);
  });
});

describe('PUT /api/profiles/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update profile fields', async () => {
    UserProfile.findOne.mockResolvedValue(mockProfile);

    const app = buildApp();
    const res = await request(app).put('/api/profiles/1').send({ weight: 78, height: 178 });

    expect(res.status).toBe(200);
    expect(mockProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 78, height: 178 })
    );
  });

  it('should return 404 if profile not found', async () => {
    UserProfile.findOne.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app).put('/api/profiles/999').send({ name: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/profiles/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete a non-default profile', async () => {
    const nonDefault = { ...mockProfile, isDefault: false, destroy: vi.fn().mockResolvedValue(true) };
    UserProfile.findOne.mockResolvedValue(nonDefault);

    const app = buildApp();
    const res = await request(app).delete('/api/profiles/2');

    expect(res.status).toBe(200);
    expect(nonDefault.destroy).toHaveBeenCalled();
  });

  it('should not allow deleting the default profile', async () => {
    UserProfile.findOne.mockResolvedValue(mockProfile); // isDefault: true

    const app = buildApp();
    const res = await request(app).delete('/api/profiles/1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/perfil principal/i);
  });

  it('should return 404 for non-existent profile', async () => {
    UserProfile.findOne.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app).delete('/api/profiles/999');

    expect(res.status).toBe(404);
  });
});
