const GeminiAdapter = require('./gemini.adapter');
const OpenAIAdapter = require('./openai.adapter');
const ClaudeAdapter = require('./claude.adapter');
const { decrypt } = require('../../../services/encryption.service');

const MEDICAL_DISCLAIMER = 'Esta análise é gerada por IA e é apenas informativa — não substitui avaliação, diagnóstico ou consulta médica profissional.';

function hasDisclaimer(text) {
  const normalized = text.toLowerCase();
  return normalized.includes('não substitui') && normalized.includes('médic');
}

/** Garante o aviso médico na resposta, independente do provedor/modelo ter seguido a instrução do prompt. */
function withMedicalDisclaimer(adapter) {
  const original = adapter.analyzeExamHistory.bind(adapter);
  adapter.analyzeExamHistory = async (...args) => {
    const text = await original(...args);
    return hasDisclaimer(text) ? text : `${text}\n\n${MEDICAL_DISCLAIMER}`;
  };
  return adapter;
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED']);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function isRetryable(err) {
  const status = err.response?.status;
  if (status) return RETRYABLE_STATUS.has(status);
  return RETRYABLE_CODES.has(err.code);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries(fn, args) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn(...args);
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_RETRIES || !isRetryable(err)) throw err;
      console.warn(`⚠️ Chamada de IA falhou (tentativa ${attempt + 1}/${MAX_RETRIES + 1}, status ${err.response?.status || err.code}), tentando de novo...`);
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

/** Tenta novamente automaticamente em erros transitórios do provedor (502/503/504, timeout de rede). */
function withResilience(adapter) {
  const originalExtract = adapter.extractExamFromPDF.bind(adapter);
  const originalAnalyze = adapter.analyzeExamHistory.bind(adapter);
  adapter.extractExamFromPDF = (...args) => withRetries(originalExtract, args);
  adapter.analyzeExamHistory = (...args) => withRetries(originalAnalyze, args);
  return adapter;
}

function getAdapter(settings) {
  const apiKey = decrypt(settings.aiApiKey);
  if (!apiKey) throw new Error('API Key de IA não configurada. Configure em Ajustes.');

  let adapter;
  switch (settings.aiProvider) {
    case 'openai':
      adapter = new OpenAIAdapter(apiKey, settings.aiModel || 'gpt-4o-mini');
      break;
    case 'claude':
      adapter = new ClaudeAdapter(apiKey, settings.aiModel || 'claude-3-haiku-20240307');
      break;
    case 'gemini':
    default:
      adapter = new GeminiAdapter(apiKey, settings.aiModel || 'gemini-2.5-flash');
  }

  return withMedicalDisclaimer(withResilience(adapter));
}

module.exports = { getAdapter };
