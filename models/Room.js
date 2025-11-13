const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Rumnamn krävs'],
    trim: true,
    unique: true,
    minlength: [2, 'Rumnamn måste vara minst 2 tecken'],
    maxlength: [50, 'Rumnamn får max vara 50 tecken']
  },
  capacity: { 
    type: Number, 
    required: [true, 'Kapacitet krävs'],
    min: [1, 'Kapacitet måste vara minst 1 person'],
    max: [100, 'Kapacitet får max vara 100 personer']
  },
  type: { 
    type: String, 
    enum: ['workspace', 'conference'], 
    required: [true, 'Rumstyp krävs'],
    default: 'workspace'
  },
  description: {
    type: String,
    maxlength: [500, 'Beskrivning får max vara 500 tecken'],
    trim: true
  },
  amenities: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Timpris kan inte vara negativt'],
    default: 0
  }
}, {
  timestamps: true
});

// Index för snabbare sökningar
roomSchema.index({ name: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);