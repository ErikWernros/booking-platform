const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    required: [true, 'Rum krävs'] 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Användare krävs'] 
  },
  startTime: { 
    type: Date, 
    required: [true, 'Starttid krävs'] 
  },
  endTime: { 
    type: Date, 
    required: [true, 'Sluttid krävs'] 
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  purpose: {
    type: String,
    maxlength: [200, 'Syfte får max vara 200 tecken'],
    trim: true
  },
  numberOfParticipants: {
    type: Number,
    min: [1, 'Måste vara minst 1 deltagare'],
    default: 1
  }
}, {
  timestamps: true
});

// Validering: Sluttid måste vara efter starttid
bookingSchema.pre('save', function(next) {
  if (this.startTime >= this.endTime) {
    next(new Error('Sluttid måste vara efter starttid'));
  }
  next();
});

// Validering: Kan inte boka i det förflutna
bookingSchema.pre('save', function(next) {
  if (this.startTime < new Date()) {
    next(new Error('Kan inte boka i det förflutna'));
  }
  next();
});

// Index för snabbare sökningar och unika bokningar
bookingSchema.index({ roomId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ startTime: 1 });

// Statisk metod för att kolla om ett rum är ledigt
bookingSchema.statics.isRoomAvailable = async function(roomId, startTime, endTime, excludeBookingId = null) {
  const conflictConditions = {
    roomId,
    status: 'confirmed',
    $or: [
      // Kollision: Ny bokning startar under befintlig bokning
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  };

  // Exkludera aktuell bokning vid uppdatering
  if (excludeBookingId) {
    conflictConditions._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await this.findOne(conflictConditions);
  return !conflictingBooking;
};

// Instance method för att kolla om bokningen är aktiv
bookingSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'confirmed' && this.endTime > now;
};

// Virtual för bokningens längd i timmar
bookingSchema.virtual('durationHours').get(function() {
  return (this.endTime - this.startTime) / (1000 * 60 * 60);
});

module.exports = mongoose.model('Booking', bookingSchema);