const socketIO = require('socket.io');

let io;

exports.initWebSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Ny användare ansluten:', socket.id);

    // Join room-specific channel
    socket.on('join-room', (roomId) => {
      socket.join(`room-${roomId}`);
      console.log(`👥 Användare ${socket.id} gick med i rum ${roomId}`);
    });

    // Join user-specific channel
    socket.on('join-user', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`👤 Användare ${socket.id} gick med i användarkanal ${userId}`);
    });

    // Join admin channel
    socket.on('join-admin', () => {
      socket.join('admin-channel');
      console.log(`👑 Användare ${socket.id} gick med i admin-kanal`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Användare frånkopplad:', socket.id);
    });
  });

  return io;
};

exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io har inte initialiserats!');
  }
  return io;
};