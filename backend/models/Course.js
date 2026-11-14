const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: [true, 'Course ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      required: [true, 'Course Name is required'],
      trim: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    facultyId: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    facultyName: {
      type: String,
      trim: true,
      default: 'Unassigned',
    },
    department: {
      type: String,
      default: 'School of Computer Science & Artificial Intelligence',
      trim: true,
    },
    semester: {
      type: Number,
      default: 3,
    },
    totalClasses: {
      type: Number,
      default: 40,
      min: [0, 'Total classes cannot be negative'],
    },
    status: {
      type: String,
      enum: ['Active', 'Archived'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
