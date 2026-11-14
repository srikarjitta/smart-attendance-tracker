const express = require('express');
const router = express.Router();
const {
  addUser,
  createCourse,
  assignFaculty,
  enrollStudent,
  getAdminStats,
  getAllCourses,
  getAllUsers,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All Admin routes require authentication and Admin role
router.use(protect);
router.use(authorize('Admin'));

// Admin Management APIs
router.post('/users', addUser);
router.post('/courses', createCourse);
router.post('/assign-faculty', assignFaculty);
router.post('/enroll-student', enrollStudent);
router.get('/stats', getAdminStats);
router.get('/courses', getAllCourses);
router.get('/users', getAllUsers);

module.exports = router;
