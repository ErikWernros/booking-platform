const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Användarnamn krävs'],
    unique: true,
    trim: true,
    minlength: [3, 'Användarnamn måste vara minst 3 tecken'],
    maxlength: [30, 'Användarnamn får max vara 30 tecken']
  },
  password: { 
    type: String, 
    required: [true, 'Lösenord krävs'],
    minlength: [6, 'Lösenord måste vara minst 6 tecken']
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  email: {
    type: String,
    required: [true, 'Email krävs'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Ange en giltig email']
  }
}, {
  timestamps: true // Lägger automatiskt till createdAt och updatedAt
});

// Hasha lösenord före sparning
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Jämför lösenord för inloggning
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Ta bort lösenordet från JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);