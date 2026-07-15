import { ResultStatus } from '@features/exams/models/exam.model';

/**
 * Única fonte de verdade para rótulo/cor por ResultStatus — usado tanto pelo
 * detalhe de exame (rótulo textual) quanto pelos gráficos de relatório (cor
 * dos pontos). Antes, reports.component.ts re-derivava normal/alto/baixo na
 * mão a partir de refMin/refMax, duplicando a regra que o backend já aplica
 * em ExamResult.getStatus() e expõe em `status`.
 */
export const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  normal: 'Normal',
  high: 'Alto',
  low: 'Baixo',
  sem_referência: 'Sem ref.',
};

export const RESULT_STATUS_COLORS: Record<ResultStatus, string> = {
  normal: '#16A34A',
  high: '#E8344A',
  low: '#2563EB',
  sem_referência: '#94A3B8',
};
