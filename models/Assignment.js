const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyName: { type: String, required: true },
  subject: { type: String, required: true },
  className: { type: String, default: 'Class 12' },
  groupName: { type: String, default: 'Girls' },
  title: { type: String, required: true }, // e.g. "Electrostatics Chapter 2 Practice Worksheet"
  dueDate: { type: String, default: '' },
  remarks: { type: String, default: '' },
  photos: [{ type: String }], // Array of Base64 or image URLs
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Assignment', assignmentSchema);
