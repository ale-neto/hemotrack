const axios = require('axios');
const fs = require('fs');
const { buildAnalysisPrompt } = require('./gemini.adapter');

const PDF_EXTRACTION_SYSTEM = `Você é um especialista em análise de exames laboratoriais.
Analise o exame de sangue e retorne APENAS um JSON válido, sem markdown.
Formato: { "exam_type": string, "exam_date": "YYYY-MM-DD"|null, "lab_name": string|null, 
"results": [{ "marker": string, "value": number, "unit": string, "ref_min": number|null, "ref_max": number|null }] }`;

class OpenAIAdapter {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
  }

  async extractExamFromPDF(base64PDF) {
    const response = await this.client.post('/chat/completions', {
      model: this.model,
      messages: [
        { role: 'system', content: PDF_EXTRACTION_SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extraia os dados deste exame de sangue.' },
            { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64PDF}` } },
          ],
        },
      ],
      temperature: 0.1,
    });

    const text = response.data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
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
