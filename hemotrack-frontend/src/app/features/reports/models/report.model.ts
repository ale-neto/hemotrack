import { BloodExam, ExamType, ResultStatus } from '@features/exams/models/exam.model';

export interface ReportSeries {
  name: string;
  unit: string;
  refMin: number | null;
  refMax: number | null;
  // status vem pronto do backend (ExamResult.getStatus()) — o frontend não deve
  // re-derivar normal/alto/baixo a partir de refMin/refMax, para não duplicar
  // essa regra de negócio em dois lugares.
  data: { date: string; value: number; examId: number; status: ResultStatus }[];
}

export interface ReportData {
  series: ReportSeries[];
  exams: BloodExam[];
  examType: ExamType;
}
