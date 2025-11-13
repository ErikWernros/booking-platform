const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { securityLogger } = require('../middleware/logger');


// Generera JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Skicka token och user data
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Ta bort lösenord från output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user
    }
  });
};

// @desc    Registrera ny användare
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    console.log('=== DEBUG INFO ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('==================');
    // FIX: Safe destructuring med default values
    const { 
      username = '', 
      email = '', 
      password = '', 
      role = 'user' 
    } = req.body || {};

    console.log('Register request body:', req.body); // Debug logging

    // Validera input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Ange användarnamn, email och lösenord'
      });
    }

    // Skapa användare
    const newUser = await User.create({
      username,
      email,
      password,
      role: role || 'user'
    });

    createSendToken(newUser, 201, res);
  } catch (error) {
    // Hantera MongoDB dupliceringsfel
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} finns redan registrerad`
      });
    }
    
    // Hantera valideringsfel från Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Valideringsfel',
        errors: messages
      });
    }
    
    next(error);
  }
};

// @desc    Logga in användare
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email = '', password = '' } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Ange email och lösenord'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      // Logga misslyckad inloggning
      securityLogger('LOGIN_FAILED', { email, ip: req.ip }, req.ip);
      
      return res.status(401).json({
        success: false,
        message: 'Ogiltig email eller lösenord'
      });
    }

    // Logga lyckad inloggning
    securityLogger('LOGIN_SUCCESS', user, req.ip);

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Hämta aktuell användare
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};