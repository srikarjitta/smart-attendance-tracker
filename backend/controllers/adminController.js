const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');

/**
 * @desc    Admin adds a new user (Faculty or Student)
 * @route   POST /api/admin/users
 * @access  Private (Admin only)
 */
const addUser = async (req, res, next) => {
  try {
    const { userId, name, email, password, role } = req.body;

    if (!userId || !name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: userId, name, email, password, role',
      });
    }

    if (!['Faculty', 'Student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either Faculty or Student',
      });
    }

    const cleanUserId = userId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check conflict
    const userExists = await User.findOne({
      $or: [{ email: cleanEmail }, { userId: cleanUserId }],
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: `User with Email '${cleanEmail}' or ID '${cleanUserId}' already exists.`,
      });
    }

    const user = await User.create({
      userId: cleanUserId,
      name: name.trim(),
      email: cleanEmail,
      password,
      role,
    });

    return res.status(201).json({
      success: true,
      message: `User '${user.name}' (${user.role}) added successfully.`,
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin creates a new course
 * @route   POST /api/admin/courses
 * @access  Private (Admin only)
 */
const createCourse = async (req, res, next) => {
  try {
    const { courseId, courseName, facultyId, totalClasses } = req.body;

    if (!courseId || !courseName) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and Course Name are required',
      });
    }

    const cleanCourseId = courseId.trim().toUpperCase();
    const cleanCourseName = courseName.trim();

    // Check if course already exists
    const courseExists = await Course.findOne({ courseId: cleanCourseId });
    if (courseExists) {
      return res.status(400).json({
        success: false,
        message: `Course with code '${cleanCourseId}' already exists.`,
      });
    }

    let facultyDoc = null;
    let facultyName = 'Unassigned';

    if (facultyId) {
      const cleanFacultyId = facultyId.trim();
      facultyDoc = await User.findOne({
        $or: [
          { userId: cleanFacultyId.toUpperCase() },
          { email: cleanFacultyId.toLowerCase() },
        ],
        role: 'Faculty',
      });

      if (facultyDoc) {
        facultyName = facultyDoc.name;
      }
    }

    const course = await Course.create({
      courseId: cleanCourseId,
      courseName: cleanCourseName,
      faculty: facultyDoc ? facultyDoc._id : null,
      facultyId: facultyDoc ? facultyDoc.userId : null,
      facultyName,
      totalClasses: totalClasses ? Number(totalClasses) : 40,
    });

    return res.status(201).json({
      success: true,
      message: `Course '${course.courseId} - ${course.courseName}' created successfully.`,
      course,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin assigns a faculty member to a course
 * @route   POST /api/admin/assign-faculty
 * @access  Private (Admin only)
 */
const assignFaculty = async (req, res, next) => {
  try {
    const { courseId, facultyId, course, faculty } = req.body;

    // Support either clean IDs or dropdown strings like "CS201 - Web Technologies"
    const rawCourse = courseId || course;
    const rawFaculty = facultyId || faculty;

    if (!rawCourse || !rawFaculty) {
      return res.status(400).json({
        success: false,
        message: 'Both course and faculty identifiers are required',
      });
    }

    // Extract Course ID: e.g. "CS201 - Web Technologies" -> "CS201"
    const parsedCourseId = rawCourse.split('-')[0].trim().toUpperCase();

    // Extract Faculty ID or Name
    let parsedFacultyQuery = rawFaculty.trim();
    const idMatch = rawFaculty.match(/\((FAC\w+)\)/i);
    if (idMatch && idMatch[1]) {
      parsedFacultyQuery = idMatch[1].toUpperCase();
    }

    // Find course
    const courseDoc = await Course.findOne({ courseId: parsedCourseId });
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: `Course '${parsedCourseId}' not found.`,
      });
    }

    // Find faculty
    const facultyDoc = await User.findOne({
      $or: [
        { userId: parsedFacultyQuery.toUpperCase() },
        { name: new RegExp(parsedFacultyQuery, 'i') },
        { email: parsedFacultyQuery.toLowerCase() },
      ],
      role: 'Faculty',
    });

    if (!facultyDoc) {
      return res.status(404).json({
        success: false,
        message: `Faculty member matching '${rawFaculty}' not found.`,
      });
    }

    // Update Course
    courseDoc.faculty = facultyDoc._id;
    courseDoc.facultyId = facultyDoc.userId;
    courseDoc.facultyName = facultyDoc.name;
    await courseDoc.save();

    return res.status(200).json({
      success: true,
      message: `Successfully assigned ${facultyDoc.name} (${facultyDoc.userId}) to ${courseDoc.courseId} - ${courseDoc.courseName}.`,
      course: courseDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin enrolls a student into a course
 * @route   POST /api/admin/enroll-student
 * @access  Private (Admin only)
 */
const enrollStudent = async (req, res, next) => {
  try {
    const { courseId, studentId, course, student } = req.body;

    const rawCourse = courseId || course;
    const rawStudent = studentId || student;

    if (!rawCourse || !rawStudent) {
      return res.status(400).json({
        success: false,
        message: 'Both course and student identifiers are required',
      });
    }

    // Extract Course ID: e.g. "CS201 - Web Technologies" -> "CS201"
    const parsedCourseId = rawCourse.split('-')[0].trim().toUpperCase();

    // Extract Student ID: e.g. "24CS001 - Aarav Sharma" -> "24CS001"
    const parsedStudentId = rawStudent.split('-')[0].trim().toUpperCase();

    // Find Course
    const courseDoc = await Course.findOne({ courseId: parsedCourseId });
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: `Course '${parsedCourseId}' not found.`,
      });
    }

    // Find Student
    const studentDoc = await User.findOne({
      $or: [
        { userId: parsedStudentId },
        { name: new RegExp(parsedStudentId, 'i') },
        { email: parsedStudentId.toLowerCase() },
      ],
      role: 'Student',
    });

    if (!studentDoc) {
      return res.status(404).json({
        success: false,
        message: `Student matching '${rawStudent}' not found.`,
      });
    }

    // Check if already enrolled
    const alreadyEnrolled = await Enrollment.findOne({
      courseId: courseDoc.courseId,
      studentId: studentDoc.userId,
    });

    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: `Student ${studentDoc.name} (${studentDoc.userId}) is already enrolled in ${courseDoc.courseId}.`,
      });
    }

    // Create Enrollment
    const enrollment = await Enrollment.create({
      course: courseDoc._id,
      courseId: courseDoc.courseId,
      courseName: courseDoc.courseName,
      student: studentDoc._id,
      studentId: studentDoc.userId,
      studentName: studentDoc.name,
    });

    return res.status(201).json({
      success: true,
      message: `Student ${studentDoc.name} (${studentDoc.userId}) successfully enrolled into ${courseDoc.courseId} - ${courseDoc.courseName}.`,
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Admin KPI summary stats
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
const getAdminStats = async (req, res, next) => {
  try {
    const totalFaculty = await User.countDocuments({ role: 'Faculty' });
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const activeCourses = await Course.countDocuments({ status: 'Active' });
    const totalEnrollments = await Enrollment.countDocuments({});

    return res.status(200).json({
      success: true,
      stats: {
        totalFaculty,
        totalStudents,
        activeCourses,
        totalEnrollments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all courses (optional query filter)
 * @route   GET /api/admin/courses
 * @access  Private (Admin/Faculty)
 */
const getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({}).sort({ courseId: 1 });
    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (filter by role optionally)
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addUser,
  createCourse,
  assignFaculty,
  enrollStudent,
  getAdminStats,
  getAllCourses,
  getAllUsers,
};
