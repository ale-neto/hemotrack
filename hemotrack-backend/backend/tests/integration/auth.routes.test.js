import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock models
const mockUser = {
  id: 1,
  name: 'João Silva',
  email: 'joao@test.com',
  passwordHash: '$2b$12$hashedpassword',
  toJSON: () => ({ id: 1, name: 'João Silva', email: 'joao@test.com' }),
};

vi.mock('../../src/models/index.js', () => ({
  User: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
  UserProfile: { create: vi.fn() },
  UserSettings: { create: vi.fn() },
}));

vi.mock('../../src/services/auth.service.js', () => ({
  generateToken: vi.fn(() => 'mock.jwt.token'),
  hashPassword: vi.fn(async (p) => `hashed_${p}`),
  comparePassword: vi.fn(),
}));

import { User, UserProfile, UserSettings } from '../../src/models/index.js';
import { generateToken, hashPassword, comparePassword } from '../../src/services/auth.service.js';
import authRoutes from '../../src/routes/auth.routes.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(mockUser);
    UserProfile.create.mockResolvedValue({});
    UserSettings.create.mockResolvedValue({});
  });

  it('should register a new user and return token', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      name: 'João Silva',
      email: 'joao@test.com',
      password: 'senha123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe('mock.jwt.token');
    expect(res.body.user.email).toBe('joao@test.com');
  });

  it('should return 409 if email already registered', async () => {
    User.findOne.mockResolvedValue(mockUser);
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      name: 'João Silva',
      email: 'joao@test.com',
      password: 'senha123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/já cadastrado/i);
  });

  it('should return 400 for invalid email', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'not-an-email',
      password: 'senha123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for password shorter than 6 chars', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'test@test.com',
      password: '123',
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 if name is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@test.com',
      password: 'senha123',
    });

    expect(res.status).toBe(400);
  });

  it('should create a default profile and settings on register', async () => {
    const app = buildApp();
    await request(app).post('/api/auth/register').send({
      name: 'João Silva',
      email: 'joao@test.com',
      password: 'senha123',
    });

    expect(UserProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, isDefault: true, relationship: 'titular' })
    );
    expect(UserSettings.create).toHaveBeenCalledWith({ userId: 1 });
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login and return token for valid credentials', async () => {
    User.findOne.mockResolvedValue(mockUser);
    comparePassword.mockResolvedValue(true);

    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'joao@test.com',
      password: 'senha123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe('mock.jwt.token');
  });

  it('should return 401 for non-existent user', async () => {
    User.findOne.mockResolvedValue(null);
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'naoexiste@test.com',
      password: 'senha123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credenciais inválidas/i);
  });

  it('should return 401 for wrong password', async () => {
    User.findOne.mockResolvedValue(mockUser);
    comparePassword.mockResolvedValue(false);

    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'joao@test.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });

  it('should not expose passwordHash in response', async () => {
    User.findOne.mockResolvedValue(mockUser);
    comparePassword.mockResolvedValue(true);

    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'joao@test.com',
      password: 'senha123',
    });

    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('hashed');
  });
});
