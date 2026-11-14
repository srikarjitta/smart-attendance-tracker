const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

/**
 * @desc    Faculty marks / submits daily class attendance
 * @route   POST /api/faculty/attendance
 * @access  Private (Faculty or Admin)
 */
const submitAttendance = async (req, res, next) => {
  try {
    const { courseId, course, date, records } = req.body;

    const rawCourse = courseId || course;

    if (!rawCourse || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, session date (YYYY-MM-DD), and records array are required',
      });
    }

    // Clean Course ID (e.g. "CS201 - Web Technologies" -> "CS201")
    const parsedCourseId = rawCourse.split('-')[0].trim().toUpperCase();

    // Verify Course
    const courseDoc = await Course.findOne({ courseId: parsedCourseId });
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: `Course '${parsedCourseId}' not found.`,
      });
    }

    // Prepare formatted records array
    const formattedRecords = records.map((r) => ({
      studentId: (r.rollId || r.studentId || '').trim().toUpperCase(),
      studentName: (r.name || r.studentName || '').trim(),
      status: r.status === 'Present' || r.status === true ? 'Present' : 'Absent',
    }));

    // Calculate lecture number based on past attendance sessions for this course
    const existingSessionsCount = await Attendance.countDocuments({
      courseId: courseDoc.courseId,
    });

    // Check if session for this date already exists (update or create)
    let attendanceDoc = await Attendance.findOne({
      courseId: courseDoc.courseId,
      date: date.trim(),
    });

    if (attendanceDoc) {
      // Update existing session
      attendanceDoc.records = formattedRecords;
      attendanceDoc.markedBy = req.user ? req.user._id : null;
      attendanceDoc.markedByName = req.user ? req.user.name : 'Faculty';
      await attendanceDoc.save();
    } else {
      // Create new session
      attendanceDoc = await Attendance.create({
        course: courseDoc._id,
        courseId: courseDoc.courseId,
        courseName: courseDoc.courseName,
        date: date.trim(),
        lectureNumber: existingSessionsCount + 1,
        markedBy: req.user ? req.user._id : null,
        markedByName: req.user ? req.user.name : 'Faculty',
        records: formattedRecords,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Attendance for ${courseDoc.courseId} on ${date} saved successfully (${attendanceDoc.records.length} students).`,
      attendance: attendanceDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Faculty gets comprehensive course attendance report & student summary
 * @route   GET /api/faculty/reports/:courseId
 * @access  Private (Faculty or Admin)
 */
const getCourseReport = async (req, res, next) => {
  try {
    const rawCourseId = req.params.courseId;
    const parsedCourseId = rawCourseId.split('-')[0].trim().toUpperCase();

    // Find Course
    const courseDoc = await Course.findOne({ courseId: parsedCourseId });
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: `Course '${parsedCourseId}' not found.`,
      });
    }

    // Get all past attendance sessions for this course
    const sessions = await Attendance.find({ courseId: parsedCourseId }).sort({
      date: -1,
    });

    // Get all enrolled students for this course
    const enrollments = await Enrollment.find({ courseId: parsedCourseId }).sort({
      studentId: 1,
    });

    const totalSessionsHeld = sessions.length;

    // Calculate student cumulative summary
    const summary = enrollments.map((enr) => {
      let attendedCount = 0;

      sessions.forEach((session) => {
        const studentRecord = session.records.find(
          (rec) => rec.studentId === enr.studentId
        );
        if (studentRecord && studentRecord.status === 'Present') {
          attendedCount++;
        }
      });

      const totalClasses = totalSessionsHeld > 0 ? totalSessionsHeld : courseDoc.totalClasses;
      const percentage =
        totalClasses > 0 ? Number(((attendedCount / totalClasses) * 100).toFixed(1)) : 0;
      const isEligible = percentage >= 75;

      return {
        rollNumber: enr.studentId,
        studentName: enr.studentName,
        totalClasses,
        classesAttended: attendedCount,
        attendancePercentage: `${percentage}%`,
        percentageNumber: percentage,
        status: isEligible ? 'Eligible (>=75%)' : 'Shortage Warning (<75%)',
        isEligible,
      };
    });

    return res.status(200).json({
      success: true,
      course: {
        courseId: courseDoc.courseId,
        courseName: courseDoc.courseName,
        facultyName: courseDoc.facultyName,
        totalClassesScheduled: courseDoc.totalClasses,
        totalSessionsHeld,
      },
      sessions,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get courses assigned to the logged-in faculty member
 * @route   GET /api/faculty/courses
 * @access  Private (Faculty only)
 */
const getAssignedCourses = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user && req.user.role === 'Faculty') {
      filter.$or = [
        { faculty: req.user._id },
        { facultyId: req.user.userId },
      ];
    }

    let courses = await Course.find(filter).sort({ courseId: 1 });

    // If none assigned explicitly, return all active courses for testing
    if (courses.length === 0) {
      courses = await Course.find({ status: 'Active' }).sort({ courseId: 1 });
    }

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
 * @desc    Get roster of students enrolled in a specific course
 * @route   GET /api/faculty/courses/:courseId/students
 * @access  Private (Faculty or Admin)
 */
const getCourseStudents = async (req, res, next) => {
  try {
    const rawCourseId = req.params.courseId;
    const parsedCourseId = rawCourseId.split('-')[0].trim().toUpperCase();

    const enrollments = await Enrollment.find({ courseId: parsedCourseId }).sort({
      studentId: 1,
    });

    const students = enrollments.map((e) => ({
      rollId: e.studentId,
      name: e.studentName,
    }));

    return res.status(200).json({
      success: true,
      courseId: parsedCourseId,
      count: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitAttendance,
  getCourseReport,
  getAssignedCourses,
  getCourseStudents,
};
