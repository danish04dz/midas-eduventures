const mongoose = require('mongoose');
const { getRealTimeWeekInfo } = require('../utils/dateHelper');

const morningDailyReportSchema = new mongoose.Schema({
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyName: { type: String, required: true },
  subject: { type: String, required: true },
  className: { type: String, default: 'Class 12' },
  groupName: { type: String, default: 'Girls' },
  weekTitle: { type: String, default: () => getRealTimeWeekInfo().weekTitle },
  date: { type: String, required: true }, // e.g. "2026-09-05"
  day: { type: String, required: true }, // "Monday", "Tuesday", etc.
  
  topic: { type: String, default: '' },
  summaryPoints: [{ type: String }],
  presentStudentsCount: { type: Number, default: 0 },
  
  // Class issue / Remark field
  classIssue: { type: String, default: '' }, // e.g. "Projector issue", "3 students absent", "Need extra doubt class"
  facultyRemarks: { type: String, default: '' },
  
  // Assignment & Board Work Photos
  assignmentPhotos: [{ type: String }], // Base64 or image URLs
  images: [{ type: String }],
  
  // Principal / Admin Remarks
  principalRemark: { type: String, default: '' },
  remarkBy: { type: String, default: '' },
  remarkedAt: { type: Date },
  
  batch: { type: String, default: 'morning' },
  status: { type: String, enum: ['submitted', 'reviewed'], default: 'submitted' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MorningDailyReport', morningDailyReportSchema);
