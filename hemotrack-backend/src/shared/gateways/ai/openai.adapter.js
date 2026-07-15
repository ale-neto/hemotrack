const axios = require('axios');
const pdfParse = require('pdf-parse');
const { PDF_EXTRACTION_PROMPT, normalizeExtractedExams, buildAnalysisPrompt } = require('./exam-taxonomy');

class OpenAIAdapter {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o-mini';
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
  }

  async extractExamFromPDF(base64PDF) {
    // A API de chat completions da OpenAI não aceita PDF nativamente (image_url é só
    // para imagens) — extrai o texto do PDF localmente e envia como prompt de texto.
    const { text } = await pdfParse(Buffer.from(base64PDF, 'base64'));

    const response = await this.client.post('/chat/completions', {
      model: this.model,
      messages: [
        { role: 'system', content: PDF_EXTRACTION_PROMPT },
        { role: 'user', content: `Texto extraído do PDF do exame de sangue:\n\n${text}` },
      ],
      temperature: 0.1,
    });

    const content = response.data.choices[0].message.content;
    const clean = content.replace(/```json|```/g, '').trim();
    return normalizeExtractedExams(JSON.parse(clean));
  }

  async analyzeExamHistory(profile, examType, results) {
    const prompt = buildAnalysisPrompt(profile, examType, results);
    const response = await this.client.post('/chat/completions', {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });
    return response.data.choices[0].message.content;
  }
}

module.exports = OpenAIAdapter;
