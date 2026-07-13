// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

// ── Profile ──────────────────────────────────────────────────────────────────
export interface Profile {
  id: number;
  userId: number;
  name: string;
  relationship: 'titular' | 'cônjuge' | 'filho(a)' | 'pai' | 'mãe' | 'outro';
  birthDate: string | null;
  sex: 'masculino' | 'feminino' | 'outro' | null;
  weight: number | null;
  height: number | null;
  diseases: string[];
  medications: string[];
  isDefault: boolean;
  bmi?: number | null;
  age?: number | null;
}

// ── Exam Type ────────────────────────────────────────────────────────────────
export interface Marker {
  name: string;
  unit: string;
  refMin: number | null;
  refMax: number | null;
  description?: string;
}

export interface ExamType {
  id: number;
  name: string;
  category: string | null;
  isSystem: boolean;
  userId: number | null;
  markers: Marker[];
}

// ── Exam ─────────────────────────────────────────────────────────────────────
export type ExamStatus = 'pending' | 'processing' | 'completed';
export type ResultStatus = 'normal' | 'high' | 'low' | 'sem_referencia';

export interface ExamResult {
  id: number;
  examId: number;
  markerName: string;
  value: number;
  unit: string | null;
  refMin: number | null;
  refMax: number | null;
  status: ResultStatus;
}

export interface BloodExam {
  id: number;
  profileId: number;
  examTypeId: number;
  examDate: string;
  origin: 'manual' | 'pdf_extracted';
  labName: string | null;
  notes: string | null;
  status: ExamStatus;
  shareToken: string | null;
  ExamType?: ExamType;
  ExamResults?: ExamResult[];
  UserProfile?: Profile;
}

// ── Report ───────────────────────────────────────────────────────────────────
export interface ReportSeries {
  name: string;
  unit: string;
  refMin: number | null;
  refMax: number | null;
  data: { date: string; value: number; examId: number }[];
}

export interface ReportData {
  series: ReportSeries[];
  exams: BloodExam[];
  examType: ExamType;
}

// ── Settings ─────────────────────────────────────────────────────────────────
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

// ── Reminder ─────────────────────────────────────────────────────────────────
export interface ExamReminder {
  id: number;
  profileId: number;
  examTypeId: number;
  intervalMonths: number;
  lastExamDate: string | null;
  isActive: boolean;
  nextDueDate?: string | null;
  isOverdue?: boolean;
  ExamType?: ExamType;
  UserProfile?: Profile;
}

// ── API Generic ───────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: { msg: string; path: string }[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number;
}
