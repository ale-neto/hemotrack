const { BloodExam, ExamResult, ExamType, UserProfile, UserSettings } = require('../../models');

const EXAM_LIST_INCLUDES = [
  { model: ExamType, attributes: ['id', 'name', 'category'] },
  { model: UserProfile, attributes: ['id', 'name'] },
  { model: ExamResult },
];

async function findProfileIdsForUser(userId) {
  const profiles = await UserProfile.findAll({ where: { userId }, attributes: ['id'] });
  return profiles.map((p) => p.id);
}

async function findProfileForUser(profileId, userId) {
  return UserProfile.findOne({ where: { id: profileId, userId } });
}

async function findSettingsForUser(userId) {
  return UserSettings.findOne({ where: { userId } });
}

async function findExams(where) {
  return BloodExam.findAll({ where, include: EXAM_LIST_INCLUDES, order: [['examDate', 'DESC']] });
}

/** Busca o exame com todos os dados de detalhe, já garantindo que pertence ao usuário. */
async function findExamDetailOwnedByUser(examId, userId) {
  return BloodExam.findOne({
    where: { id: examId },
    include: [
      { model: ExamType },
      { model: UserProfile, where: { userId } },
      { model: ExamResult },
    ],
  });
}

/** Busca o exame só para checar posse (sem includes pesados) — usado por update/delete/share. */
async function findExamOwnedByUser(examId, userId) {
  return BloodExam.findOne({
    where: { id: examId },
    include: [{ model: UserProfile, where: { userId } }],
  });
}

async function findExamWithResults(examId) {
  return BloodExam.findByPk(examId, { include: [ExamResult, ExamType] });
}

async function findExamByShareToken(token) {
  return BloodExam.findOne({
    where: { shareToken: token },
    include: [ExamResult, ExamType, UserProfile],
  });
}

async function createExam(data) {
  return BloodExam.create(data);
}

async function updateExam(exam, data) {
  return exam.update(data);
}

async function destroyExam(exam) {
  return exam.destroy();
}

async function bulkCreateResults(results) {
  return ExamResult.bulkCreate(results);
}

async function destroyResultsForExam(examId) {
  return ExamResult.destroy({ where: { examId } });
}

async function findExamTypeByName(name) {
  return ExamType.findOne({ where: { name } });
}

async function createExamType(data) {
  return ExamType.create(data);
}

module.exports = {
  findProfileIdsForUser,
  findProfileForUser,
  findSettingsForUser,
  findExams,
  findExamDetailOwnedByUser,
  findExamOwnedByUser,
  findExamWithResults,
  findExamByShareToken,
  createExam,
  updateExam,
  destroyExam,
  bulkCreateResults,
  destroyResultsForExam,
  findExamTypeByName,
  createExamType,
};
