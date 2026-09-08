const mongoose = require('mongoose');

const eveningPunchSchema = new mongoose.Schema({
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  punchInTime: {
    type: Date,
    required: true
  },
  punchOutTime: {
    type: Date,
    default: null
  },
  punchInLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  punchOutLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'auto-completed'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('EveningPunch', eveningPunchSchema);
