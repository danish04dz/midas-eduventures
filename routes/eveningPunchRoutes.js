const express = require('express');
const router = express.Router();
const EveningPunch = require('../models/EveningPunch');
const Settings = require('../models/Settings');

// Helper to format date YYYY-MM-DD
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Punch In
router.post('/in', async (req, res) => {
  try {
    const { facultyId, lat, lng } = req.body;

    // Check geofence settings
    const geofenceSetting = await Settings.findOne({ key: 'geofence' });
    if (!geofenceSetting || !geofenceSetting.value.lat || !geofenceSetting.value.lng || !geofenceSetting.value.radius) {
      return res.status(400).json({ message: 'Geofence is not configured by the admin yet. Cannot punch in.' });
    }

    const { lat: schoolLat, lng: schoolLng, radius: allowedRadius } = geofenceSetting.value;

    const distance = getDistanceFromLatLonInMeters(lat, lng, schoolLat, schoolLng);
    if (distance > allowedRadius) {
      const distanceInKm = (distance / 1000).toFixed(2);
      return res.status(403).json({ message: `You are ${distanceInKm} km away from the school campus.` });
    }

    // Check if already punched in
    const existingPunch = await EveningPunch.findOne({ faculty: facultyId, status: 'active' });
    if (existingPunch) {
      return res.status(400).json({ message: 'You already have an active punch session.' });
    }

    const newPunch = new EveningPunch({
      faculty: facultyId,
      date: getTodayDateString(),
      punchInTime: new Date(),
      punchInLocation: { lat, lng },
      status: 'active'
    });

    await newPunch.save();
    res.status(201).json({ message: 'Punched in successfully', punch: newPunch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify location (For continuous tracking)
router.post('/verify-location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    const geofenceSetting = await Settings.findOne({ key: 'geofence' });
    if (!geofenceSetting || !geofenceSetting.value.lat || !geofenceSetting.value.lng || !geofenceSetting.value.radius) {
      return res.json({ outOfBounds: false }); // Don't auto-punch out if no geofence set
    }

    const { lat: schoolLat, lng: schoolLng, radius: allowedRadius } = geofenceSetting.value;
    const distance = getDistanceFromLatLonInMeters(lat, lng, schoolLat, schoolLng);
    
    if (distance > allowedRadius) {
      return res.json({ outOfBounds: true });
    }
    
    res.json({ outOfBounds: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Punch Out
router.post('/out', async (req, res) => {
  try {
    const { facultyId, lat, lng, isAuto } = req.body;
    
    const punch = await EveningPunch.findOne({ faculty: facultyId, status: 'active' });
    if (!punch) return res.status(404).json({ message: 'No active punch session found.' });

    punch.punchOutTime = new Date();
    punch.status = isAuto ? 'auto-completed' : 'completed';
    if (lat && lng) {
      punch.punchOutLocation = { lat, lng };
    }

    const diffMs = punch.punchOutTime - punch.punchInTime;
    punch.durationMinutes = Math.round(diffMs / 60000);

    await punch.save();
    res.json({ message: isAuto ? 'Automatically Punched Out (Out of bounds)' : 'Punched out successfully', punch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active punch
router.get('/active/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const activePunch = await EveningPunch.findOne({ faculty: facultyId, status: 'active' });
    
    if (!activePunch) {
      return res.json({ active: false });
    }

    res.json({ active: true, punch: activePunch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get personal punch records (Faculty)
router.get('/my-records/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const records = await EveningPunch.find({ faculty: facultyId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all punch records (Admin)
router.get('/records', async (req, res) => {
  try {
    const records = await EveningPunch.find()
      .populate('faculty', 'name subject')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
