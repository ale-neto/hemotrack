const { DataTypes } = require('sequelize');
const sequelize = require('../database');

// ─── USER ──────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
});

// ─── USER PROFILE ──────────────────────────────────────────────────────────────
const UserProfile = sequelize.define('UserProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  relationship: {
    type: DataTypes.ENUM('titular', 'cônjuge', 'filho(a)', 'pai', 'mãe', 'outro'),
    defaultValue: 'titular',
  },
  birthDate: { type: DataTypes.DATEONLY, allowNull: true },
  sex: { type: DataTypes.ENUM('masculino', 'feminino', 'outro'), allowNull: true },
  weight: { type: DataTypes.FLOAT, allowNull: true },
  height: { type: DataTypes.INTEGER, allowNull: true }, // cm
  diseases: { type: DataTypes.JSONB, defaultValue: [] },
  medications: { type: DataTypes.JSONB, defaultValue: [] },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
});

UserProfile.prototype.getBMI = function () {
  if (!this.weight || !this.height) return null;
  return parseFloat((this.weight / Math.pow(this.height / 100, 2)).toFixed(1));
};

UserProfile.prototype.getAge = function () {
  if (!this.birthDate) return null;
  const today = new Date();
  const birth = new Date(this.birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

UserProfile.prototype.toPublicJSON = function () {
  const obj = this.toJSON();
  obj.bmi = this.getBMI();
  obj.age = this.getAge();
  return obj;
};

// ─── EXAM TYPE ─────────────────────────────────────────────────────────────────
const ExamType = sequelize.define('ExamType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: true },
  isSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
  userId: { type: DataTypes.INTEGER, allowNull: true }, // null = sistema
  markers: { type: DataTypes.JSONB, defaultValue: [] },
  // markers: [{ name, unit, refMin, refMax, description }]
});

// ─── BLOOD EXAM ────────────────────────────────────────────────────────────────
const BloodExam = sequelize.define('BloodExam', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  profileId: { type: DataTypes.INTEGER, allowNull: false },
  examTypeId: { type: DataTypes.INTEGER, allowNull: true },
  examDate: { type: DataTypes.DATEONLY, allowNull: false },
  origin: { type: DataTypes.ENUM('manual', 'pdf_extracted'), defaultValue: 'manual' },
  labName: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  shareToken: { type: DataTypes.STRING, allowNull: true, unique: true },
  shareExpiresAt: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'), defaultValue: 'completed' },
});

// ─── EXAM RESULT ───────────────────────────────────────────────────────────────
const ExamResult = sequelize.define('ExamResult', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  examId: { type: DataTypes.INTEGER, allowNull: false },
  markerName: { type: DataTypes.STRING, allowNull: false },
  value: { type: DataTypes.FLOAT, allowNull: false },
  unit: { type: DataTypes.STRING, allowNull: true },
  refMin: { type: DataTypes.FLOAT, allowNull: true },
  refMax: { type: DataTypes.FLOAT, allowNull: true },
});

ExamResult.prototype.getStatus = function () {
  if (this.refMin === null && this.refMax === null) return 'sem_referência';
  if (this.refMin !== null && this.value < this.refMin) return 'low';
  if (this.refMax !== null && this.value > this.refMax) return 'high';
  return 'normal';
};

ExamResult.prototype.toPublicJSON = function () {
  return { ...this.toJSON(), status: this.getStatus() };
};

// ─── EXAM REMINDER ─────────────────────────────────────────────────────────────
const ExamReminder = sequelize.define('ExamReminder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  profileId: { type: DataTypes.INTEGER, allowNull: false },
  examTypeId: { type: DataTypes.INTEGER, allowNull: false },
  intervalMonths: { type: DataTypes.INTEGER, allowNull: false },
  lastExamDate: { type: DataTypes.DATEONLY, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
});

ExamReminder.prototype.getNextDueDate = function () {
  if (!this.lastExamDate) return null;
  const d = new Date(this.lastExamDate);
  d.setMonth(d.getMonth() + this.intervalMonths);
  return d.toISOString().split('T')[0];
};

ExamReminder.prototype.isOverdue = function () {
  const next = this.getNextDueDate();
  if (!next) return false;
  return new Date(next) < new Date();
};

// ─── USER SETTINGS ─────────────────────────────────────────────────────────────
const UserSettings = sequelize.define('UserSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  aiProvider: { type: DataTypes.ENUM('gemini', 'openai', 'claude'), defaultValue: 'gemini' },
  aiApiKey: { type: DataTypes.TEXT, allowNull: true }, // encrypted
  aiModel: { type: DataTypes.STRING, allowNull: true },
  theme: { type: DataTypes.ENUM('light', 'dark'), defaultValue: 'light' },
  language: { type: DataTypes.STRING, defaultValue: 'pt-BR' },
});

// ─── ASSOCIATIONS ──────────────────────────────────────────────────────────────
User.hasMany(UserProfile, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserProfile.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(UserSettings, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserSettings.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ExamType, { foreignKey: 'userId', onDelete: 'CASCADE' });
ExamType.belongsTo(User, { foreignKey: 'userId' });

UserProfile.hasMany(BloodExam, { foreignKey: 'profileId', onDelete: 'CASCADE' });
BloodExam.belongsTo(UserProfile, { foreignKey: 'profileId' });

ExamType.hasMany(BloodExam, { foreignKey: 'examTypeId' });
BloodExam.belongsTo(ExamType, { foreignKey: 'examTypeId' });

BloodExam.hasMany(ExamResult, { foreignKey: 'examId', onDelete: 'CASCADE' });
ExamResult.belongsTo(BloodExam, { foreignKey: 'examId' });

UserProfile.hasMany(ExamReminder, { foreignKey: 'profileId', onDelete: 'CASCADE' });
ExamReminder.belongsTo(UserProfile, { foreignKey: 'profileId' });

ExamType.hasMany(ExamReminder, { foreignKey: 'examTypeId' });
ExamReminder.belongsTo(ExamType, { foreignKey: 'examTypeId' });

module.exports = { User, UserProfile, ExamType, BloodExam, ExamResult, ExamReminder, UserSettings, sequelize };
