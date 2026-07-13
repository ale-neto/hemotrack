const router = require('express').Router();
const { body, query, validationResult } = require('express-validator');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { BloodExam, ExamResult, ExamType, UserProfile, UserSettings } = require('../models');
const authenticate = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { getAdapter } = require('../services/ai.service');
const { emitExtractionProgress, emitExtractionComplete, emitExtractionError } = require('../socket/socketServer');

// GET /api/exams
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { profileId, examTypeId, startDate, endDate } = req.query;
    const profiles = await UserProfile.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
    const profileIds = profiles.map(p => p.id);

    const where = { profileId: profileIds };
    if (profileId) where.profileId = profileId;
    if (examTypeId) where.examTypeId = examTypeId;
    if (startDate || endDate) {
      const { Op } = require('sequelize');
      where.examDate = {};
      if (startDate) where.examDate[Op.gte] = startDate;
      if (endDate) where.examDate[Op.lte] = endDate;
    }

    const exams = await BloodExam.findAll({
      where,
      include: [
        { model: ExamType, attributes: ['id', 'name', 'category'] },
        { model: UserProfile, attributes: ['id', 'name'] },
        { model: ExamResult },
      ],
      order: [['examDate', 'DESC']],
    });

    res.json({ success: true, data: exams });
  } catch (err) { next(err); }
});

// GET /api/exams/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const exam = await BloodExam.findOne({
      where: { id: req.params.id },
      include: [
        { model: ExamType },
        { model: UserProfile, where: { userId: req.user.id } },
        { model: ExamResult },
      ],
    });
    if (!exam) return res.status(404).json({ success: false, error: 'Exame não encontrado' });

    const data = exam.toJSON();
    data.ExamResults = exam.ExamResults.map(r => r.toPublicJSON());
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/exams
router.post('/',
  authenticate,
  [
    body('profileId').isInt(),
    body('examTypeId').isInt(),
    body('examDate').isDate(),
    body('results').isArray({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { profileId, examTypeId, examDate, labName, notes, origin, results } = req.body;

      // Verify profile belongs to user
      const profile = await UserProfile.findOne({ where: { id: profileId, userId: req.user.id } });
      if (!profile) return res.status(403).json({ success: false, error: 'Perfil não encontrado' });

      const exam = await BloodExam.create({ profileId, examTypeId, examDate, labName, notes, origin: origin || 'manual', status: 'completed' });

      const examResults = results.map(r => ({
        examId: exam.id,
        markerName: r.marker || r.markerName,
        value: parseFloat(r.value),
        unit: r.unit || null,
        refMin: r.ref_min !== undefined ? r.ref_min : r.refMin,
        refMax: r.ref_max !== undefined ? r.ref_max : r.refMax,
      }));

      await ExamResult.bulkCreate(examResults);
      const fullExam = await BloodExam.findByPk(exam.id, { include: [ExamResult, ExamType] });

      res.status(201).json({ success: true, data: fullExam });
    } catch (err) { next(err); }
  }
);

// PUT /api/exams/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const exam = await BloodExam.findOne({
      where: { id: req.params.id },
      include: [{ model: UserProfile, where: { userId: req.user.id } }],
    });
    if (!exam) return res.status(404).json({ success: false, error: 'Exame não encontrado' });

    const { examDate, labName, notes, results } = req.body;
    await exam.update({ examDate, labName, notes });

    if (results && Array.isArray(results)) {
      await ExamResult.destroy({ where: { examId: exam.id } });
      await ExamResult.bulkCreate(results.map(r => ({
        examId: exam.id,
        markerName: r.markerName,
        value: parseFloat(r.value),
        unit: r.unit,
        refMin: r.refMin,
        refMax: r.refMax,
      })));
    }

    const updated = await BloodExam.findByPk(exam.id, { include: [ExamResult, ExamType] });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// DELETE /api/exams/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const exam = await BloodExam.findOne({
      where: { id: req.params.id },
      include: [{ model: UserProfile, where: { userId: req.user.id } }],
    });
    if (!exam) return res.status(404).json({ success: false, error: 'Exame não encontrado' });
    await exam.destroy();
    res.json({ success: true, message: 'Exame removido' });
  } catch (err) { next(err); }
});


router.post('/upload-pdf',
  authenticate,
  upload.single('pdf'),
  [body('profileId').isInt()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { profileId } = req.body;

      const profile = await UserProfile.findOne({ where: { id: profileId, userId: req.user.id } });
      if (!profile) return res.status(403).json({ success: false, error: 'Perfil não encontrado' });

      const settings = await UserSettings.findOne({ where: { userId: req.user.id } });
      if (!settings?.aiApiKey) return res.status(400).json({ success: false, error: 'API Key de IA não configurada' });

      const exam = await BloodExam.create({
        profileId,
        examTypeId: null,
        examDate: new Date().toISOString().split('T')[0],
        origin: 'pdf_extracted',
        status: 'pending',
      });

      // Extração em background
      (async () => {
        try {
          emitExtractionProgress(req.user.id, exam.id, 'Lendo PDF...', 20);
          const adapter = getAdapter(settings);
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64PDF = fileBuffer.toString('base64');

          const exams = await adapter.extractExamFromPDF(base64PDF);
          emitExtractionProgress(req.user.id, exam.id, 'Salvando resultados...', 60);

          for (let i = 0; i < exams.length; i++) {
            const result = exams[i];

            let examType = await ExamType.findOne({ where: { name: result.exam_type } });
            if (!examType) {
              examType = await ExamType.create({ name: result.exam_type, category: 'Outros', markers: [] });
            }

            const validResults = (result.results || []).filter(r =>
              (r.marker || r.markerName) && r.value !== null && r.value !== undefined
            );

            if (i === 0) {
              await exam.update({
                examTypeId: examType.id,
                examDate: result.exam_date || new Date().toISOString().split('T')[0],
                labName: result.lab_name || null,
                status: 'completed',
              });
              await ExamResult.bulkCreate(validResults.map(r => ({
                examId: exam.id,
                markerName: r.marker || r.markerName,
                value: r.value,
                unit: r.unit ?? null,
                refMin: r.ref_min ?? r.refMin ?? null,
                refMax: r.ref_max ?? r.refMax ?? null,
              })));
            } else {
              const newExam = await BloodExam.create({
                profileId,
                examTypeId: examType.id,
                examDate: result.exam_date || new Date().toISOString().split('T')[0],
                labName: result.lab_name || null,
                origin: 'pdf_extracted',
                status: 'completed',
              });
              await ExamResult.bulkCreate(validResults.map(r => ({
                examId: newExam.id,
                markerName: r.marker || r.markerName,
                value: r.value,
                unit: r.unit ?? null,
                refMin: r.ref_min ?? r.refMin ?? null,
                refMax: r.ref_max ?? r.refMax ?? null,
              })));
            }

            emitExtractionProgress(
              req.user.id, exam.id,
              `Salvando ${result.exam_type}...`,
              60 + Math.round((i + 1) / exams.length * 35)
            );
          }

          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

          const fullExam = await BloodExam.findByPk(exam.id, { include: [ExamResult, ExamType] });
          console.log('✅ emitindo complete para userId:', req.user.id, 'examId:', exam.id);
          emitExtractionComplete(req.user.id, exam.id, fullExam);

        } catch (err) {
          console.error('❌ Extraction error:', err.message, err.parent?.detail || '');
          await exam.update({ status: 'failed' });
          emitExtractionError(req.user.id, exam.id, err.message);
        }
      })();

      res.status(202).json({ success: true, data: exam });
    } catch (err) { next(err); }
  }
);

// POST /api/exams/extract-pdf  (AI extraction)
router.post('/extract-pdf', authenticate, upload.single('pdf'), async (req, res, next) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum PDF enviado' });

    // Respond immediately — processing happens async via Socket.IO
    res.json({ success: true, message: 'PDF recebido. Aguarde a notificação.' });

    const userId = req.user.id;
    const settings = await UserSettings.findOne({ where: { userId } });
    if (!settings?.aiApiKey) {
      emitExtractionError(userId, 'API Key de IA não configurada. Configure em Ajustes.');
      return;
    }

    emitExtractionProgress(userId, 1, 'Lendo arquivo PDF...', 20);
    const base64PDF = fs.readFileSync(filePath).toString('base64');

    emitExtractionProgress(userId, 2, 'Enviando para análise de IA...', 50);
    const adapter = getAdapter(settings);
    const examData = await adapter.extractExamFromPDF(base64PDF);

    emitExtractionProgress(userId, 3, 'Finalizando extração...', 90);
    fs.unlinkSync(filePath);

    emitExtractionComplete(userId, examData);
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    emitExtractionError(req.user.id, err.message);
  }
});

// POST /api/exams/:id/share
router.post('/:id/share', authenticate, async (req, res, next) => {
  try {
    const exam = await BloodExam.findOne({
      where: { id: req.params.id },
      include: [{ model: UserProfile, where: { userId: req.user.id } }],
    });
    if (!exam) return res.status(404).json({ success: false, error: 'Exame não encontrado' });

    const { expiresInHours = 24 } = req.body;
    const shareToken = uuidv4();
    const shareExpiresAt = new Date(Date.now() + expiresInHours * 3600000);

    await exam.update({ shareToken, shareExpiresAt });
    const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;
    res.json({ success: true, data: { shareUrl, expiresAt: shareExpiresAt } });
  } catch (err) { next(err); }
});

// GET /api/exams/shared/:token
router.get('/shared/:token', async (req, res, next) => {
  try {
    const exam = await BloodExam.findOne({
      where: { shareToken: req.params.token },
      include: [ExamResult, ExamType, UserProfile],
    });

    if (!exam) return res.status(404).json({ success: false, error: 'Link inválido' });
    if (new Date() > exam.shareExpiresAt) {
      return res.status(410).json({ success: false, error: 'Link expirado' });
    }

    res.json({ success: true, data: exam });
  } catch (err) { next(err); }
});

module.exports = router;
