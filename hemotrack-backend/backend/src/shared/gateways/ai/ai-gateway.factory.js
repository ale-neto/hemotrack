const GeminiAdapter = require('./gemini.adapter');
const OpenAIAdapter = require('./openai.adapter');
const ClaudeAdapter = require('./claude.adapter');
const { decrypt } = require('../../../services/encryption.service');

function getAdapter(settings) {
  const apiKey = decrypt(settings.aiApiKey);
  if (!apiKey) throw new Error('API Key de IA não configurada. Configure em Ajustes.');

  switch (settings.aiProvider) {
    case 'openai':
      return new OpenAIAdapter(apiKey, settings.aiModel || 'gpt-4o-mini');
    case 'claude':
      return new ClaudeAdapter(apiKey, settings.aiModel || 'claude-3-haiku-20240307');
    case 'gemini':
    default:
      return new GeminiAdapter(apiKey, settings.aiModel || 'gemini-1.5-flash-latest');
  }
}

module.exports = { getAdapter };
