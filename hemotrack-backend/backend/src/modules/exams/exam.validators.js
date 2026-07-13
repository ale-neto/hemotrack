const { body } = require('express-validator');

const createExamValidators = [
  body('profileId').isInt(),
  body('examTypeId').isInt(),
  body('examDate').isDate(),
  body('results').isArray({ min: 1 }),
];

const uploadPdfValidators = [body('profileId').isInt()];

module.exports = { createExamValidators, uploadPdfValidators };
