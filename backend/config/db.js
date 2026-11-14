const mongoose = require('mongoose');

/**
 * Connect to MongoDB instance
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_attendance_tracker', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    console.warn('[Database Notice] If MongoDB is running on an external host or Docker, verify MONGO_URI in backend/.env.');
    // We do not force process.exit here so developers can inspect and handle errors gracefully
  }
};

module.exports = connectDB;
