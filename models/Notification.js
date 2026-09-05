const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  targetFacultyName: {
    type: String,
    default: 'ALL' // 'ALL' or specific faculty name
  },
  type: {
    type: String,
    enum: ['custom', 'timetable', 'period_reminder', 'remark'],
    default: 'custom'
  },
  batch: {
    type: String,
    enum: ['evening', 'morning', 'all'],
    default: 'evening'
  },
  senderName: {
    type: String,
    default: 'Main Coordinator (Admin)'
  },
  readBy: [{
    type: String // user IDs or emails who read this
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
