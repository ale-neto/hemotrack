import { ExamType } from '@features/exams/models/exam.model';
import { Profile } from '@features/profiles/models/profile.model';

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
