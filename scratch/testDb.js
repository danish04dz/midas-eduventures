const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

console.log('[Test DB] Connecting to:', mongoUri.replace(/:([^@]+)@/, ':****@'));

mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('Host:', mongoose.connection.host);
    console.log('DB Name:', mongoose.connection.name);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });
