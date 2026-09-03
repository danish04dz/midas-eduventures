const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facultyName: { type: String, required: true },
  subject: { type: String, required: true },
  weekTitle: { type: String, default: 'WEEK: 24 Aug - 29 Aug 2026' },
  date: { type: String, required: true }, // e.g. "2026-08-24" or "24/08/2026"
  formattedDateStr: { type: String, default: '' }, // e.g. "17 Aug 2026"
  day: { type: String, required: true }, // "Monday", "Tuesday", etc.
  allocatedSessions: { type: Number, default: 1 },
  takenSessions: { type: Number, default: 1 },
  isHoliday: { type: Boolean, default: false },
  
  // Session details list
  sessions: [{
    slotNumber: { type: Number, default: 1 },
    timeRange: { type: String, default: '5:30 PM - 6:30 PM' },
    grade: { type: String, default: '9-10' },
    house: { type: String, default: 'Gryffindor' },
    presentStudents: { type: String, default: '' }, // e.g. "25/28"
    topic: { type: String, default: '' },
    summaryPoints: [{ type: String }],
    tasks: { type: String, default: '' }
  }],

  // Principal / Admin Remarks
  principalRemark: { type: String, default: '' },
  remarkBy: { type: String, default: '' },
  remarkedAt: { type: Date },

  images: [{ type: String }], // Array of Cloudinary or uploaded image URLs
  status: { type: String, enum: ['submitted', 'reviewed'], default: 'submitted' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DailyReport', dailyReportSchema);
