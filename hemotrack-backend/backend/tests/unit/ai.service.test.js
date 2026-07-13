const { describe, it, expect, vi } = require('vitest');

let getAdapter;

beforeAll(async () => {
  vi.doMock('../../src/services/encryption.service', () => ({
    decrypt: (v) => v,  // retorna como está
    encrypt: (v) => v,
  }));
  // Força reload do módulo
  const mod = await import('../../src/shared/gateways/ai/ai-gateway.factory.js?t=' + Date.now());
  getAdapter = mod.getAdapter;
});

// Mock the adapters
vi.mock('../../src/shared/gateways/ai/gemini.adapter.js', () => ({
  default: vi.fn().mockImplementation((apiKey, model) => ({
    provider: 'gemini', apiKey, model,
    extractExamFromPDF: vi.fn(),
    analyzeExamHistory: vi.fn(),
  })),
}));

vi.mock('../../src/shared/gateways/ai/openai.adapter.js', () => ({
  default: vi.fn().mockImplementation((apiKey, model) => ({
    provider: 'openai', apiKey, model,
    extractExamFromPDF: vi.fn(),
    analyzeExamHistory: vi.fn(),
  })),
}));

vi.mock('../../src/shared/gateways/ai/claude.adapter.js', () => ({
  default: vi.fn().mockImplementation((apiKey, model) => ({
    provider: 'claude', apiKey, model,
    extractExamFromPDF: vi.fn(),
    analyzeExamHistory: vi.fn(),
  })),
}));

// Mock encryption so decrypt returns the key as-is in tests
vi.mock('../../src/services/encryption.service.js', () => ({
  encrypt: vi.fn((v) => v),
  decrypt: vi.fn((v) => v),
}));

  import { getAdapter } from '../../src/shared/gateways/ai/ai-gateway.factory.js';

describe('ai.service - getAdapter', () => {
  const makeSettings = (provider, apiKey = 'test-api-key', model = null) => ({
    aiProvider: provider,
    aiApiKey: apiKey,
    aiModel: model,
  });

  it('should return GeminiAdapter for provider "gemini"', () => {
    const adapter = getAdapter(makeSettings('gemini'));
    expect(adapter.provider).toBe('gemini');
  });

  it('should return OpenAIAdapter for provider "openai"', () => {
    const adapter = getAdapter(makeSettings('openai'));
    expect(adapter.provider).toBe('openai');
  });

  it('should return ClaudeAdapter for provider "claude"', () => {
    const adapter = getAdapter(makeSettings('claude'));
    expect(adapter.provider).toBe('claude');
  });

  it('should default to gemini for unknown provider', () => {
    const adapter = getAdapter(makeSettings('unknown'));
    expect(adapter.provider).toBe('gemini');
  });

  it('should throw if apiKey is not configured', () => {
    expect(() => getAdapter(makeSettings('gemini', null))).toThrow('API Key de IA não configurada');
  });

  it('should use default gemini model when none specified', () => {
    const adapter = getAdapter(makeSettings('gemini'));
    expect(adapter.model).toBe('gemini-1.5-flash');
  });

  it('should use default openai model when none specified', () => {
    const adapter = getAdapter(makeSettings('openai'));
    expect(adapter.model).toBe('gpt-4o-mini');
  });

  it('should use custom model when specified', () => {
    const adapter = getAdapter(makeSettings('gemini', 'test-key', 'gemini-1.5-pro'));
    expect(adapter.model).toBe('gemini-1.5-pro');
  });

  it('should pass the decrypted api key to the adapter', () => {
    const adapter = getAdapter(makeSettings('gemini', 'encrypted-key'));
    expect(adapter.apiKey).toBe('encrypted-key'); // decrypt mock returns value as-is
  });

  it('should expose extractExamFromPDF method', () => {
    const adapter = getAdapter(makeSettings('gemini'));
    expect(typeof adapter.extractExamFromPDF).toBe('function');
  });

  it('should expose analyzeExamHistory method', () => {
    const adapter = getAdapter(makeSettings('claude'));
    expect(typeof adapter.analyzeExamHistory).toBe('function');
  });
});
