const User = require('../models/User');
const MorningDailyReport = require('../models/morningDailyReport');
const MorningTimetable = require('../models/MorningTimetable');
const Assignment = require('../models/Assignment');
const { getRealTimeWeekInfo } = require('../utils/dateHelper');
const { generateMorningTimetablePDF, generateMorningReportsPDF } = require('../utils/pdfGenerator');
const { sendFacultyWelcomeEmail } = require('../utils/emailService');
const bcrypt = require('bcryptjs');

// Initial default configuration for Morning Timetable
const getDefaultPeriodSlots = () => [
  { slotNumber: 1, label: 'Period 1', timeRange: '8:00 AM - 9:00 AM' },
  { slotNumber: 2, label: 'Period 2', timeRange: '9:00 AM - 10:00 AM' },
  { slotNumber: 3, label: 'Period 3', timeRange: '10:00 AM - 11:00 AM' },
  { slotNumber: 4, label: 'Period 4', timeRange: '11:00 AM - 12:00 PM' }
];

const getDefaultClasses = () => [
  { name: 'Class 12', groups: ['Girls', 'Boys', 'Ultra Zenith'] }
];

// GET Morning Master Timetable
exports.getMorningTimetable = async (req, res) => {
  try {
    let timetable = await MorningTimetable.findOne({ batch: 'morning' }).sort({ updatedAt: -1 });
    const realTimeInfo = getRealTimeWeekInfo();

    if (!timetable) {
      timetable = new MorningTimetable({
        batch: 'morning',
        weekTitle: realTimeInfo.weekTitle,
        startDate: realTimeInfo.startDate,
        endDate: realTimeInfo.endDate,
        classes: getDefaultClasses(),
        periodSlots: getDefaultPeriodSlots(),
        slots: []
      });
      await timetable.save();
    } else {
      // Ensure periodSlots & classes defaults exist
      if (!timetable.periodSlots || timetable.periodSlots.length === 0) {
        timetable.periodSlots = getDefaultPeriodSlots();
      }
      if (!timetable.classes || timetable.classes.length === 0) {
        timetable.classes = getDefaultClasses();
      }
      await timetable.save();
    }
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Morning Timetable Assigned Slots for Specific Faculty
exports.getMorningTimetableForFaculty = async (req, res) => {
  try {
    const { facultyName } = req.params;
    if (!facultyName) return res.json([]);

    const timetable = await MorningTimetable.findOne({ batch: 'morning' });
    if (!timetable || !timetable.slots) return res.json([]);

    const nameToMatch = decodeURIComponent(facultyName).trim().toLowerCase();
    
    // Filter slots where facultyName matches (case-insensitive substring or exact match)
    const assignedSlots = timetable.slots.filter(slot => {
      if (!slot.facultyName || slot.isSuspended) return false;
      const fName = slot.facultyName.trim().toLowerCase();
      return fName === nameToMatch || fName.includes(nameToMatch) || nameToMatch.includes(fName);
    });

    res.json(assignedSlots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST / PUT Save Full Morning Timetable
exports.saveMorningTimetable = async (req, res) => {
  try {
    const { weekTitle, academicYear, startDate, endDate, classes, periodSlots, slots } = req.body;
    let timetable = await MorningTimetable.findOne({ batch: 'morning' });

    const realTimeInfo = getRealTimeWeekInfo();

    if (timetable) {
      timetable.weekTitle = weekTitle || timetable.weekTitle || realTimeInfo.weekTitle;
      timetable.academicYear = academicYear || timetable.academicYear;
      timetable.startDate = startDate || timetable.startDate || realTimeInfo.startDate;
      timetable.endDate = endDate || timetable.endDate || realTimeInfo.endDate;
      if (classes) timetable.classes = classes;
      if (periodSlots) timetable.periodSlots = periodSlots;
      if (slots) timetable.slots = slots;
      timetable.updatedAt = Date.now();
      await timetable.save();
    } else {
      timetable = new MorningTimetable({
        batch: 'morning',
        weekTitle: weekTitle || realTimeInfo.weekTitle,
        academicYear: academicYear || '2026-2027',
        startDate: startDate || realTimeInfo.startDate,
        endDate: endDate || realTimeInfo.endDate,
        classes: classes || getDefaultClasses(),
        periodSlots: periodSlots || getDefaultPeriodSlots(),
        slots: slots || []
      });
      await timetable.save();
    }

    res.json({ message: 'Morning Timetable saved successfully!', timetable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST Add / Expand Period Slot
exports.addPeriodSlot = async (req, res) => {
  try {
    let timetable = await MorningTimetable.findOne({ batch: 'morning' });
    if (!timetable) {
      timetable = new MorningTimetable({ batch: 'morning', periodSlots: getDefaultPeriodSlots() });
    }

    const nextSlotNum = timetable.periodSlots.length > 0
      ? Math.max(...timetable.periodSlots.map(s => s.slotNumber)) + 1
      : 1;

    const newPeriod = {
      slotNumber: nextSlotNum,
      label: `Period ${nextSlotNum}`,
      timeRange: req.body.timeRange || `12:00 PM - 1:00 PM`
    };

    timetable.periodSlots.push(newPeriod);
    timetable.updatedAt = Date.now();
    await timetable.save();

    res.json({ message: `Period ${nextSlotNum} added!`, timetable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST Remove Period Slot
exports.removePeriodSlot = async (req, res) => {
  try {
    const { slotNumber } = req.body;
    let timetable = await MorningTimetable.findOne({ batch: 'morning' });
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });

    timetable.periodSlots = timetable.periodSlots.filter(s => s.slotNumber !== Number(slotNumber));
    timetable.slots = timetable.slots.filter(s => s.slotNumber !== Number(slotNumber));
    timetable.updatedAt = Date.now();
    await timetable.save();

    res.json({ message: `Period slot ${slotNumber} removed!`, timetable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST Update Period Time Range
exports.updatePeriodTime = async (req, res) => {
  try {
    const { slotNumber, timeRange } = req.body;
    let timetable = await MorningTimetable.findOne({ batch: 'morning' });
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });

    const pSlot = timetable.periodSlots.find(s => s.slotNumber === Number(slotNumber));
    if (pSlot) {
      pSlot.timeRange = timeRange;
    }
    timetable.slots.forEach(s => {
      if (s.slotNumber === Number(slotNumber)) {
        s.timeRange = timeRange;
      }
    });

    timetable.updatedAt = Date.now();
    await timetable.save();

    res.json({ message: `Period ${slotNumber} time updated to ${timeRange}!`, timetable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST Register New Morning Faculty
exports.registerMorningFaculty = async (req, res) => {
  try {
    const { name, email, password, subject, designation } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const rawPassword = password || 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const secretCode = Math.floor(100000 + Math.random() * 900000).toString();

    const faculty = new User({
      name,
      email,
      password: hashedPassword,
      role: 'faculty',
      subject: subject || 'Morning Physics',
      designation: designation || 'Morning Faculty Lead',
      batch: 'morning',
      secretCode: secretCode
    });

    await faculty.save();

    // Send Welcome Email asynchronously
    sendFacultyWelcomeEmail({
      facultyName: name,
      email: email,
      password: rawPassword,
      secretCode: secretCode
    }).catch(err => console.error('[Email Error] Failed to send welcome email:', err));

    res.status(201).json({ message: `Morning Faculty "${name}" registered successfully!`, faculty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT Update Morning Faculty
exports.updateMorningFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, subject, designation } = req.body;
    const faculty = await User.findById(id);
    if (!faculty) return res.status(404).json({ message: 'Faculty member not found' });

    if (name) faculty.name = name;
    if (email) faculty.email = email;
    if (subject) faculty.subject = subject;
    if (designation) faculty.designation = designation;

    await faculty.save();
    res.json({ message: `Faculty member "${faculty.name}" updated!`, faculty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE Morning Faculty
exports.deleteMorningFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: 'Morning Faculty account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Morning Staff / Faculties
exports.getMorningFaculties = async (req, res) => {
  try {
    const filter = { 
      role: 'faculty',
      $or: [{ batch: 'morning' }, { batch: 'both' }]
    };
    const faculties = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(faculties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Morning Admins
exports.getMorningAdmins = async (req, res) => {
  try {
    const filter = { role: 'morning_admin' };
    const admins = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST Create Morning Daily Progress Report
exports.createMorningReport = async (req, res) => {
  try {
    const {
      facultyId,
      facultyName,
      subject,
      className,
      groupName,
      date,
      day,
      topic,
      summaryPoints,
      presentStudentsCount,
      classIssue,
      facultyRemarks,
      assignmentPhotos,
      images
    } = req.body;

    if (!facultyName || !subject || !date) {
      return res.status(400).json({ message: 'Faculty name, subject, and date are required' });
    }

    const report = new MorningDailyReport({
      facultyId: facultyId || (req.user ? req.user._id : undefined),
      facultyName,
      subject,
      className: className || 'Class 12',
      groupName: groupName || 'Girls',
      date,
      day: day || 'Monday',
      topic: topic || '',
      summaryPoints: Array.isArray(summaryPoints) ? summaryPoints : [],
      presentStudentsCount: Number(presentStudentsCount) || 0,
      classIssue: classIssue || '',
      facultyRemarks: facultyRemarks || '',
      assignmentPhotos: Array.isArray(assignmentPhotos) ? assignmentPhotos : [],
      images: Array.isArray(images) ? images : (assignmentPhotos || []),
      batch: 'morning'
    });

    await report.save();
    res.status(201).json({ message: 'Morning Daily Report submitted successfully!', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT Update Morning Daily Progress Report
exports.updateMorningReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      className,
      groupName,
      date,
      day,
      subject,
      topic,
      summaryPoints,
      presentStudentsCount,
      classIssue,
      facultyRemarks,
      assignmentPhotos
    } = req.body;

    const report = await MorningDailyReport.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    if (className) report.className = className;
    if (groupName) report.groupName = groupName;
    if (date) report.date = date;
    if (day) report.day = day;
    if (subject) report.subject = subject;
    if (topic !== undefined) report.topic = topic;
    if (summaryPoints) report.summaryPoints = Array.isArray(summaryPoints) ? summaryPoints : [];
    if (presentStudentsCount !== undefined) report.presentStudentsCount = Number(presentStudentsCount);
    if (classIssue !== undefined) report.classIssue = classIssue;
    if (facultyRemarks !== undefined) report.facultyRemarks = facultyRemarks;
    if (assignmentPhotos) {
      report.assignmentPhotos = Array.isArray(assignmentPhotos) ? assignmentPhotos : [];
      report.images = report.assignmentPhotos;
    }

    await report.save();
    res.json({ message: 'Morning Daily Report updated successfully!', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE Morning Daily Progress Report
exports.deleteMorningReport = async (req, res) => {
  try {
    const { id } = req.params;
    await MorningDailyReport.findByIdAndDelete(id);
    res.json({ message: 'Morning Daily Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Morning Daily Reports
exports.getMorningReports = async (req, res) => {
  try {
    const { facultyId, facultyName, subject, className, groupName, weekTitle, date, day } = req.query;
    const filter = { batch: 'morning' };
    const realTimeInfo = getRealTimeWeekInfo();

    if (facultyId) filter.facultyId = facultyId;
    if (facultyName && facultyName !== 'ALL') filter.facultyName = new RegExp(facultyName, 'i');
    if (subject && subject !== 'ALL') filter.subject = new RegExp(subject, 'i');
    if (className && className !== 'ALL') filter.className = new RegExp(className, 'i');
    if (groupName && groupName !== 'ALL') filter.groupName = new RegExp(groupName, 'i');
    if (day && day !== 'ALL') filter.day = new RegExp(day.trim(), 'i');

    if (date && date.trim()) {
      filter.$or = [
        { date: new RegExp(date.trim(), 'i') },
        { formattedDateStr: new RegExp(date.trim(), 'i') }
      ];
    } else if (weekTitle && weekTitle !== 'ALL') {
      filter.weekTitle = weekTitle;
    }

    const reports = await MorningDailyReport.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT Save Principal / Admin Remark on Morning Daily Report
exports.saveMorningReportRemark = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { principalRemark, remark, remarkBy } = req.body;

    const report = await MorningDailyReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Morning report not found' });

    const finalRemark = principalRemark !== undefined ? principalRemark : (remark !== undefined ? remark : '');
    report.principalRemark = finalRemark;
    report.remarkBy = remarkBy || 'Dr. A. K. Sharma (Principal)';
    report.remarkedAt = new Date();
    report.status = finalRemark ? 'reviewed' : 'submitted';

    await report.save();
    res.json({ message: 'Principal remark saved successfully', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Download Morning Academic Timetable PDF (Day-wise & Class-wise)
exports.downloadMorningTimetablePdf = async (req, res) => {
  try {
    const { day = 'ALL', className = 'Class 12' } = req.query;
    let timetable = await MorningTimetable.findOne({ batch: 'morning' }).sort({ updatedAt: -1 });
    const realTimeInfo = getRealTimeWeekInfo();

    const pdfBuffer = await generateMorningTimetablePDF({
      weekTitle: timetable?.weekTitle || realTimeInfo.weekTitle,
      selectedDay: day,
      selectedClass: className,
      periodSlots: timetable?.periodSlots || getDefaultPeriodSlots(),
      slots: timetable?.slots || []
    });

    const dayStr = day === 'ALL' ? 'Complete_Week' : `Day_${day}`;
    const classStr = (className || 'All_Classes').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Midas_Morning_Timetable_${classStr}_${dayStr}_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------------
// SEPARATE SELECTION & MANAGEMENT OF ASSIGNMENTS & HOMEWORK PHOTOS
// -------------------------------------------------------------------------

// POST Create / Upload New Assignment
exports.createAssignment = async (req, res) => {
  try {
    const { facultyId, facultyName, subject, className, groupName, title, dueDate, remarks, photos } = req.body;
    if (!facultyName || !title || !photos || photos.length === 0) {
      return res.status(400).json({ message: 'Title, faculty name, and at least one assignment photo are required' });
    }

    const assignment = new Assignment({
      facultyId,
      facultyName,
      subject: subject || 'Physics',
      className: className || 'Class 12',
      groupName: groupName || 'Girls',
      title,
      dueDate: dueDate || '',
      remarks: remarks || '',
      photos: Array.isArray(photos) ? photos : []
    });

    await assignment.save();
    res.status(201).json({ message: 'Assignment uploaded successfully!', assignment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Fetch Assignments
exports.getAssignments = async (req, res) => {
  try {
    const { facultyName, className, groupName, subject } = req.query;
    const filter = {};
    if (facultyName && facultyName !== 'ALL') filter.facultyName = new RegExp(facultyName, 'i');
    if (className && className !== 'ALL') filter.className = new RegExp(className, 'i');
    if (groupName && groupName !== 'ALL') filter.groupName = new RegExp(groupName, 'i');
    if (subject && subject !== 'ALL') filter.subject = new RegExp(subject, 'i');

    const assignments = await Assignment.find(filter).sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE Assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    await Assignment.findByIdAndDelete(id);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Download Morning Academic Daily Reports PDF (With Filters)
exports.downloadMorningReportsPdf = async (req, res) => {
  try {
    const { date, day = 'ALL', className = 'ALL', groupName = 'ALL', facultyName = 'ALL' } = req.query;
    const filter = { batch: 'morning' };

    if (facultyName && facultyName !== 'ALL') filter.facultyName = new RegExp(facultyName, 'i');
    if (className && className !== 'ALL') filter.className = new RegExp(className, 'i');
    if (groupName && groupName !== 'ALL') filter.groupName = new RegExp(groupName, 'i');
    if (day && day !== 'ALL') filter.day = new RegExp(day.trim(), 'i');

    if (date && date.trim()) {
      filter.$or = [
        { date: new RegExp(date.trim(), 'i') },
        { formattedDateStr: new RegExp(date.trim(), 'i') }
      ];
    }

    const reports = await MorningDailyReport.find(filter).sort({ date: -1, createdAt: -1 });

    const pdfBuffer = await generateMorningReportsPDF({
      filterDay: day,
      filterClass: className,
      filterGroup: groupName,
      filterFaculty: facultyName,
      filterDate: date || 'ALL',
      dailyReports: reports
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Midas_Morning_Daily_Reports_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
