import { Marker } from '../models/exam.model';

export interface ManualResultRow {
  markerName: string;
  value: number | null;
  unit: string;
  refMin: number | null;
  refMax: number | null;
}

/** Deriva as linhas editáveis do formulário manual a partir dos marcadores do tipo de exame escolhido. */
export function markersToResultRows(markers: Marker[]): ManualResultRow[] {
  return markers.map(m => ({ markerName: m.name, value: null, unit: m.unit, refMin: m.refMin, refMax: m.refMax }));
}

export interface ManualExamFormValue {
  profileId: number | null;
  examTypeId: number | null;
  examDate: Date | string | null;
  labName: string | null;
  notes: string | null;
}

/** Monta o payload de criação de exame a partir do valor do formulário + linhas de resultado preenchidas. */
export function buildManualExamPayload(form: ManualExamFormValue, results: ManualResultRow[]) {
  const examDate = form.examDate instanceof Date
    ? form.examDate.toISOString().split('T')[0]
    : form.examDate;

  return {
    profileId: form.profileId,
    examTypeId: form.examTypeId,
    examDate,
    labName: form.labName || null,
    notes: form.notes || null,
    results: results.filter(r => r.value !== null),
  };
}
