import { vi } from 'vitest';

// ── Mock Sequelize / Database ──────────────────────────────────────────────────
vi.mock('../src/database/index.js', () => ({
  default: {
    authenticate: vi.fn().mockResolvedValue(true),
    sync: vi.fn().mockResolvedValue(true),
    define: vi.fn(),
  },
}));

// ── Mock Socket.IO ─────────────────────────────────────────────────────────────
vi.mock('../src/socket/socketServer.js', () => ({
  initSocket: vi.fn(),
  emitToUser: vi.fn(),
  emitExtractionProgress: vi.fn(),
  emitExtractionComplete: vi.fn(),
  emitExtractionError: vi.fn(),
}));

// ── ENV defaults ───────────────────────────────────────────────────────────────
process.env.JWT_SECRET = 'test_secret_32_characters_minimum_here';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex
process.env.NODE_ENV = 'test';
