const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// GET Notifications for logged in user or all
router.get('/', async (req, res) => {
  try {
    const { facultyName } = req.query;
    const filter = {};
    if (facultyName) {
      filter.$or = [
        { targetFacultyName: 'ALL' },
        { targetFacultyName: new RegExp(facultyName, 'i') }
      ];
    }
    const notifs = await Notification.find(filter).sort({ createdAt: -1 }).limit(20);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Admin Send Custom Push Notification
router.post('/custom', async (req, res) => {
  try {
    const { title, body, targetFacultyName, senderName } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });

    const notif = new Notification({
      title,
      body,
      targetFacultyName: targetFacultyName || 'ALL',
      type: 'custom',
      senderName: senderName || 'Main Coordinator (Admin)'
    });

    await notif.save();
    res.status(201).json({ message: 'Custom Notification dispatched successfully!', notification: notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT Mark Notification as Read
router.put('/:id/read', async (req, res) => {
  try {
    const { userId } = req.body;
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    if (userId && !notif.readBy.includes(userId)) {
      notif.readBy.push(userId);
      await notif.save();
    }
    res.json({ message: 'Notification marked as read', notification: notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
