const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const Attendance = require('./models/Attendance');

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_attendance_tracker';

const seedDatabase = async () => {
  try {
    console.log('[Seed Engine] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 6000 });
    console.log('[Seed Engine] Connected to MongoDB database.');

    // 1. Clear existing collections
    console.log('[Seed Engine] Clearing existing collections...');
    await User.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});
    await Attendance.deleteMany({});

    // 2. Seed Users
    console.log('[Seed Engine] Seeding Users (Admin, Faculty, Students)...');
    
    // Note: User.create triggers the pre-save hook to hash passwords with bcrypt
    const usersData = [
      // Admin
      {
        userId: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@college.edu',
        password: 'admin123',
        role: 'Admin',
        department: 'School of Computer Science & Artificial Intelligence',
      },
      // Faculty Members
      {
        userId: 'FAC101',
        name: 'Prof. K. Ramanujan',
        email: 'faculty@college.edu',
        password: 'faculty123',
        role: 'Faculty',
        department: 'Department of Computer Science & Engineering',
      },
      {
        userId: 'FAC102',
        name: 'Dr. Priya Nair',
        email: 'priya@college.edu',
        password: 'faculty123',
        role: 'Faculty',
        department: 'Department of Computer Science & Engineering',
      },
      {
        userId: 'FAC103',
        name: 'Prof. S. Sen',
        email: 'sen@college.edu',
        password: 'faculty123',
        role: 'Faculty',
        department: 'Department of Computer Science & Engineering',
      },
      // Students
      {
        userId: '24CS001',
        name: 'Aarav Sharma',
        email: 'aarav@college.edu',
        password: 'student123',
        role: 'Student',
        semester: 3,
      },
      {
        userId: '24CS002',
        name: 'Diya Patel',
        email: 'diya@college.edu',
        password: 'student123',
        role: 'Student',
        semester: 3,
      },
      {
        userId: '24CS003',
        name: 'Rohan Iyer',
        email: 'rohan@college.edu',
        password: 'student123',
        role: 'Student',
        semester: 3,
      },
      {
        userId: '24CS004',
        name: 'Sneha Reddy',
        email: 'sneha@college.edu',
        password: 'student123',
        role: 'Student',
        semester: 3,
      },
      {
        userId: '24CS005',
        name: 'Vikram Malhotra',
        email: 'vikram@college.edu',
        password: 'student123',
        role: 'Student',
        semester: 3,
      },
    ];

    const createdUsers = await User.create(usersData);
    console.log(`[Seed Engine] Created ${createdUsers.length} users successfully.`);

    const userMap = {};
    createdUsers.forEach((u) => {
      userMap[u.userId] = u;
    });

    // 3. Seed Courses
    console.log('[Seed Engine] Seeding Curriculum Courses...');
    const coursesData = [
      {
        courseId: 'CS201',
        courseName: 'Web Technologies',
        faculty: userMap['FAC101']._id,
        facultyId: 'FAC101',
        facultyName: 'Prof. K. Ramanujan',
        totalClasses: 40,
        status: 'Active',
      },
      {
        courseId: 'CS202',
        courseName: 'Database Management Systems',
        faculty: userMap['FAC102']._id,
        facultyId: 'FAC102',
        facultyName: 'Dr. Priya Nair',
        totalClasses: 38,
        status: 'Active',
      },
      {
        courseId: 'CS203',
        courseName: 'Operating Systems',
        faculty: userMap['FAC103']._id,
        facultyId: 'FAC103',
        facultyName: 'Prof. S. Sen',
        totalClasses: 35,
        status: 'Active',
      },
      {
        courseId: 'CS204',
        courseName: 'Computer Networks',
        faculty: userMap['FAC101']._id,
        facultyId: 'FAC101',
        facultyName: 'Prof. K. Ramanujan',
        totalClasses: 40,
        status: 'Active',
      },
    ];

    const createdCourses = await Course.create(coursesData);
    console.log(`[Seed Engine] Created ${createdCourses.length} courses successfully.`);

    const courseMap = {};
    createdCourses.forEach((c) => {
      courseMap[c.courseId] = c;
    });

    // 4. Seed Enrollments
    console.log('[Seed Engine] Seeding Student Course Enrollments...');
    const studentIds = ['24CS001', '24CS002', '24CS003', '24CS004', '24CS005'];
    const activeCourseIds = ['CS201', 'CS202', 'CS203'];

    const enrollmentsData = [];
    activeCourseIds.forEach((cId) => {
      const course = courseMap[cId];
      studentIds.forEach((sId) => {
        const student = userMap[sId];
        enrollmentsData.push({
          course: course._id,
          courseId: course.courseId,
          courseName: course.courseName,
          student: student._id,
          studentId: student.userId,
          studentName: student.name,
        });
      });
    });

    const createdEnrollments = await Enrollment.create(enrollmentsData);
    console.log(`[Seed Engine] Created ${createdEnrollments.length} enrollment mappings.`);

    // 5. Seed Attendance Sessions (Matching exact stats in UI)
    console.log('[Seed Engine] Seeding Historical Attendance Sessions...');

    // Exact student target attended stats for CS201 (Total: 40 classes):
    // 24CS001: 36 attended (4 absent)
    // 24CS002: 34 attended (6 absent)
    // 24CS003: 29 attended (11 absent)
    // 24CS004: 38 attended (2 absent)
    // 24CS005: 27 attended (13 absent)
    const absentScheduleCS201 = {
      '24CS001': [5, 15, 25, 35],
      '24CS002': [3, 8, 14, 21, 28, 33],
      '24CS003': [2, 4, 7, 11, 16, 20, 24, 27, 31, 36, 40],
      '24CS004': [12, 29],
      '24CS005': [1, 6, 9, 13, 17, 19, 23, 26, 30, 32, 34, 38, 39],
    };

    const attendanceDocs = [];
    const baseDate = new Date('2026-09-01');

    for (let lec = 1; lec <= 40; lec++) {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(baseDate.getDate() + Math.floor((lec - 1) * 1.8));
      const dateStr = sessionDate.toISOString().split('T')[0];

      const records = studentIds.map((sId) => {
        const student = userMap[sId];
        const isAbsent = (absentScheduleCS201[sId] || []).includes(lec);
        return {
          student: student._id,
          studentId: student.userId,
          studentName: student.name,
          status: isAbsent ? 'Absent' : 'Present',
        };
      });

      attendanceDocs.push({
        course: courseMap['CS201']._id,
        courseId: 'CS201',
        courseName: 'Web Technologies',
        date: dateStr,
        lectureNumber: lec,
        markedBy: userMap['FAC101']._id,
        markedByName: userMap['FAC101'].name,
        records,
      });
    }

    // Add recent specific sessions matching the history table on student dashboard:
    // 2026-11-13: CS201 (Lec 40, Present), CS202 (Lec 38, Present)
    // 2026-11-12: CS203 (Lec 35, Absent)
    // 2026-11-11: CS201 (Lec 39, Present)
    // 2026-11-10: CS202 (Lec 37, Present)
    // 2026-11-09: CS203 (Lec 34, Absent)
    // 2026-11-08: CS201 (Lec 38, Present)
    // 2026-11-07: CS202 (Lec 36, Present)
    // 2026-11-06: CS203 (Lec 33, Present)
    // 2026-11-05: CS201 (Lec 37, Present)

    const specificHistoryCS202 = [
      { date: '2026-11-07', lec: 36, aaravPresent: true },
      { date: '2026-11-10', lec: 37, aaravPresent: true },
      { date: '2026-11-13', lec: 38, aaravPresent: true },
    ];

    specificHistoryCS202.forEach((sh) => {
      attendanceDocs.push({
        course: courseMap['CS202']._id,
        courseId: 'CS202',
        courseName: 'Database Management Systems',
        date: sh.date,
        lectureNumber: sh.lec,
        markedBy: userMap['FAC102']._id,
        markedByName: userMap['FAC102'].name,
        records: studentIds.map((sId) => ({
          student: userMap[sId]._id,
          studentId: userMap[sId].userId,
          studentName: userMap[sId].name,
          status: sId === '24CS001' && !sh.aaravPresent ? 'Absent' : 'Present',
        })),
      });
    });

    const specificHistoryCS203 = [
      { date: '2026-11-06', lec: 33, aaravPresent: true },
      { date: '2026-11-09', lec: 34, aaravPresent: false },
      { date: '2026-11-12', lec: 35, aaravPresent: false },
    ];

    specificHistoryCS203.forEach((sh) => {
      attendanceDocs.push({
        course: courseMap['CS203']._id,
        courseId: 'CS203',
        courseName: 'Operating Systems',
        date: sh.date,
        lectureNumber: sh.lec,
        markedBy: userMap['FAC103']._id,
        markedByName: userMap['FAC103'].name,
        records: studentIds.map((sId) => ({
          student: userMap[sId]._id,
          studentId: userMap[sId].userId,
          studentName: userMap[sId].name,
          status: sId === '24CS001' && !sh.aaravPresent ? 'Absent' : 'Present',
        })),
      });
    });

    for (const doc of attendanceDocs) {
      await Attendance.create(doc);
    }

    console.log(`[Seed Engine] Seeded ${attendanceDocs.length} attendance sessions.`);
    console.log('===========================================================');
    console.log('  Database Seeding Completed Successfully!                ');
    console.log('  Sample Credentials:                                     ');
    console.log('  - Admin:   admin@college.edu   / admin123               ');
    console.log('  - Faculty: faculty@college.edu / faculty123             ');
    console.log('  - Student: 24CS001             / student123             ');
    console.log('===========================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Engine Error] Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
