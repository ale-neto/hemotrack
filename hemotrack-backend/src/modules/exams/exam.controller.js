const { validationResult } = require('express-validator');
const examService = require('./exam.service');

async function list(req, res, next) {
  try {
    const data = await examService.listExams(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function detail(req, res, next) {
  try {
    const data = await examService.getExamDetail(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const data = await examService.createExam(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await examService.updateExam(req.params.id, req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await examService.deleteExam(req.params.id, req.user.id);
    res.json({ success: true, message: 'Exame removido' });
  } catch (err) { next(err); }
}

async function uploadPdf(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const data = await examService.startPdfExtraction(req.user.id, req.body.profileId, req.file);
    res.status(202).json({ success: true, data });
  } catch (err) { next(err); }
}

async function share(req, res, next) {
  try {
    const data = await examService.shareExam(req.params.id, req.user.id, req.body.expiresInHours);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getShared(req, res, next) {
  try {
    const data = await examService.getSharedExam(req.params.token);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { list, detail, create, update, remove, uploadPdf, share, getShared };
