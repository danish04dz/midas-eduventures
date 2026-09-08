const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// GET settings by key
router.get('/:key', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    if (!setting) return res.json(null);
    res.json(setting.value);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST update settings
router.post('/', async (req, res) => {
  try {
    const { key, value } = req.body;
    let setting = await Settings.findOne({ key });
    
    if (setting) {
      setting.value = value;
      await setting.save();
    } else {
      setting = new Settings({ key, value });
      await setting.save();
    }
    
    res.json({ message: 'Settings saved successfully', setting });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
