const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { UserProfile } = require('../models');
const authenticate = require('../middleware/auth.middleware');

// GET /api/profiles
router.get('/', authenticate, async (req, res, next) => {
  try {
    const profiles = await UserProfile.findAll({ where: { userId: req.user.id }, order: [['isDefault', 'DESC'], ['createdAt', 'ASC']] });
    res.json({ success: true, data: profiles.map(p => p.toPublicJSON()) });
  } catch (err) { next(err); }
});

// POST /api/profiles
router.post('/',
  authenticate,
  [body('name').trim().notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { name, relationship, birthDate, sex, weight, height, diseases, medications } = req.body;
      const profile = await UserProfile.create({
        userId: req.user.id, name, relationship, birthDate, sex,
        weight, height, diseases: diseases || [], medications: medications || [], isDefault: false,
      });
      res.status(201).json({ success: true, data: profile.toPublicJSON() });
    } catch (err) { next(err); }
  }
);

// PUT /api/profiles/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });

    const { name, relationship, birthDate, sex, weight, height, diseases, medications } = req.body;
    await profile.update({ name, relationship, birthDate, sex, weight, height, diseases, medications });
    res.json({ success: true, data: profile.toPublicJSON() });
  } catch (err) { next(err); }
});

// DELETE /api/profiles/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });
    if (profile.isDefault) return res.status(400).json({ success: false, error: 'Não é possível remover o perfil principal' });
    await profile.destroy();
    res.json({ success: true, message: 'Perfil removido' });
  } catch (err) { next(err); }
});

module.exports = router;
