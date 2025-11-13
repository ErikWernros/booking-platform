const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Skydda routes - kräver JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1) Hämta token från headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2) Kolla om token finns
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Du är inte inloggad. Logga in för att få åtkomst.'
      });
    }

    // 3) Verifiera token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4) Kolla om användaren fortfarande finns
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Användaren till denna token finns inte längre.'
      });
    }

    // 5) Lägg till användaren till request object
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Ogiltig token. Logga in igen.'
    });
  }
};

// Ge åtkomst till specifika roller
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Användaren med rollen ${req.user.role} har inte åtkomst till denna route`
      });
    }
    next();
  };
};