import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock auth middleware — always authenticates as user id=1
vi.mock('../../src/middleware/auth.middleware.js', () => ({
  default: (req, _res, next) => {
    req.user = { id: 1, name: 'João', email: 'joao@test.com' };
    next();
  },
}));

vi.mock('../../src/middleware/upload.middleware.js', () => ({
  default: { single: () => (req, _res, next) => next() },
}));

vi.mock('../../src/socket/socketServer.js', () => ({
  emitExtractionProgress: vi.fn(),
  emitExtractionComplete: vi.fn(),
  emitExtractionError: vi.fn(),
}));

const mockExamType = { id: 1, name: 'Hemograma Completo', category: 'Hematologia' };
const mockProfile = { id: 1, name: 'João', userId: 1 };

const mockResult = {
  id: 1,
  examId: 1,
  markerName: 'Hemoglobina',
  value: 14.2,
  unit: 'g/dL',
  refMin: 12.0,
  refMax: 16.0,
  getStatus: () => 'normal',
  toPublicJSON: () => ({ id: 1, markerName: 'Hemoglobina', value: 14.2, unit: 'g/dL', status: 'normal' }),
};

const mockExam = {
  id: 1,
  profileId: 1,
  examTypeId: 1,
  examDate: '2024-06-01',
  origin: 'manual',
  labName: 'Lab X',
  notes: null,
  status: 'completed',
  ExamType: mockExamType,
  UserProfile: mockProfile,
  ExamResults: [mockResult],
  toJSON: () => ({ id: 1, examDate: '2024-06-01', labName: 'Lab X' }),
  update: vi.fn().mockResolvedValue(true),
  destroy: vi.fn().mockResolvedValue(true),
};

vi.mock('../../src/models/index.js', () => ({
  BloodExam: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
  ExamResult: {
    bulkCreate: vi.fn(),
    destroy: vi.fn(),
  },
  ExamType: { findByPk: vi.fn() },
  UserProfile: { findAll: vi.fn(), findOne: vi.fn() },
  UserSettings: { findOne: vi.fn() },
}));

import { BloodExam, ExamResult, UserProfile } from '../../src/models/index.js';
import examRoutes from '../../src/modules/exams/exam.routes.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  const authMock = (req, res, next) => { req.user = { id: 1 }; next(); };
  app.use('/api/exams', authMock, examRoutes); // não funciona pq o route já registra o middleware interno
  app.use((err, req, res, next) => res.status(500).json({ success: false, error: err.message }));
  return app;
};

describe('GET /api/exams', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return list of exams for authenticated user', async () => {
    UserProfile.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    BloodExam.findAll.mockResolvedValue([mockExam]);

    const app = buildApp();
    const res = await request(app).get('/api/exams');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should filter by profileId when provided', async () => {
    UserProfile.findAll.mockResolvedValue([{ id: 1 }]);
    BloodExam.findAll.mockResolvedValue([mockExam]);

    const app = buildApp();
    await request(app).get('/api/exams?profileId=1');

    const callArgs = BloodExam.findAll.mock.calls[0][0];
    expect(callArgs.where.profileId).toBe('1');
  });

  it('should filter by examTypeId when provided', async () => {
    UserProfile.findAll.mockResolvedValue([{ id: 1 }]);
    BloodExam.findAll.mockResolvedValue([]);

    const app = buildApp();
    await request(app).get('/api/exams?examTypeId=2');

    const callArgs = BloodExam.findAll.mock.calls[0][0];
    expect(callArgs.where.examTypeId).toBe('2');
  });
});

describe('GET /api/exams/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return a single exam with results', async () => {
    BloodExam.findOne.mockResolvedValue(mockExam);

    const app = buildApp();
    const res = await request(app).get('/api/exams/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 if exam not found', async () => {
    BloodExam.findOne.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app).get('/api/exams/999');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/não encontrado/i);
  });
});

describe('POST /api/exams', () => {
  beforeEach(() => vi.clearAllMocks());

  const validPayload = {
    profileId: 1,
    examTypeId: 1,
    examDate: '2024-06-01',
    results: [
      { marker: 'Hemoglobina', value: 14.2, unit: 'g/dL', ref_min: 12.0, ref_max: 16.0 },
    ],
  };

  it('should create exam with results', async () => {
    UserProfile.findOne.mockResolvedValue(mockProfile);
    BloodExam.create.mockResolvedValue({ id: 1 });
    ExamResult.bulkCreate.mockResolvedValue([]);
    BloodExam.findByPk.mockResolvedValue(mockExam);

    const app = buildApp();
    const res = await request(app).post('/api/exams').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(BloodExam.create).toHaveBeenCalledTimes(1);
    expect(ExamResult.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('should return 403 if profile does not belong to user', async () => {
    UserProfile.findOne.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app).post('/api/exams').send(validPayload);

    expect(res.status).toBe(403);
  });

  it('should return 400 if results array is empty', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/exams').send({ ...validPayload, results: [] });

    expect(res.status).toBe(400);
  });

  it('should return 400 if examDate is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/exams').send({ ...validPayload, examDate: undefined });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/exams/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete an exam and return success', async () => {
    BloodExam.findOne.mockResolvedValue(mockExam);

    const app = buildApp();
    const res = await request(app).delete('/api/exams/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockExam.destroy).toHaveBeenCalled();
  });

  it('should return 404 for exam that does not belong to user', async () => {
    BloodExam.findOne.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app).delete('/api/exams/999');

    expect(res.status).toBe(404);
  });
});
