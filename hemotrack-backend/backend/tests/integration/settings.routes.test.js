import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../src/middleware/auth.middleware.js', () => ({
  default: (req, _res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

vi.mock('../../src/services/encryption.service.js', () => ({
  encrypt: vi.fn((v) => `enc_${v}`),
  decrypt: vi.fn((v) => v?.replace('enc_', '') ?? null),
}));

const mockSettings = {
  aiProvider: 'gemini',
  aiApiKey: 'enc_real-api-key',
  aiModel: 'gemini-1.5-flash',
  theme: 'light',
  language: 'pt-BR',
  toJSON: () => ({ aiProvider: 'gemini', aiApiKey: 'enc_real-api-key', theme: 'light' }),
  update: vi.fn().mockResolvedValue(true),
};

vi.mock('../../src/models/index.js', () => ({
  UserSettings: { findOne: vi.fn() },
  ExamType: { findAll: vi.fn(), create: vi.fn(), findOne: vi.fn() },
  ExamReminder: { findAll: vi.fn(), create: vi.fn(), findOne: vi.fn() },
  UserProfile: { findAll: vi.fn(), findOne: vi.fn() },
}));

import { UserSettings, ExamType, ExamReminder, UserProfile } from '../../src/models/index.js';
import { encrypt } from '../../src/services/encryption.service.js';
import { settingsRouter, examTypeRouter, reminderRouter } from '../../src/routes/settings.routes.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/settings', settingsRouter);
  app.use('/api/exam-types', examTypeRouter);
  app.use('/api/reminders', reminderRouter);
  app.use((err, req, res, next) => res.status(500).json({ success: false, error: err.message }));
  return app;
};

// ─── SETTINGS ──────────────────────────────────────────────────────────────────
describe('GET /api/settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return settings without exposing the real api key', async () => {
    UserSettings.findOne.mockResolvedValue(mockSettings);

    const app = buildApp();
    const res = await request(app).get('/api/settings');

    expect(res.status).toBe(200);
    expect(res.body.data.aiApiKey).toBe('***configured***');
    expect(res.body.data.aiApiKey).not.toContain('real-api-key');
  });

  it('should return null for aiApiKey when not set', async () => {
    UserSettings.findOne.mockResolvedValue({ ...mockSettings, aiApiKey: null, toJSON: () => ({ aiApiKey: null }) });

    const app = buildApp();
    const res = await request(app).get('/api/settings');

    expect(res.body.data.aiApiKey).toBeNull();
  });
});

describe('PUT /api/settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update settings and encrypt new api key', async () => {
    UserSettings.findOne.mockResolvedValue(mockSettings);

    const app = buildApp();
    const res = await request(app).put('/api/settings').send({
      aiProvider: 'openai',
      aiApiKey: 'sk-new-key',
      theme: 'dark',
    });

    expect(res.status).toBe(200);
    expect(encrypt).toHaveBeenCalledWith('sk-new-key');
    expect(mockSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({ aiProvider: 'openai', aiApiKey: 'enc_sk-new-key' })
    );
  });

  it('should not re-encrypt if key is unchanged placeholder', async () => {
    UserSettings.findOne.mockResolvedValue(mockSettings);

    const app = buildApp();
    await request(app).put('/api/settings').send({ aiApiKey: '***configured***' });

    // encrypt should NOT be called for the placeholder value
    expect(encrypt).not.toHaveBeenCalled();
  });
});

// ─── EXAM TYPES ────────────────────────────────────────────────────────────────
describe('GET /api/exam-types', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return system types and user custom types', async () => {
    const systemType = { id: 1, name: 'Hemograma', isSystem: true };
    const customType = { id: 10, name: 'Meu Exame', isSystem: false, userId: 1 };
    ExamType.findAll.mockResolvedValue([systemType, customType]);

    const app = buildApp();
    const res = await request(app).get('/api/exam-types');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('POST /api/exam-types', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a custom exam type', async () => {
    const created = { id: 11, name: 'Teste Custom', isSystem: false, userId: 1, markers: [] };
    ExamType.create.mockResolvedValue(created);

    const app = buildApp();
    const res = await request(app).post('/api/exam-types').send({ name: 'Teste Custom', category: 'Outro' });

    expect(res.status).toBe(201);
    expect(ExamType.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Teste Custom', isSystem: false, userId: 1 })
    );
  });

  it('should return 400 if name is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/exam-types').send({ category: 'Outro' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/exam-types/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete a custom type owned by user', async () => {
    const customType = { id: 10, isSystem: false, userId: 1, destroy: vi.fn().mockResolvedValue(true) };
    ExamType.findOne.mockResolvedValue(customType);

    const app = buildApp();
    const res = await request(app).delete('/api/exam-types/10');

    expect(res.status).toBe(200);
    expect(customType.destroy).toHaveBeenCalled();
  });

  it('should return 404 when trying to delete a system type', async () => {
    ExamType.findOne.mockResolvedValue(null); // isSystem=false filter excludes it

    const app = buildApp();
    const res = await request(app).delete('/api/exam-types/1');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/não pode ser removido/i);
  });
});

// ─── REMINDERS ────────────────────────────────────────────────────────────────
describe('GET /api/reminders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return active reminders with nextDueDate', async () => {
    UserProfile.findAll.mockResolvedValue([{ id: 1 }]);
    const reminder = {
      id: 1,
      profileId: 1,
      examTypeId: 1,
      intervalMonths: 6,
      lastExamDate: '2024-01-01',
      isActive: true,
      toJSON: () => ({ id: 1, profileId: 1, intervalMonths: 6 }),
      getNextDueDate: () => '2024-07-01',
      isOverdue: () => true,
    };
    ExamReminder.findAll.mockResolvedValue([reminder]);

    const app = buildApp();
    const res = await request(app).get('/api/reminders');

    expect(res.status).toBe(200);
    expect(res.body.data[0].nextDueDate).toBe('2024-07-01');
    expect(res.body.data[0].isOverdue).toBe(true);
  });
});

describe('POST /api/reminders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a reminder for a valid profile', async () => {
    UserProfile.findOne.mockResolvedValue({ id: 1, userId: 1 });
    ExamReminder.create.mockResolvedValue({ id: 1, profileId: 1, examTypeId: 2, intervalMonths: 6 });

    const app = buildApp();
    const res = await request(app).post('/api/reminders').send({
      profileId: 1,
      examTypeId: 2,
      intervalMonths: 6,
    });

    expect(res.status).toBe(201);
    expect(ExamReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 1, examTypeId: 2, intervalMonths: 6 })
    );
  });

  it('should return 403 for profile not belonging to user', async () => {
    UserProfile.findOne.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app).post('/api/reminders').send({ profileId: 99, examTypeId: 1, intervalMonths: 3 });

    expect(res.status).toBe(403);
  });
});
