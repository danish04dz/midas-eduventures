const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'midas_eduventures_super_secret_jwt_key_2026';

// Register User (Faculty or Admin)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, subject, designation } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User with this email already exists' });

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'faculty',
      subject: subject || '',
      designation: designation || 'Faculty Member'
    });

    await user.save();
    res.status(201).json({ message: 'Faculty user registered successfully', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
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
        designation: user.designation
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

// Get all faculty users
router.get('/faculties', async (req, res) => {
  try {
    const faculties = await User.find({ role: 'faculty' }).select('-password');
    res.json(faculties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
