const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'midas_eduventures_super_secret_jwt_key_2026';

// Register User (Faculty or Admin)
// Register User (Faculty, Morning Admin, or Admin)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, subject, designation, batch } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User with this email already exists' });

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    let assignedBatch = batch || 'evening';
    if (role === 'morning_admin') assignedBatch = 'morning';
    if (role === 'admin') assignedBatch = 'evening';

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'faculty',
      subject: subject || '',
      designation: designation || 'Faculty Member',
      batch: assignedBatch
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully', user: { id: user._id, name: user.name, email: user.email, role: user.role, batch: user.batch } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email, subject: user.subject },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subject: user.subject,
        designation: user.designation,
        batch: user.batch || (user.role === 'morning_admin' ? 'morning' : 'evening')
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Current User Profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update Profile & Password
router.put('/update-profile', async (req, res) => {
  try {
    const { userId, name, subject, designation, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (subject) user.subject = subject;
    if (designation) user.designation = designation;

    if (newPassword && newPassword.trim()) {
      user.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    await user.save();
    res.json({ 
      message: 'Profile & password updated successfully!', 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subject: user.subject,
        designation: user.designation
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all faculty users (Supports ?batch=morning or ?batch=evening)
router.get('/faculties', async (req, res) => {
  try {
    const { batch } = req.query;
    const filter = { role: 'faculty' };
    if (batch === 'morning') {
      filter.batch = 'morning';
    } else if (batch === 'evening') {
      filter.batch = { $ne: 'morning' };
    }
    const faculties = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(faculties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin reset password of a selected user or bulk selected users (default to password123 or custom)
router.put('/admin/reset-password', async (req, res) => {
  try {
    const { userId, userIds, newPassword } = req.body;
    const passwordToSet = (newPassword && newPassword.trim()) ? newPassword.trim() : 'password123';
    const hashedPassword = await bcrypt.hash(passwordToSet, 10);

    // Bulk reset if userIds array is provided
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const result = await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { password: hashedPassword } }
      );
      return res.json({
        message: `Successfully reset password to "${passwordToSet}" for ${result.modifiedCount} faculty member(s)!`,
        count: result.modifiedCount
      });
    }

    // Single user reset
    if (!userId) return res.status(400).json({ message: 'User ID or array of User IDs is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = hashedPassword;
    await user.save();

    res.json({
      message: `Password for ${user.name} reset successfully to "${passwordToSet}"`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin edit faculty member details
router.put('/faculty/:id', async (req, res) => {
  try {
    const { name, email, subject, designation, role, batch } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Faculty member not found' });

    if (name) user.name = name;
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) return res.status(400).json({ message: 'Email is already in use by another user' });
      user.email = email;
    }
    if (subject !== undefined) user.subject = subject;
    if (designation !== undefined) user.designation = designation;
    if (role) user.role = role;
    if (batch) user.batch = batch;

    await user.save();
    res.json({
      message: `Faculty member "${user.name}" updated successfully!`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subject: user.subject,
        designation: user.designation,
        batch: user.batch
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all admin users (Evening Admin & Morning Admin)
router.get('/admins', async (req, res) => {
  try {
    const { batch } = req.query;
    const filter = { role: { $in: ['admin', 'morning_admin'] } };
    if (batch === 'morning') {
      filter.role = 'morning_admin';
    } else if (batch === 'evening') {
      filter.role = 'admin';
    }
    const admins = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin delete faculty or user member
router.delete('/faculty/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'principal') {
      return res.status(400).json({ message: 'Cannot delete primary Principal account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `Account "${user.name}" deleted successfully!` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

