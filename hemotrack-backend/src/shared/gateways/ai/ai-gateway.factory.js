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

  return withMedicalDisclaimer(adapter);
}

module.exports = { getAdapter };
