const mongoose = require('mongoose');
require('dotenv').config();

const { seedData } = require('../utils/seeder');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const DailyReport = require('../models/DailyReport');

async function runSeed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not defined in server/.env!');
    process.exit(1);
  }

  const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
  console.log(`[SeedDirect] Connecting to MongoDB Atlas: ${maskedUri}`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log(`✅ Connected to MongoDB Atlas (${mongoose.connection.host})!`);

    await seedData(true); // force re-seed

    const userCount = await User.countDocuments();
    const timetableCount = await Timetable.countDocuments();
    const reportCount = await DailyReport.countDocuments();

    console.log('\n========================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`- Users Seeded: ${userCount}`);
    console.log(`- Timetable Grid Records: ${timetableCount}`);
    console.log(`- Daily Curriculum Reports: ${reportCount}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Failed:', err.message);
    process.exit(1);
  }
}

runSeed();
