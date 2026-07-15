const axios = require('axios');
const { PDF_EXTRACTION_PROMPT, normalizeExtractedExams, buildAnalysisPrompt } = require('./exam-taxonomy');

class ClaudeAdapter {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'claude-3-haiku-20240307';
    this.client = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    });
  }

  async extractExamFromPDF(base64PDF) {
    const response = await this.client.post('/messages', {
      model: this.model,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PDF_EXTRACTION_PROMPT },
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64PDF } },
        ],
      }],
    });

    const text = response.data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    return normalizeExtractedExams(JSON.parse(clean));
  }

  async analyzeExamHistory(profile, examType, results) {
    const prompt = buildAnalysisPrompt(profile, examType, results);
    const response = await this.client.post('/messages', {
      model: this.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.data.content[0].text;
  }
}

module.exports = ClaudeAdapter;
