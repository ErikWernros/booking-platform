const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);

  let error = { ...err };
  error.message = err.message;

  // Mongoose fel: Ogiltigt ObjectId
  if (err.name === 'CastError') {
    const message = 'Ogiltigt ID';
    error = { message, statusCode: 400 };
  }

  // Mongoose fel: Duplicerat fält
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} finns redan`;
    error = { message, statusCode: 400 };
  }

  // Mongoose fel: Valideringsfel
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = { 
      message: 'Valideringsfel', 
      errors: messages, 
      statusCode: 400 
    };
  }

  // JWT fel
  if (err.name === 'JsonWebTokenError') {
    const message = 'Ogiltig token';
    error = { message, statusCode: 401 };
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Token har utgått';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    errors: error.errors || undefined
  });
};

module.exports = errorHandler;