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

function emitExtractionProgress(userId, step, message, percent) {
  console.log('entrei no emitExtractionProgress');
  
  emitToUser(userId, 'extraction_progress', { step, message, percent });
}

function emitExtractionComplete(userId, examData) {
  console.log('entrei no emitExtractionComplete');
  
  emitToUser(userId, 'extraction_complete', { examData });
}

function emitExtractionError(userId, error) {
    console.log('entrei no emitExtractionError');

  emitToUser(userId, 'extraction_error', { error });
}

module.exports = { initSocket, emitToUser, emitExtractionProgress, emitExtractionComplete, emitExtractionError };
