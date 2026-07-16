export type AiProvider = 'gemini' | 'openai' | 'claude';

export const AI_PROVIDER_OPTIONS: { label: string; value: AiProvider }[] = [
  { label: 'Gemini (Google)', value: 'gemini' },
  { label: 'OpenAI (ChatGPT)', value: 'openai' },
  { label: 'Claude (Anthropic)', value: 'claude' },
];

export const AI_MODEL_OPTIONS: Record<AiProvider, { label: string; value: string }[]> = {
  gemini: [
    { label: 'Gemini 2.5 Flash (rápido, grátis)', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro (avançado)', value: 'gemini-2.5-pro' },
  ],
  openai: [
    { label: 'GPT-4o Mini (econômico)', value: 'gpt-4o-mini' },
    { label: 'GPT-4o (avançado)', value: 'gpt-4o' },
  ],
  claude: [
    { label: 'Claude 3 Haiku (rápido)', value: 'claude-3-haiku-20240307' },
    { label: 'Claude 3.5 Sonnet (avançado)', value: 'claude-sonnet-4-6' },
  ],
};

export interface UserSettings {
  id: number;
  userId: number;
  aiProvider: AiProvider;
  aiApiKey: string | null;
  aiModel: string | null;
  theme: 'light' | 'dark';
  language: string;
}
