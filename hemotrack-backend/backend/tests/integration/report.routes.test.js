import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../src/middleware/auth.middleware.js', () => ({
  default: (req, _res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

vi.mock('../../src/services/ai.service.js', () => ({
  getAdapter: vi.fn(() => ({
    analyzeExamHistory: vi.fn().mockResolvedValue(
      'Análise: Os exames estão dentro dos parâmetros normais. Manter acompanhamento periódico.'
    ),
  })),
}));

const makeResult = (name, value, unit, refMin, refMax) => ({
  markerName: name, value, unit, refMin, refMax,
  getStatus: () => (value < refMin ? 'low' : value > refMax ? 'high' : 'normal'),
  toPublicJSON: () => ({ markerName: name, value, unit, status: 'normal' }),
});

const mockExamType = { id: 1, name: 'Hemograma Completo', category: 'Hematologia', markers: [] };

const mockExams = [
  {
    id: 1, examDate: '2024-01-10', labName: 'Lab A', status: 'completed',
    ExamType: mockExamType,
    UserProfile: { id: 1, userId: 1 },
    ExamResults: [makeResult('Hemoglobina', 14.2, 'g/dL', 12, 16)],
  },
  {
    id: 2, examDate: '2024-06-15', labName: 'Lab B', status: 'completed',
    ExamType: mockExamType,
    UserProfile: { id: 1, userId: 1 },
    ExamResults: [makeResult('Hemoglobina', 13.1, 'g/dL', 12, 16)],
  },
];

vi.mock('../../src/models/index.js', () => ({
  BloodExam: { findAll: vi.fn() },
  ExamResult: {},
  ExamType: { findByPk: vi.fn() },
  UserProfile: { findOne: vi.fn() },
  UserSettings: { findOne: vi.fn() },
}));

import { BloodExam, ExamType, UserProfile, UserSettings } from '../../src/models/index.js';
import { getAdapter } from '../../src/services/ai.service.js';
import reportRoutes from '../../src/routes/report.routes.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/reports', reportRoutes);
  app.use((err, req, res, next) => res.status(500).json({ success: false, error: err.message }));
  return app;
};

describe('GET /api/reports/:examTypeId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return comparative data with series grouped by marker', async () => {
    BloodExam.findAll.mockResolvedValue(mockExams);

    const app = buildApp();
    const res = await request(app).get('/api/reports/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.series).toBeDefined();
    expect(Array.isArray(res.body.data.series)).toBe(true);
  });

  it('should group data points by marker name', async () => {
    BloodExam.findAll.mockResolvedValue(mockExams);

    const app = buildApp();
    const res = await request(app).get('/api/reports/1');

    const hemoglobinaSeries = res.body.data.series.find(s => s.name === 'Hemoglobina');
    expect(hemoglobinaSeries).toBeDefined();
    expect(hemoglobinaSeries.data).toHaveLength(2);
    expect(hemoglobinaSeries.data[0].value).toBe(14.2);
    expect(hemoglobinaSeries.data[1].value).toBe(13.1);
  });

  it('should return empty series when no exams found', async () => {
    BloodExam.findAll.mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app).get('/api/reports/99');

    expect(res.status).toBe(200);
    expect(res.body.data.series).toHaveLength(0);
    expect(res.body.data.exams).toHaveLength(0);
  });

  it('should include refMin and refMax in series for chart reference lines', async () => {
    BloodExam.findAll.mockResolvedValue(mockExams);

    const app = buildApp();
    const res = await request(app).get('/api/reports/1');

    const series = res.body.data.series[0];
    expect(series.refMin).toBe(12);
    expect(series.refMax).toBe(16);
  });
});

describe('POST /api/reports/:examTypeId/analyze', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return AI analysis for exam history', async () => {
    UserProfile.findOne.mockResolvedValue({ id: 1, name: 'João', toPublicJSON: () => ({ id: 1, name: 'João', age: 34 }) });
    UserSettings.findOne.mockResolvedValue({ aiProvider: 'gemini', aiApiKey: 'enc_key' });
    ExamType.findByPk.mockResolvedValue(mockExamType);
    BloodExam.findAll.mockResolvedValue(mockExams);

    const app = buildApp();
    const res = await request(app).post('/api/reports/1/analyze').send({ profileId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.analysis).toContain('Análise');
    expect(res.body.data.generatedAt).toBeDefined();
  });

  it('should return 400 when AI API key is not configured', async () => {
    UserProfile.findOne.mockResolvedValue({ id: 1, toPublicJSON: () => ({}) });
    UserSettings.findOne.mockResolvedValue({ aiProvider: 'gemini', aiApiKey: null });

    const app = buildApp();
    const res = await request(app).post('/api/reports/1/analyze').send({ profileId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/api key/i);
  });

  it('should return 400 if no exams found for analysis', async () => {
    UserProfile.findOne.mockResolvedValue({ id: 1, toPublicJSON: () => ({}) });
    UserSettings.findOne.mockResolvedValue({ aiProvider: 'gemini', aiApiKey: 'enc_key' });
    ExamType.findByPk.mockResolvedValue(mockExamType);
    BloodExam.findAll.mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app).post('/api/reports/1/analyze').send({ profileId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nenhum exame/i);
  });

  it('should return 404 if profile not found or not owned by user', async () => {
    UserProfile.findOne.mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app).post('/api/reports/1/analyze').send({ profileId: 99 });

    expect(res.status).toBe(404);
  });

  it('should pass profile and exam history to AI adapter', async () => {
    const profileData = { id: 1, name: 'João', age: 34, sex: 'masculino' };
    UserProfile.findOne.mockResolvedValue({ id: 1, toPublicJSON: () => profileData });
    UserSettings.findOne.mockResolvedValue({ aiProvider: 'gemini', aiApiKey: 'enc_key' });
    ExamType.findByPk.mockResolvedValue(mockExamType);
    BloodExam.findAll.mockResolvedValue(mockExams);

    const app = buildApp();
    await request(app).post('/api/reports/1/analyze').send({ profileId: 1 });

    const adapter = getAdapter.mock.results[0].value;
    expect(adapter.analyzeExamHistory).toHaveBeenCalledWith(
      profileData,
      'Hemograma Completo',
      expect.arrayContaining([expect.objectContaining({ examDate: '2024-01-10' })])
    );
  });
});
