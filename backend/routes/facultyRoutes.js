const express = require('express');
const router = express.Router();
const {
  submitAttendance,
  getCourseReport,
  getAssignedCourses,
  getCourseStudents,
} = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All Faculty routes require authentication and Faculty or Admin role
router.use(protect);
router.use(authorize('Faculty', 'Admin'));

// Faculty Attendance & Reports APIs
router.post('/attendance', submitAttendance);
router.get('/reports/:courseId', getCourseReport);
router.get('/courses', getAssignedCourses);
router.get('/courses/:courseId/students', getCourseStudents);

module.exports = router;
