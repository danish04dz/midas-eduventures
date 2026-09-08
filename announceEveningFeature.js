const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const { sendEveningFeatureAnnouncementEmail } = require('./utils/emailService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/midas-eduventures';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const eveningFaculty = await User.find({ role: 'faculty', batch: 'evening' });
    console.log(`Found ${eveningFaculty.length} evening faculty members.`);

    let count = 0;
    for (const faculty of eveningFaculty) {
      if (faculty.email) {
        try {
          await sendEveningFeatureAnnouncementEmail({
            facultyName: faculty.name,
            email: faculty.email
          });
          count++;
          console.log(`Sent email to ${faculty.email}`);
        } catch (e) {
          console.error(`Failed to send to ${faculty.email}:`, e);
        }
      }
    }
    console.log(`Successfully sent ${count} feature announcement emails.`);
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

run();
