const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { User, UserProfile, UserSettings } = require('../models');
const { generateToken, hashPassword, comparePassword } = require('../services/auth.service');
const authenticate = require('../middleware/auth.middleware');

// POST /api/auth/register
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { name, email, password } = req.body;
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ success: false, error: 'Email já cadastrado' });

      const passwordHash = await hashPassword(password);
      const user = await User.create({ name, email, passwordHash });

      // Create default profile and settings
      await UserProfile.create({ userId: user.id, name, relationship: 'titular', isDefault: true });
      await UserSettings.create({ userId: user.id });

      const token = generateToken(user.id);
      res.status(201).json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) { next(err); }
  }
);

// POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ success: false, error: 'Credenciais inválidas' });

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) return res.status(401).json({ success: false, error: 'Credenciais inválidas' });

      const token = generateToken(user.id);
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) { next(err); }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, user: { id: req.user.id, name: req.user.name, email: req.user.email } });
});

module.exports = router;
