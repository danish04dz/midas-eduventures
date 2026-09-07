const mongoose = require('mongoose');
const { getRealTimeWeekInfo } = require('../utils/dateHelper');

const morningPeriodSlotSchema = new mongoose.Schema({
  slotNumber: { type: Number, required: true }, // 1, 2, 3, ...
  timeRange: { type: String, default: '8:00 AM - 9:00 AM' }, // Editable!
  label: { type: String, default: 'Period 1' }
});

const morningGridSlotSchema = new mongoose.Schema({
  day: { type: String, required: true }, // MON, TUE, WED, THU, FRI, SAT
  slotNumber: { type: Number, required: true },
  timeRange: { type: String, default: '8:00 AM - 9:00 AM' },
  className: { type: String, default: 'Class 12' },
  groupName: { type: String, default: 'Girls' }, // 'Girls', 'Boys', 'Ultra Zenith'
  subject: { type: String, default: '' },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyName: { type: String, default: '' },
  roomNo: { type: String, default: '' },
  isSuspended: { type: Boolean, default: false },
  suspendReason: { type: String, default: '' }
});

const morningTimetableSchema = new mongoose.Schema({
  weekTitle: { type: String, required: true, default: () => getRealTimeWeekInfo().weekTitle },
  academicYear: { type: String, default: '2026-2027' },
  startDate: { type: String, default: () => getRealTimeWeekInfo().startDate },
  endDate: { type: String, default: () => getRealTimeWeekInfo().endDate },
  batch: { type: String, default: 'morning' },
  
  // Available classes & groups configuration
  classes: [{
    name: { type: String, default: 'Class 12' },
    groups: [{ type: String }] // ['Girls', 'Boys', 'Ultra Zenith']
  }],

  // Expandable & removable time slots with editable time range
  periodSlots: [morningPeriodSlotSchema],

  // All matrix cell allocations
  slots: [morningGridSlotSchema],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MorningTimetable', morningTimetableSchema);
