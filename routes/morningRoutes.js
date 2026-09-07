const express = require('express');
const router = express.Router();
const morningController = require('../controllers/morningController');

// GET & POST Morning Master Timetable
router.get('/timetable', morningController.getMorningTimetable);
router.get('/timetable/faculty/:facultyName', morningController.getMorningTimetableForFaculty);
router.get('/timetable/download-pdf', morningController.downloadMorningTimetablePdf);
router.post('/timetable', morningController.saveMorningTimetable);

// Period Slot Management (Expand, Remove, Edit Time Range)
router.post('/timetable/add-slot', morningController.addPeriodSlot);
router.post('/timetable/remove-slot', morningController.removePeriodSlot);
router.post('/timetable/update-time', morningController.updatePeriodTime);

// Morning Faculty Management (Register, Edit, Delete)
router.get('/faculties', morningController.getMorningFaculties);
router.post('/faculty/register', morningController.registerMorningFaculty);
router.put('/faculty/:id', morningController.updateMorningFaculty);
router.delete('/faculty/:id', morningController.deleteMorningFaculty);

// Morning Admins
router.get('/admins', morningController.getMorningAdmins);

// Morning Reports & Remarks
router.get('/reports/download-pdf', morningController.downloadMorningReportsPdf);
router.get('/reports', morningController.getMorningReports);
router.post('/reports', morningController.createMorningReport);
router.put('/reports/:id', morningController.updateMorningReport);
router.delete('/reports/:id', morningController.deleteMorningReport);
router.put('/reports/:reportId/remark', morningController.saveMorningReportRemark);

// Separate Assignments & Homework Routes
router.get('/assignments', morningController.getAssignments);
router.post('/assignments', morningController.createAssignment);
router.delete('/assignments/:id', morningController.deleteAssignment);

module.exports = router;
