const express = require('express');
const router = express.Router();
const morningController = require('../controllers/morningController');

// GET /api/morning/timetable
router.get('/timetable', morningController.getMorningTimetable);

// GET /api/morning/reports
router.get('/reports', morningController.getMorningReports);

// GET /api/morning/faculties
router.get('/faculties', morningController.getMorningFaculties);

// GET /api/morning/admins
router.get('/admins', morningController.getMorningAdmins);

module.exports = router;
