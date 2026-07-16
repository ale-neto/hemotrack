require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { sequelize } = require('./models');
const seed = require('./database/seed');
const { initSocket } = require('./socket/socketServer');
const errorHandler = require('./middleware/error.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./modules/exams/exam.routes');
const profileRoutes = require('./routes/profile.routes');
const reportRoutes = require('./routes/report.routes');
const { settingsRouter, examTypeRouter, reminderRouter } = require('./routes/settings.routes');

// Uma falha não tratada em qualquer job em background (ex: extração de PDF)
// nunca deveria derrubar o servidor inteiro — loga e mantém o processo vivo.
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled promise rejection:', err);
});

const app = express();
const httpServer = http.createServer(app);

// Socket.IO
initSocket(httpServer);

// Logs
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRouter);
app.use('/api/exam-types', examTypeRouter);
app.use('/api/reminders', reminderRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// Error handler
app.use(errorHandler);

// Boot
async function bootstrap() {
  try {
    await sequelize.authenticate();
    console.log('Database connected (PostgreSQL)');

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Models synchronized');

    await seed();

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Bootstrap error:', err);
    process.exit(1);
  }
}

bootstrap();
