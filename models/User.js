const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['principal', 'admin', 'morning_admin', 'faculty', 'panel'], 
    default: 'faculty' 
  },
  subject: { type: String, default: '' },
  designation: { type: String, default: 'Faculty Member' },
  batch: { type: String, enum: ['morning', 'evening'], default: 'evening' },
  avatar: { type: String, default: '' },
  classroomNumber: { type: String, default: '' }, // For panel users
  className: { type: String, default: '' }, // For panel users
  secretCode: { type: String, sparse: true }, // For morning faculty punch-in
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
