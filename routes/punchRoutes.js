const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MorningPunch = require('../models/MorningPunch');

// Helper to format date YYYY-MM-DD
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// Verify secret code (used by Smart Panels)
router.post('/verify-code', async (req, res) => {
  try {
    const { secretCode } = req.body;
    if (!secretCode) return res.status(400).json({ message: 'Secret code is required' });

    const faculty = await User.findOne({ secretCode, role: 'faculty', batch: 'morning' });
    if (!faculty) return res.status(404).json({ message: 'Invalid code or faculty not found' });

    res.json({
      message: 'Code verified successfully',
      faculty: {
        id: faculty._id,
        name: faculty.name,
        subject: faculty.subject
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Punch In
router.post('/in', async (req, res) => {
  try {
    const { facultyId, panelId } = req.body;

    const panel = await User.findById(panelId);
    if (!panel || panel.role !== 'panel') {
      return res.status(400).json({ message: 'Invalid smart panel' });
    }

    const faculty = await User.findById(facultyId);
    if (!faculty) {
      return res.status(400).json({ message: 'Invalid faculty' });
    }

    // Check if there is already an active session on this panel
    const existingSession = await MorningPunch.findOne({ panel: panelId, status: 'active' });
    if (existingSession) {
      return res.status(400).json({ message: 'There is already an active session on this panel' });
    }

    const newPunch = new MorningPunch({
      faculty: facultyId,
      panel: panelId,
      className: panel.className,
      classroomNumber: panel.classroomNumber,
      subject: faculty.subject,
      date: getTodayDateString(),
      punchInTime: new Date(),
      status: 'active'
    });

    await newPunch.save();

    res.status(201).json({ message: 'Punched in successfully', punch: newPunch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Punch Out
router.post('/out', async (req, res) => {
  try {
    const { punchId } = req.body;
    
    const punch = await MorningPunch.findById(punchId);
    if (!punch) return res.status(404).json({ message: 'Punch record not found' });
    if (punch.status === 'completed') return res.status(400).json({ message: 'Already punched out' });

    punch.punchOutTime = new Date();
    punch.status = 'completed';

    // Calculate duration in minutes
    const diffMs = punch.punchOutTime - punch.punchInTime;
    punch.durationMinutes = Math.round(diffMs / 60000);

    await punch.save();

    res.json({ message: 'Punched out successfully', punch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active punch on a specific panel
router.get('/active/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    const activePunch = await MorningPunch.findOne({ panel: panelId, status: 'active' }).populate('faculty', 'name subject');
    
    if (!activePunch) {
      return res.json({ active: false });
    }

    res.json({ active: true, punch: activePunch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const { generateMorningPunchRecordsPDF } = require('../utils/pdfGenerator');

// Download PDF of punch records
router.get('/records/download-pdf', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required for PDF export' });

    const records = await MorningPunch.find({ date })
      .populate('faculty', 'name subject')
      .populate('panel', 'classroomNumber className')
      .sort({ createdAt: -1 });

    const pdfBuffer = await generateMorningPunchRecordsPDF(date, records);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Morning-Punch-Records-${date}.pdf"`
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all punch records (for Admin/Principal)
router.get('/records', async (req, res) => {
  try {
    const { date, facultyId } = req.query;
    
    const filter = {};
    if (date) filter.date = date;
    if (facultyId) filter.faculty = facultyId;

    const records = await MorningPunch.find(filter)
      .populate('faculty', 'name subject')
      .populate('panel', 'classroomNumber className')
      .sort({ createdAt: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin force punch out
router.post('/force-out', async (req, res) => {
  try {
    const { punchId } = req.body;
    
    const punch = await MorningPunch.findById(punchId);
    if (!punch || punch.status === 'completed') {
      return res.status(400).json({ message: 'Invalid or already completed punch record' });
    }

    punch.punchOutTime = new Date();
    punch.status = 'completed';

    const diffMs = punch.punchOutTime - punch.punchInTime;
    punch.durationMinutes = Math.round(diffMs / 60000);

    await punch.save();

    res.json({ message: 'Force punched out successfully', punch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
