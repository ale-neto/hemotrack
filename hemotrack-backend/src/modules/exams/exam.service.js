const fs = require('fs');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const repository = require('./exam.repository');
const mapper = require('./exam.mapper');
const { getAdapter } = require('../../shared/gateways/ai/ai-gateway.factory');
const { emitExtractionProgress, emitExtractionComplete, emitExtractionError } = require('../../socket/socketServer');

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function listExams(userId, filters) {
  const { profileId, examTypeId, startDate, endDate } = filters;
  const profileIds = await repository.findProfileIdsForUser(userId);

  const where = { profileId: profileIds };
  if (profileId) where.profileId = profileId;
  if (examTypeId) where.examTypeId = examTypeId;
  if (startDate || endDate) {
    where.examDate = {};
    if (startDate) where.examDate[Op.gte] = startDate;
    if (endDate) where.examDate[Op.lte] = endDate;
  }

  const exams = await repository.findExams(where);
  return exams.map(mapper.toExamSummary);
}

async function getExamDetail(examId, userId) {
  const exam = await repository.findExamDetailOwnedByUser(examId, userId);
  if (!exam) throw httpError('Exame não encontrado', 404);
  return mapper.toExamDetail(exam);
}

async function createExam(userId, payload) {
  const { profileId, examTypeId, examDate, labName, notes, origin, results } = payload;

  const profile = await repository.findProfileForUser(profileId, userId);
  if (!profile) throw httpError('Perfil não encontrado', 403);

  const exam = await repository.createExam({
    profileId,
    examTypeId,
    examDate,
    labName,
    notes,
    origin: origin || 'manual',
    status: 'completed',
  });

  const examResults = results.map((r) => ({
    examId: exam.id,
    markerName: r.marker || r.markerName,
    value: parseFloat(r.value),
    unit: r.unit || null,
    refMin: r.ref_min !== undefined ? r.ref_min : r.refMin,
    refMax: r.ref_max !== undefined ? r.ref_max : r.refMax,
  }));

  await repository.bulkCreateResults(examResults);
  const fullExam = await repository.findExamWithResults(exam.id);
  return mapper.toExamSummary(fullExam);
}

async function updateExam(examId, userId, payload) {
  const exam = await repository.findExamOwnedByUser(examId, userId);
  if (!exam) throw httpError('Exame não encontrado', 404);

  const { examDate, labName, notes, results } = payload;
  await repository.updateExam(exam, { examDate, labName, notes });

  if (results && Array.isArray(results)) {
    await repository.destroyResultsForExam(exam.id);
    await repository.bulkCreateResults(results.map((r) => ({
      examId: exam.id,
      markerName: r.markerName,
      value: parseFloat(r.value),
      unit: r.unit,
      refMin: r.refMin,
      refMax: r.refMax,
    })));
  }

  const updated = await repository.findExamWithResults(exam.id);
  return mapper.toExamSummary(updated);
}

async function deleteExam(examId, userId) {
  const exam = await repository.findExamOwnedByUser(examId, userId);
  if (!exam) throw httpError('Exame não encontrado', 404);
  await repository.destroyExam(exam);
}

async function startPdfExtraction(userId, profileId, file) {
  const profile = await repository.findProfileForUser(profileId, userId);
  if (!profile) throw httpError('Perfil não encontrado', 403);

  const settings = await repository.findSettingsForUser(userId);
  if (!settings?.aiApiKey) throw httpError('API Key de IA não configurada', 400);

  const exam = await repository.createExam({
    profileId,
    examTypeId: null,
    examDate: new Date().toISOString().split('T')[0],
    origin: 'pdf_extracted',
    status: 'pending',
  });

  processPdfExtractionInBackground(exam, profileId, file, settings, userId);

  return mapper.toExamSummary(exam);
}

/** Extração assíncrona em background — roda após a resposta HTTP já ter sido enviada, comunicando progresso via Socket.IO. */
function processPdfExtractionInBackground(exam, profileId, file, settings, userId) {
  (async () => {
    try {
      emitExtractionProgress(userId, exam.id, 'Lendo PDF...', 20);
      const adapter = getAdapter(settings);
      const fileBuffer = fs.readFileSync(file.path);
      const base64PDF = fileBuffer.toString('base64');

      const extractedExams = await adapter.extractExamFromPDF(base64PDF);
      emitExtractionProgress(userId, exam.id, 'Salvando resultados...', 60);

      for (let i = 0; i < extractedExams.length; i++) {
        const result = extractedExams[i];

        let examType = await repository.findExamTypeByName(result.exam_type);
        if (!examType) {
          examType = await repository.createExamType({ name: result.exam_type, category: 'Outros', markers: [] });
        }

        const validResults = (result.results || []).filter((r) =>
          (r.marker || r.markerName) && r.value !== null && r.value !== undefined
        );

        if (i === 0) {
          await repository.updateExam(exam, {
            examTypeId: examType.id,
            examDate: result.exam_date || new Date().toISOString().split('T')[0],
            labName: result.lab_name || null,
            status: 'completed',
          });
          await repository.bulkCreateResults(validResults.map((r) => ({
            examId: exam.id,
            markerName: r.marker || r.markerName,
            value: r.value,
            unit: r.unit ?? null,
            refMin: r.ref_min ?? r.refMin ?? null,
            refMax: r.ref_max ?? r.refMax ?? null,
          })));
        } else {
          const newExam = await repository.createExam({
            profileId,
            examTypeId: examType.id,
            examDate: result.exam_date || new Date().toISOString().split('T')[0],
            labName: result.lab_name || null,
            origin: 'pdf_extracted',
            status: 'completed',
          });
          await repository.bulkCreateResults(validResults.map((r) => ({
            examId: newExam.id,
            markerName: r.marker || r.markerName,
            value: r.value,
            unit: r.unit ?? null,
            refMin: r.ref_min ?? r.refMin ?? null,
            refMax: r.ref_max ?? r.refMax ?? null,
          })));
        }

        emitExtractionProgress(
          userId, exam.id,
          `Salvando ${result.exam_type}...`,
          60 + Math.round((i + 1) / extractedExams.length * 35)
        );
      }

      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      const fullExam = await repository.findExamWithResults(exam.id);
      emitExtractionComplete(userId, exam.id, fullExam);
    } catch (err) {
      console.error('❌ Extraction error:', err.message, err.parent?.detail || '');
      // Best-effort: um job em background nunca pode derrubar o processo por causa
      // de uma falha secundária ao tentar registrar a falha original.
      try {
        await repository.updateExam(exam, { status: 'failed' });
        emitExtractionError(userId, exam.id, err.message);
      } catch (innerErr) {
        console.error('❌ Failed to record extraction failure:', innerErr.message);
      }
    }
  })();
}

async function shareExam(examId, userId, expiresInHours = 24) {
  const exam = await repository.findExamOwnedByUser(examId, userId);
  if (!exam) throw httpError('Exame não encontrado', 404);

  const shareToken = uuidv4();
  const shareExpiresAt = new Date(Date.now() + expiresInHours * 3600000);
  await repository.updateExam(exam, { shareToken, shareExpiresAt });

  const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;
  return { shareUrl, expiresAt: shareExpiresAt };
}

async function getSharedExam(token) {
  const exam = await repository.findExamByShareToken(token);
  if (!exam) throw httpError('Link inválido', 404);
  if (new Date() > exam.shareExpiresAt) throw httpError('Link expirado', 410);
  return mapper.toExamSummary(exam);
}

module.exports = {
  listExams,
  getExamDetail,
  createExam,
  updateExam,
  deleteExam,
  startPdfExtraction,
  shareExam,
  getSharedExam,
};
