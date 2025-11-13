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
    // ANVÄND BARA MONGODB_URI - INTE LOCALHOST FALLBACK
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ Ansluten till MongoDB');
    
    // Anslut till Redis
    await connectRedis();
    
    server.listen(PORT, () => {
      console.log(`Server körs på port ${PORT}`);
      console.log(`API: https://booking-platform-uctc.onrender.com`);
      console.log(`Health check: https://booking-platform-uctc.onrender.com/health`);
      console.log(`Auth: https://booking-platform-uctc.onrender.com/api/auth`);
      console.log(`Socket.IO: https://booking-platform-uctc.onrender.com/socket-test.html`);
      console.log(`Redis: Caching aktivt`);
    });
  } catch (error) {
    console.error('MongoDB anslutningsfel:', error.message);
    console.log('Tips: Kontrollera MONGODB_URI environment variabeln i Render');
    
    // Starta servern ändå (för testing)
    server.listen(PORT, () => {
      console.log(`Server körs på port ${PORT} (utan databas)`);
      console.log('OBS: Databasen är inte ansluten!');
    });
  }
};

connectDB();

module.exports = app;