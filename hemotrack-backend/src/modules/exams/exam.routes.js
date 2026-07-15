const router = require('express').Router();
const authenticate = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload.middleware');
const controller = require('./exam.controller');
const { createExamValidators, uploadPdfValidators } = require('./exam.validators');

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.detail);
router.post('/', authenticate, createExamValidators, controller.create);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);
router.post('/upload-pdf', authenticate, upload.single('pdf'), uploadPdfValidators, controller.uploadPdf);
router.post('/:id/share', authenticate, controller.share);
router.get('/shared/:token', controller.getShared);

module.exports = router;
