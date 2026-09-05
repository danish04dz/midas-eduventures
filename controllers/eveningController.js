const User = require('../models/User');
const DailyReport = require('../models/DailyReport');
const Timetable = require('../models/Timetable');
const { getRealTimeWeekInfo } = require('../utils/dateHelper');

// GET Evening Master Timetable
exports.getEveningTimetable = async (req, res) => {
  try {
    let timetable = await Timetable.findOne({ batch: 'evening' }).sort({ updatedAt: -1 });
    const realTimeInfo = getRealTimeWeekInfo();

    if (!timetable) {
      timetable = new Timetable({
        batch: 'evening',
        weekTitle: realTimeInfo.weekTitle,
        startDate: realTimeInfo.startDate,
        endDate: realTimeInfo.endDate,
        slots: []
      });
      await timetable.save();
    }
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Evening Daily Reports & House Activity Logs
exports.getEveningReports = async (req, res) => {
  try {
    const { facultyId, facultyName, subject, weekTitle, date, day } = req.query;
    const filter = { batch: { $ne: 'morning' } };
    const realTimeInfo = getRealTimeWeekInfo();

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
};

// GET Evening Staff / Faculties
exports.getEveningFaculties = async (req, res) => {
  try {
    const filter = { 
      role: 'faculty',
      batch: { $ne: 'morning' }
    };
    const faculties = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(faculties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET Evening Admins (Main Coordinators)
exports.getEveningAdmins = async (req, res) => {
  try {
    const filter = { role: 'admin' };
    const admins = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
