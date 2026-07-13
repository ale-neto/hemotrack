/** Resultado de exame com status calculado (normal/low/high/sem_referência). */
function toPublicResult(result) {
  return { ...result.toJSON(), status: result.getStatus() };
}

/** Forma usada em listagem/criação/edição — sem status por resultado. */
function toExamSummary(exam) {
  return exam.toJSON();
}

/** Forma usada no detalhe — resultados com status calculado. */
function toExamDetail(exam) {
  const data = exam.toJSON();
  data.ExamResults = (exam.ExamResults || []).map(toPublicResult);
  return data;
}

module.exports = { toPublicResult, toExamSummary, toExamDetail };
