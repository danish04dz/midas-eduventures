const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const { generateWeeklyReportPDF } = require('../utils/pdfGenerator');
const { sendWeeklyReportEmail } = require('../utils/emailService');

// Utility function to automatically calculate Month Name and Week Number from current date
function getAutoMonthAndWeek(dateInput = new Date()) {
  const d = new Date(dateInput);
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const calculatedMonthName = `${month} ${year}`;
  const weekNo = Math.ceil(d.getDate() / 7);
  return { calculatedMonthName, weekNo };
}

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Multer Storage Setup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

let currentSchoolLogoPath = null;

// POST School Logo Upload
router.post('/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No logo file uploaded' });
  currentSchoolLogoPath = req.file.path;
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ message: 'School logo uploaded successfully', logoUrl: fileUrl });
});

// POST File / Image Upload
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'midas_eduventures'
      });
      fs.unlinkSync(req.file.path);
      return res.json({ url: result.secure_url });
    }
  } catch (err) {
    console.error('[Cloudinary Upload Error]', err.message);
  }

  const localUrl = `/uploads/${req.file.filename}`;
  res.json({ url: localUrl });
});

// GET all Daily Reports
router.get('/', async (req, res) => {
  try {
    const { facultyId, facultyName, subject, weekTitle, date } = req.query;
    const filter = {};
    if (facultyId) filter.facultyId = facultyId;
    if (facultyName && facultyName !== 'ALL') filter.facultyName = new RegExp(facultyName, 'i');
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (weekTitle) filter.weekTitle = weekTitle;
    if (date) filter.date = date;

    const reports = await DailyReport.find(filter).sort({ date: 1, createdAt: 1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Submit Daily Report (Faculty)
router.post('/', async (req, res) => {
  try {
    const {
      facultyId,
      facultyName,
      subject,
      weekTitle,
      date,
      formattedDateStr,
      day,
      allocatedSessions,
      takenSessions,
      isHoliday,
      sessions,
      images
    } = req.body;

    const report = new DailyReport({
      facultyId,
      facultyName,
      subject,
      weekTitle: weekTitle || 'WEEK: 24 Aug - 29 Aug 2026',
      date,
      formattedDateStr: formattedDateStr || date,
      day,
      allocatedSessions: Number(allocatedSessions) || 1,
      takenSessions: Number(takenSessions) || 1,
      isHoliday: Boolean(isHoliday),
      sessions: sessions || [],
      images: images || []
    });

    await report.save();
    res.status(201).json({ message: 'Daily Report submitted successfully', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT Add / Update Principal Remark on a Report
router.put('/:id/remark', async (req, res) => {
  try {
    const { remark, remarkBy } = req.body;
    const report = await DailyReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.principalRemark = remark || '';
    report.remarkBy = remarkBy || 'Principal';
    report.remarkedAt = new Date();
    report.status = 'reviewed';

    await report.save();
    res.json({ message: 'Principal remark added successfully', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET Download Weekly PDF Report (All Teachers Combined OR Specific Teacher)
router.get('/download-pdf', async (req, res) => {
  try {
    const { weekTitle = 'WEEK: 24 Aug - 29 Aug 2026', facultyName = 'ALL' } = req.query;
    
    const filter = { weekTitle };
    if (facultyName && facultyName !== 'ALL') {
      filter.facultyName = new RegExp(facultyName, 'i');
    }

    const dailyReports = await DailyReport.find(filter).sort({ date: 1 });

    const displayFacultyName = facultyName === 'ALL' ? 'All Teachers (Combined Report)' : facultyName;

    const pdfBuffer = await generateWeeklyReportPDF({
      schoolName: 'MIDAS CONCEPT SCHOOL',
      tagline: 'Where every mind learns to lead and shine',
      weekTitle: weekTitle.includes('WEEK:') ? weekTitle : `Weekly Report (${weekTitle})`,
      weekRange: weekTitle,
      subject: 'Evening House Activity & Extra-Curricular Weekly Report',
      facultyName: displayFacultyName,
      customLogoPath: currentSchoolLogoPath,
      dailyReports
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Midas_Weekly_Report_${facultyName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Send Weekly Report Email to Principal via Nodemailer (AUTOMATIC MONTH & WEEK NO. FROM CURRENT DATE)
router.post('/send-email', async (req, res) => {
  try {
    const { 
      weekTitle = 'WEEK: 24 Aug - 29 Aug 2026', 
      facultyName = 'ALL',
      principalEmail
    } = req.body;

    // Automatically calculate Month Name and Week Number from current date
    const autoDate = getAutoMonthAndWeek(new Date());
    const monthName = req.body.monthName || autoDate.calculatedMonthName;
    const weekNo = req.body.weekNo || autoDate.weekNo;

    const filter = { weekTitle };
    if (facultyName && facultyName !== 'ALL') {
      filter.facultyName = new RegExp(facultyName, 'i');
    }

    const dailyReports = await DailyReport.find(filter).sort({ date: 1 });
    const targetFacultyStr = facultyName === 'ALL' ? 'All Teachers Combined' : facultyName;

    const pdfBuffer = await generateWeeklyReportPDF({
      schoolName: 'MIDAS CONCEPT SCHOOL',
      tagline: 'Where every mind learns to lead and shine',
      weekTitle: `WEEKLY REPORT (${monthName})`,
      weekRange: `Week ${weekNo}: (${weekTitle})`,
      subject: 'Evening House Activity & Extra-Curricular Weekly Report',
      facultyName: targetFacultyStr,
      customLogoPath: currentSchoolLogoPath,
      dailyReports
    });

    // Professional Subject line featuring AUTOMATIC Month Name & Week Number
    const emailSubject = `Official Academic Weekly Curriculum Report - Midas Concept School, Sausar (${monthName}, Week ${weekNo}) [${targetFacultyStr}]`;
    
    const emailBody = `Dear Principal,\n\nPlease find attached the Weekly Curriculum Tracking Report for Midas Concept School Sausar.\n\n` +
      `📅 Period: ${monthName} (Week ${weekNo})\n` +
      `📌 Activity Scope: Evening House Activity & Extra-Curricular Weekly Report\n` +
      `👨‍🏫 Faculty Scope: ${targetFacultyStr}\n` +
      `📊 Total Daily Session Logs: ${dailyReports.length}\n\n` +
      `The attached PDF contains complete details including Date, Sessions Allocated vs Taken, House Rotations (Gryffindor, Slytherin, Hufflepuff, Ravenclaw), Present Student Counts, Topics Covered, and Principal Remarks.\n\n` +
      `Best regards,\nMidas Eduventures Academic System`;

    const result = await sendWeeklyReportEmail({
      recipientEmail: principalEmail || process.env.PRINCIPAL_EMAIL || 'mohd.692003@gmail.com',
      subject: emailSubject,
      text: emailBody,
      pdfBuffer,
      filename: `Midas_Weekly_Report_${monthName.replace(/\s+/g, '_')}_Week${weekNo}_${targetFacultyStr.replace(/\s+/g, '_')}.pdf`,
      logCount: dailyReports.length,
      scopeTitle: `Evening House Activity & Extra-Curricular Weekly Report (${targetFacultyStr})`,
      periodStr: `${monthName} (Week ${weekNo})`
    });

    res.json({
      message: `Weekly Report PDF successfully emailed to Principal (${result.recipient})!`,
      subject: emailSubject,
      previewUrl: result.previewUrl,
      recipient: result.recipient,
      autoCalculated: { monthName, weekNo }
    });
  } catch (err) {
    console.error('[Send Email Error]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
