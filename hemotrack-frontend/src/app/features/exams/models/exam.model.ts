import { Profile } from '@features/profiles/models/profile.model';

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

export type ExamStatus = 'pending' | 'processing' | 'completed' | 'failed';
// Precisa bater exatamente com ExamResult.getStatus() no backend (models/index.js),
// que retorna 'sem_referência' (com acento) — não 'sem_referencia'.
export type ResultStatus = 'normal' | 'high' | 'low' | 'sem_referência';

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
