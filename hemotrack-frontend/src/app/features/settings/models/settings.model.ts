export type AiProvider = 'gemini' | 'openai' | 'claude';

export interface UserSettings {
  id: number;
  userId: number;
  aiProvider: AiProvider;
  aiApiKey: string | null;
  aiModel: string | null;
  theme: 'light' | 'dark';
  language: string;
}
