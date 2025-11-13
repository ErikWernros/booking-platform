const fs = require('fs');
const path = require('path');

// Skapa logs mapp om den inte finns
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logStream = fs.createWriteStream(
  path.join(logsDir, 'app.log'), 
  { flags: 'a' }
);

const bookingStream = fs.createWriteStream(
  path.join(logsDir, 'bookings.log'),
  { flags: 'a' }
);

// Request logger
exports.requestLogger = (req, res, next) => {
  const log = `${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}\n`;
  logStream.write(log);
  next();
};

// Error logger
exports.errorLogger = (error, req, res, next) => {
  const log = `${new Date().toISOString()} - ERROR: ${error.message}\nStack: ${error.stack}\n\n`;
  logStream.write(log);
  next(error);
};

// Booking logger - specifik för bokningar
exports.bookingLogger = (action, bookingData, user) => {
  const log = `${new Date().toISOString()} - BOOKING_${action.toUpperCase()} - User: ${user.username} (${user._id}) - Room: ${bookingData.roomId} - Time: ${bookingData.startTime} to ${bookingData.endTime}\n`;
  bookingStream.write(log);
};

// Security logger - för inloggningar etc
exports.securityLogger = (action, user, ip) => {
  const log = `${new Date().toISOString()} - SECURITY_${action.toUpperCase()} - User: ${user.username} (${user._id}) - IP: ${ip}\n`;
  logStream.write(log);
};