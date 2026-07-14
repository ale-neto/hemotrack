const axios = require('axios');
const { PDF_EXTRACTION_PROMPT, normalizeExtractedExams, buildAnalysisPrompt } = require('./exam-taxonomy');

class GeminiAdapter {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'gemini-2.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1';
  }

  async extractExamFromPDF(base64PDF) {
    const response = await axios.post(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        contents: [{
          parts: [
            { text: PDF_EXTRACTION_PROMPT },
            { inline_data: { mime_type: 'application/pdf', data: base64PDF } },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    return normalizeExtractedExams(JSON.parse(clean));
  }

  async analyzeExamHistory(profile, examType, results) {
    const prompt = buildAnalysisPrompt(profile, examType, results);
    const response = await axios.post(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }
    );
    return response.data.candidates[0].content.parts[0].text;
  }
}

module.exports = GeminiAdapter;
