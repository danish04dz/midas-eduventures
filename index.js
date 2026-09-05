const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const { seedData } = require('./utils/seeder');

const authRoutes = require('./routes/authRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const eveningRoutes = require('./routes/eveningRoutes');
const morningRoutes = require('./routes/morningRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS for local development and production environments
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.PRODUCTION_URL,
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/evening', eveningRoutes);
app.use('/api/morning', morningRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    name: 'Midas Eduventures API', 
    dbConnected: mongoose.connection.readyState === 1,
    dbHost: mongoose.connection.host || 'unknown',
    timestamp: new Date() 
  });
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/midas_eduventures';

  try {
    const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
    console.log(`[Database] Attempting connection to MongoDB at: ${maskedUri}`);
    
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log(`[Database] Successfully connected to MongoDB Atlas / Remote Database (${mongoose.connection.host})!`);
  } catch (err) {
    console.error(`[Database Error] Could not connect to MONGODB_URI: ${err.message}`);
    console.log('[Database] Starting in-memory MongoDB server fallback...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      const inMemoryUri = mongoServer.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`[Database] Connected to MongoMemoryServer at ${inMemoryUri}`);
    } catch (fallbackErr) {
      console.error('[Database Fallback Error]', fallbackErr);
    }
  }

  // Seed sample data
  await seedData();

  const serverUrl = process.env.SERVER_URL || process.env.PRODUCTION_URL || `http://localhost:${PORT}`;
  app.listen(PORT, () => {
    console.log(`🚀 Midas Eduventures Server running on ${serverUrl} (Port: ${PORT})`);
  });
}

startServer().catch(err => {
  console.error('[Server Start Error]', err);
});
