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
const { getRealTimeWeekInfo } = require('../utils/dateHelper');

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

// GET all Daily Reports (Supports weekTitle, day-wise, date picker, faculty, subject, batch filters)
router.get('/', async (req, res) => {
  try {
    const { facultyId, facultyName, subject, weekTitle, date, day, batch } = req.query;
    const filter = {};
    const realTimeInfo = getRealTimeWeekInfo();

    if (batch === 'morning') {
      filter.batch = 'morning';
    } else if (batch === 'evening') {
      filter.batch = { $ne: 'morning' };
    }
    if (facultyId) filter.facultyId = facultyId;
    if (facultyName && facultyName !== 'ALL') filter.facultyName = new RegExp(facultyName, 'i');
    if (subject && subject !== 'ALL') filter.subject = new RegExp(subject, 'i');
    if (day && day !== 'ALL') filter.day = new RegExp(day.trim(), 'i');

    if (date && date.trim()) {
      filter.$or = [
        { date: new RegExp(date.trim(), 'i') },
        { formattedDateStr: new RegExp(date.trim(), 'i') }
      ];
    } else if (weekTitle && weekTitle !== 'ALL') {
      filter.$or = [
        { weekTitle: weekTitle },
        { weekTitle: realTimeInfo.weekTitle },
        { date: { $gte: realTimeInfo.startDate, $lte: realTimeInfo.endDate } }
      ];
    }

    const reports = await DailyReport.find(filter).sort({ date: -1, createdAt: -1 });
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
      images,
      batch,
      facultyRemarks,
      remarks,
      issueFaced
    } = req.body;

    const reportDate = date ? new Date(date) : new Date();
    const computedWeekInfo = getRealTimeWeekInfo(reportDate);

    const report = new DailyReport({
      facultyId,
      facultyName,
      subject,
      weekTitle: weekTitle || computedWeekInfo.weekTitle,
      date: date || new Date().toISOString().split('T')[0],
      formattedDateStr: formattedDateStr || computedWeekInfo.currentDateFormatted,
      day: day || computedWeekInfo.todayDayCode,
      allocatedSessions: Number(allocatedSessions) || 1,
      takenSessions: Number(takenSessions) || 1,
      isHoliday: Boolean(isHoliday),
      sessions: sessions || [],
      images: images || [],
      batch: batch || 'evening',
      facultyRemarks: facultyRemarks || remarks || issueFaced || ''
    });

    await report.save();
    res.status(201).json({ message: 'Daily Report submitted successfully', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT Edit / Update Daily Report (Faculty)
router.put('/:id', async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const {
      date,
      formattedDateStr,
      day,
      subject,
      allocatedSessions,
      takenSessions,
      isHoliday,
      sessions,
      images,
      batch,
      facultyRemarks,
      remarks,
      issueFaced
    } = req.body;

    if (date !== undefined) report.date = date;
    if (formattedDateStr !== undefined) report.formattedDateStr = formattedDateStr;
    if (day !== undefined) report.day = day;
    if (subject !== undefined) report.subject = subject;
    if (allocatedSessions !== undefined) report.allocatedSessions = Number(allocatedSessions);
    if (takenSessions !== undefined) report.takenSessions = Number(takenSessions);
    if (isHoliday !== undefined) report.isHoliday = Boolean(isHoliday);
    if (sessions !== undefined) report.sessions = sessions;
    if (images !== undefined) report.images = images;
    if (batch !== undefined) report.batch = batch;
    if (facultyRemarks !== undefined || remarks !== undefined || issueFaced !== undefined) {
      report.facultyRemarks = facultyRemarks ?? remarks ?? issueFaced ?? '';
    }

    if (date) {
      const computedWeekInfo = getRealTimeWeekInfo(new Date(date));
      report.weekTitle = computedWeekInfo.weekTitle;
    }

    await report.save();
    res.json({ message: 'Report updated successfully', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE Daily Report (Faculty)
router.delete('/:id', async (req, res) => {
  try {
    const report = await DailyReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ message: 'Report deleted successfully' });
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

// GET Download Weekly / Daily PDF Report (Supports weekTitle, day-wise, date picker, faculty, subject, batch filters)
router.get('/download-pdf', async (req, res) => {
  try {
    const realTimeInfo = getRealTimeWeekInfo();
    let { 
      weekTitle = realTimeInfo.weekTitle, 
      facultyName = 'ALL',
      subject,
      day,
      date,
      batch = 'evening'
    } = req.query;

    const filter = {};
    if (batch) filter.batch = batch;
    if (facultyName && facultyName !== 'ALL') {
      filter.facultyName = new RegExp(facultyName, 'i');
    }
    if (subject && subject !== 'ALL') {
      filter.subject = new RegExp(subject, 'i');
    }
    if (day && day !== 'ALL') {
      filter.day = new RegExp(day.trim(), 'i');
    }

    if (date && date.trim()) {
      filter.$or = [
        { date: new RegExp(date.trim(), 'i') },
        { formattedDateStr: new RegExp(date.trim(), 'i') }
      ];
    } else {
      filter.$or = [
        { weekTitle: weekTitle },
        { weekTitle: realTimeInfo.weekTitle },
        { date: { $gte: realTimeInfo.startDate, $lte: realTimeInfo.endDate } }
      ];
    }

    const dailyReports = await DailyReport.find(filter).sort({ date: -1, createdAt: -1 });

    const isMorning = batch === 'morning';
    const displayFacultyName = facultyName === 'ALL' ? 'All Teachers (Combined Report)' : facultyName;
    const headerTitle = date ? `Daily Curriculum Log (${date})` : (day && day !== 'ALL' ? `Day Report (${day})` : realTimeInfo.weekTitle);
    const defaultSubjectHeader = isMorning
      ? 'Morning Main School Academic Curriculum Report'
      : 'Evening House Activity & Curriculum Weekly Report';

    const pdfBuffer = await generateWeeklyReportPDF({
      schoolName: 'MIDAS CONCEPT SCHOOL',
      tagline: 'Where every mind learns to lead and shine',
      weekTitle: headerTitle,
      weekRange: realTimeInfo.weekTitle,
      subject: subject && subject !== 'ALL' ? subject : defaultSubjectHeader,
      facultyName: displayFacultyName,
      customLogoPath: currentSchoolLogoPath,
      dailyReports
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Midas_${isMorning ? 'Morning' : 'Evening'}_Curriculum_Report_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF Generation Error]', err);
    res.status(500).json({ message: err.message });
  }
});

// POST Send Weekly Report Email to Principal via Nodemailer (AUTOMATIC MONTH & WEEK NO. FROM CURRENT DATE)
router.post('/send-email', async (req, res) => {
  try {
    const realTimeInfo = getRealTimeWeekInfo();
    let { 
      weekTitle = realTimeInfo.weekTitle, 
      facultyName = 'ALL',
      principalEmail,
      batch = 'evening'
    } = req.body;
    if (weekTitle.includes('24 Aug - 29 Aug 2026')) {
      weekTitle = realTimeInfo.weekTitle;
    }

    // Automatically calculate Month Name and Week Number from current date
    const autoDate = getAutoMonthAndWeek(new Date());
    const monthName = req.body.monthName || autoDate.calculatedMonthName;
    const weekNo = req.body.weekNo || autoDate.weekNo;

    const filter = { weekTitle };
    if (batch) filter.batch = batch;
    if (facultyName && facultyName !== 'ALL') {
      filter.facultyName = new RegExp(facultyName, 'i');
    }

    const dailyReports = await DailyReport.find(filter).sort({ date: 1 });
    const isMorning = batch === 'morning';
    const targetFacultyStr = facultyName === 'ALL' ? 'All Teachers Combined' : facultyName;
    const scopeSubject = isMorning 
      ? 'Morning Main School Academic Curriculum Weekly Report' 
      : 'Evening House Activity & Extra-Curricular Weekly Report';

    const pdfBuffer = await generateWeeklyReportPDF({
      schoolName: 'MIDAS CONCEPT SCHOOL',
      tagline: 'Where every mind learns to lead and shine',
      weekTitle: `WEEKLY REPORT (${monthName})`,
      weekRange: `Week ${weekNo}: (${weekTitle})`,
      subject: scopeSubject,
      facultyName: targetFacultyStr,
      customLogoPath: currentSchoolLogoPath,
      dailyReports
    });

    const emailSubject = `Official ${isMorning ? 'Morning Academic' : 'Evening Activity'} Weekly Curriculum Report - Midas Concept School, Sausar (${monthName}, Week ${weekNo}) [${targetFacultyStr}]`;
    
    const emailBody = `Dear Principal,\n\nPlease find attached the Weekly Curriculum Tracking Report for Midas Concept School Sausar.\n\n` +
      `📅 Period: ${monthName} (Week ${weekNo})\n` +
      `📌 Branch: ${isMorning ? 'MORNING MAIN SCHOOL BATCH' : 'EVENING EXTRA-CURRICULAR ACTIVITY'}\n` +
      `📌 Scope: ${scopeSubject}\n` +
      `👨‍🏫 Faculty Scope: ${targetFacultyStr}\n` +
      `📊 Total Daily Session Logs: ${dailyReports.length}\n\n` +
      `The attached PDF contains complete details including Date, Sessions Allocated vs Taken, Present Student Counts, Topics Covered, and Principal Remarks.\n\n` +
      `Best regards,\nMidas Eduventures Academic System`;

    const result = await sendWeeklyReportEmail({
      recipientEmail: principalEmail || process.env.PRINCIPAL_EMAIL || 'mohd.692003@gmail.com',
      subject: emailSubject,
      text: emailBody,
      pdfBuffer,
      filename: `Midas_${isMorning ? 'Morning' : 'Evening'}_Weekly_Report_${monthName.replace(/\s+/g, '_')}_Week${weekNo}.pdf`
    });

    res.json({
      message: `Weekly Curriculum Report PDF successfully sent via email (${result.recipient})!`,
      subject: emailSubject,
      previewUrl: result.previewUrl
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
