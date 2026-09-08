const mongoose = require('mongoose');

const morningPunchSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  panel: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  className: { type: String, required: true },
  classroomNumber: { type: String, required: true },
  subject: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  punchInTime: { type: Date, required: true },
  punchOutTime: { type: Date },
  durationMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MorningPunch', morningPunchSchema);
