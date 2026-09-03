const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  day: { type: String, required: true }, // MON, TUE, WED, THU, FRI, SAT
  dateStr: { type: String, default: '' }, // e.g. "24/08/2026"
  slotNumber: { type: Number, required: true }, // 1 or 2
  timeRange: { type: String, required: true }, // "5:30 PM - 6:30 PM" or "6:30 PM - 7:30 PM"
  house: { 
    type: String, 
    enum: ['Gryffindor', 'Slytherin', 'Hufflepuff', 'Ravenclaw', 'All Houses'], 
    required: true 
  },
  grade: { type: String, required: true }, // "9-10", "11 Boys", "11 Girls", etc.
  subject: { type: String, required: true }, // "Robotics", "Art & Craft", "Sports", etc.
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyName: { type: String, required: true },
  groupInfo: { type: String, default: '' }, // e.g. "11 Boys", "9-10 (Gryff)"
  isHoliday: { type: Boolean, default: false }
});

const timetableSchema = new mongoose.Schema({
  weekTitle: { type: String, required: true, default: 'WEEK: 24 Aug - 29 Aug 2026' },
  weekNumber: { type: Number, default: 1 },
  academicYear: { type: String, default: '2026-2027' },
  startDate: { type: String, default: '2026-08-24' },
  endDate: { type: String, default: '2026-08-29' },
  slots: [slotSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timetable', timetableSchema);
