const express = require('express');
const router = express.Router();
const eveningController = require('../controllers/eveningController');

// GET /api/evening/timetable
router.get('/timetable', eveningController.getEveningTimetable);

// GET /api/evening/reports
router.get('/reports', eveningController.getEveningReports);

// GET /api/evening/faculties
router.get('/faculties', eveningController.getEveningFaculties);

// GET /api/evening/admins
router.get('/admins', eveningController.getEveningAdmins);

// POST /api/evening/announce
router.post('/announce', eveningController.sendAnnouncement);

module.exports = router;
