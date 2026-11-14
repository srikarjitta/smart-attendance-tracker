const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getStudentHistory,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All Student routes require authentication and Student or Admin role
router.use(protect);
router.use(authorize('Student', 'Admin'));

// Student Dashboard & History APIs
router.get('/dashboard', getStudentDashboard);
router.get('/history', getStudentHistory);

module.exports = router;
