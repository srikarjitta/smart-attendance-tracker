const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Enable Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger (Development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Smart Attendance Tracker API',
    uptime: process.uptime(),
  });
});

// Root API Information
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Smart Attendance Tracker REST API',
    version: '1.0.0',
    institution: 'SR University — School of Computer Science & Artificial Intelligence',
    documentation: {
      auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me'],
      admin: [
        'POST /api/admin/users',
        'POST /api/admin/courses',
        'POST /api/admin/assign-faculty',
        'POST /api/admin/enroll-student',
        'GET /api/admin/stats',
        'GET /api/admin/courses',
        'GET /api/admin/users',
      ],
      faculty: [
        'POST /api/faculty/attendance',
        'GET /api/faculty/reports/:courseId',
        'GET /api/faculty/courses',
        'GET /api/faculty/courses/:courseId/students',
      ],
      student: ['GET /api/student/dashboard', 'GET /api/student/history'],
    },
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));

// 404 & Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  Smart Attendance Tracker Server running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  API Health: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection Error]: ${err.message}`);
});

module.exports = app;
