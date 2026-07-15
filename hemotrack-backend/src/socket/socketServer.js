const { Server } = require('socket.io');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join_room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`[Socket.IO] User ${userId} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user_${userId}`).emit(event, data);
}

function emitExtractionProgress(userId, examId, step, progress) {
  emitToUser(userId, 'extraction_progress', { examId, step, progress });
}

function emitExtractionComplete(userId, examId, exam) {
  emitToUser(userId, 'extraction_complete', { examId, exam });
}

function emitExtractionError(userId, examId, error) {
  emitToUser(userId, 'extraction_error', { examId, error });
}

module.exports = { initSocket, emitToUser, emitExtractionProgress, emitExtractionComplete, emitExtractionError };
