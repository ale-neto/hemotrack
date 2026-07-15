const router = require('express').Router();
const { UserSettings, ExamType, ExamReminder, UserProfile } = require('../models');
const authenticate = require('../middleware/auth.middleware');
const { encrypt } = require('../services/encryption.service');
const { Op } = require('sequelize');

// ─── SETTINGS ──────────────────────────────────────────────────────────────────
const settingsRouter = require('express').Router();

settingsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const settings = await UserSettings.findOne({ where: { userId: req.user.id } });
    const data = settings.toJSON();
    data.aiApiKey = settings.aiApiKey ? '***configured***' : null; // Never expose the key
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

settingsRouter.put('/', authenticate, async (req, res, next) => {
  try {
    const { aiProvider, aiApiKey, aiModel, theme, language } = req.body;
    const settings = await UserSettings.findOne({ where: { userId: req.user.id } });

    const updates = { aiProvider, aiModel, theme, language };
    if (aiApiKey && aiApiKey !== '***configured***') {
      updates.aiApiKey = encrypt(aiApiKey);
    }

    await settings.update(updates);
    res.json({ success: true, message: 'Configurações atualizadas' });
  } catch (err) { next(err); }
});

// ─── EXAM TYPES ────────────────────────────────────────────────────────────────
const examTypeRouter = require('express').Router();

examTypeRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const types = await ExamType.findAll({
      where: { [Op.or]: [{ isSystem: true }, { userId: req.user.id }] },
      order: [['category', 'ASC'], ['name', 'ASC']],
    });
    res.json({ success: true, data: types });
  } catch (err) { next(err); }
});

examTypeRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, category, markers } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nome é obrigatório' });

    const examType = await ExamType.create({
      name, category, isSystem: false,
      userId: req.user.id,
      markers: markers || [],
    });
    res.status(201).json({ success: true, data: examType });
  } catch (err) { next(err); }
});

examTypeRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const type = await ExamType.findOne({ where: { id: req.params.id, userId: req.user.id, isSystem: false } });
    if (!type) return res.status(404).json({ success: false, error: 'Tipo não encontrado ou não pode ser removido' });
    await type.destroy();
    res.json({ success: true, message: 'Tipo removido' });
  } catch (err) { next(err); }
});

// ─── REMINDERS ────────────────────────────────────────────────────────────────
const reminderRouter = require('express').Router();

reminderRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const profiles = await UserProfile.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
    const profileIds = profiles.map(p => p.id);

    const reminders = await ExamReminder.findAll({
      where: { profileId: profileIds, isActive: true },
      include: [
        { model: ExamType, attributes: ['id', 'name'] },
        { model: UserProfile, attributes: ['id', 'name'] },
      ],
    });

    const data = reminders.map(r => ({
      ...r.toJSON(),
      nextDueDate: r.getNextDueDate(),
      isOverdue: r.isOverdue(),
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

reminderRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { profileId, examTypeId, intervalMonths } = req.body;
    const profile = await UserProfile.findOne({ where: { id: profileId, userId: req.user.id } });
    if (!profile) return res.status(403).json({ success: false, error: 'Perfil não encontrado' });

    const reminder = await ExamReminder.create({ profileId, examTypeId, intervalMonths, isActive: true });
    res.status(201).json({ success: true, data: reminder });
  } catch (err) { next(err); }
});

reminderRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const profiles = await UserProfile.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
    const profileIds = profiles.map(p => p.id);
    const reminder = await ExamReminder.findOne({ where: { id: req.params.id, profileId: profileIds } });
    if (!reminder) return res.status(404).json({ success: false, error: 'Lembrete não encontrado' });
    await reminder.update(req.body);
    res.json({ success: true, data: reminder });
  } catch (err) { next(err); }
});

reminderRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const profiles = await UserProfile.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
    const profileIds = profiles.map(p => p.id);
    const reminder = await ExamReminder.findOne({ where: { id: req.params.id, profileId: profileIds } });
    if (!reminder) return res.status(404).json({ success: false, error: 'Lembrete não encontrado' });
    await reminder.destroy();
    res.json({ success: true, message: 'Lembrete removido' });
  } catch (err) { next(err); }
});

module.exports = { settingsRouter, examTypeRouter, reminderRouter };
