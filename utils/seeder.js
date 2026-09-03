const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const DailyReport = require('../models/DailyReport');

async function seedData(force = false) {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0 && !force) {
      console.log('[Seeder] Production accounts already exist:', userCount, 'users.');
      return;
    }

    if (force) {
      console.log('[Seeder] Resetting production database credentials...');
      await User.deleteMany({});
      await Timetable.deleteMany({});
      await DailyReport.deleteMany({});
    }

    console.log('[Seeder] Initializing Production Core Accounts for Midas Eduventures...');

    const defaultPassword = await bcrypt.hash('password123', 10);

    // 1. Create Core Production Users (Principal & Admin Only)
    const principal = await User.create({
      name: 'Dr. A. K. Sharma',
      email: 'principal@midas.edu',
      password: defaultPassword,
      role: 'principal',
      designation: 'Principal & Executive Director'
    });

    const admin = await User.create({
      name: 'Prof. S. R. Verma',
      email: 'admin@midas.edu',
      password: defaultPassword,
      role: 'admin',
      designation: 'Main Academic Coordinator'
    });

    console.log('[Seeder] Created Core Production Users:');
    console.log('  1. Principal: principal@midas.edu (Password: password123)');
    console.log('  2. Admin / Main Coordinator: admin@midas.edu (Password: password123)');
    console.log('  Note: Faculty accounts will be added directly by Admin via the Admin Dashboard.');

    // Initialize Empty Master Activity Timetable
    await Timetable.create({
      weekTitle: 'WEEK: 24 Aug - 29 Aug 2026',
      weekNumber: 1,
      academicYear: '2026-2027',
      startDate: '2026-08-24',
      endDate: '2026-08-29',
      createdBy: admin._id,
      slots: []
    });

    console.log('[Seeder] Master Activity Timetable initialized.');
  } catch (err) {
    console.error('[Seeder] Error during production seed:', err);
  }
}

module.exports = { seedData };
