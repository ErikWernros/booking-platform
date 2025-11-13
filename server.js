const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();
const { connectRedis } = require('./config/redis');

// Imports för routes och error handler
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');
const { initWebSocket } = require('./utils/websocket');
const { requestLogger, errorLogger } = require('./middleware/logger');

const app = express();
const server = http.createServer(app);

// Initiera WebSocket FÖRE routes
const io = initWebSocket(server);
app.set('io', io);

// ==================== SOCKET.IO HANDLING ====================
io.on('connection', (socket) => {
  console.log('🔌 Socket.IO användare ansluten:', socket.id);

  // Hantera join-events
  socket.on('join-admin', () => {
    socket.join('admin-channel');
    console.log(`👑 Användare ${socket.id} gick med i admin-kanal`);
  });

  socket.on('join-room', (data) => {
    socket.join(`room-${data.roomId}`);
    console.log(`👥 Användare ${socket.id} gick med i rum ${data.roomId}`);
  });

  socket.on('join-user', (data) => {
    socket.join(`user-${data.userId}`);
    console.log(`👤 Användare ${socket.id} gick med i användarkanal ${data.userId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO användare frånkopplad:', socket.id);
  });
});
// ==================== SLUT SOCKET.IO ====================

// Middleware
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));

// Loggning middleware - FÖRE din console logging
app.use(requestLogger);

// Enkel logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);

// Grundläggande route för testing
app.get('/', (req, res) => {
  res.json({
    message: 'Välkommen till Coworking Booking API!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Debug route för att se alla auth routes
app.get('/api/auth/debug', (req, res) => {
  res.json({
    message: 'Auth routes fungerar!',
    routes: ['/register', '/login', '/me']
  });
});

// 404 handler - FIXED FOR EXPRESS 5
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler middleware (MÅSTE VARA SIST!)
app.use(errorLogger);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Database connection med bättre felhantering
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coworking_db');
    console.log('✅ Ansluten till MongoDB');
    
    // Anslut till Redis
    await connectRedis();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server körs på port ${PORT}`);
      console.log(`📚 API: http://localhost:${PORT}`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
      console.log(`🔔 Socket.IO: http://localhost:${PORT}/socket-test.html`);
      console.log(`⚡ Redis: Caching aktivt`);
    });
  } catch (error) {
    console.error('❌ MongoDB anslutningsfel:', error.message);
    console.log('💡 Tips: Installera MongoDB eller använd MongoDB Atlas');
    console.log('📚 Läs mer: https://docs.mongodb.com/guides/server/install/');
    
    // Starta servern ändå (för testing)
    server.listen(PORT, () => {
      console.log(`🚀 Server körs på port ${PORT} (utan databas)`);
      console.log('⚠️  OBS: Databasen är inte ansluten!');
    });
  }
};

connectDB();

module.exports = app;