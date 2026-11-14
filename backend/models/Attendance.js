const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    studentId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Present', 'Absent'],
    },
  },
  { _id: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    courseId: {
      type: String,
      required: [true, 'Course ID is required'],
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: String,
      required: [true, 'Session date (YYYY-MM-DD) is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    lectureNumber: {
      type: Number,
      default: 1,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    markedByName: {
      type: String,
      trim: true,
      default: '',
    },
    records: [attendanceRecordSchema],
    presentCount: {
      type: Number,
      default: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
    },
    totalCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate counters before saving
attendanceSchema.pre('save', function (next) {
  if (this.records && Array.isArray(this.records)) {
    this.totalCount = this.records.length;
    this.presentCount = this.records.filter((r) => r.status === 'Present').length;
    this.absentCount = this.records.filter((r) => r.status === 'Absent').length;
  }
  next();
});

// Index to quickly look up attendance for a course on a given date
attendanceSchema.index({ courseId: 1, date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
