const mongoose = require('mongoose');

const subSlotSchema = new mongoose.Schema({
  timeRange: { type: String, default: '' }, // e.g. "5:30 PM - 6:00 PM" or "Group A"
  subject: { type: String, default: '' },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyName: { type: String, default: '' },
  grade: { type: String, default: '' },
  groupInfo: { type: String, default: '' },
  isSuspended: { type: Boolean, default: false },
  suspendReason: { type: String, default: '' }
});

const slotSchema = new mongoose.Schema({
  day: { type: String, required: true }, // MON, TUE, WED, THU, FRI, SAT
  dateStr: { type: String, default: '' }, // e.g. "24/08/2026"
  slotNumber: { type: Number, required: true }, // 1 or 2
  timeRange: { type: String, required: true }, // "5:30 PM - 6:30 PM" or "6:30 PM - 7:30 PM"
  house: { 
    type: String, 
    default: 'All Houses'
  },
  slotType: { type: String, default: 'period' },
  isSplit: { type: Boolean, default: false }, // If true, slot is broken into 2 sub-slots / groups
  subSlots: [subSlotSchema],
  grade: { type: String, default: '' }, // "9-10", "11 Boys", etc.
  subject: { type: String, default: '' }, // "Robotics", "Art & Craft", etc.
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyName: { type: String, default: '' },
  groupInfo: { type: String, default: '' }, // e.g. "11 Boys", "9-10 (Gryff)"
  isHoliday: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false },
  suspendReason: { type: String, default: '' }
});

const morningTimeSlotSchema = new mongoose.Schema({
  slotNumber: Number,
  label: String,
  timeRange: String,
  type: { type: String, default: 'period' }
});

const { getRealTimeWeekInfo } = require('../utils/dateHelper');

const timetableSchema = new mongoose.Schema({
  weekTitle: { type: String, required: true, default: () => getRealTimeWeekInfo().weekTitle },
  weekNumber: { type: Number, default: 1 },
  academicYear: { type: String, default: '2026-2027' },
  startDate: { type: String, default: () => getRealTimeWeekInfo().startDate },
  endDate: { type: String, default: () => getRealTimeWeekInfo().endDate },
  slots: [slotSchema],
  morningTimeSlots: [morningTimeSlotSchema],
  batch: { type: String, enum: ['morning', 'evening'], default: 'evening' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timetable', timetableSchema);

