const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { userId, name, email, password, role } = req.body;

    if (!userId || !name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: userId, name, email, password, role',
      });
    }

    const cleanUserId = userId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user ID or Email already exists
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { userId: cleanUserId }],
    });

    if (existingUser) {
      const conflictField = existingUser.email === cleanEmail ? 'Email' : 'User ID';
      return res.status(400).json({
        success: false,
        message: `${conflictField} '${conflictField === 'Email' ? cleanEmail : cleanUserId}' is already registered.`,
      });
    }

    // Create user
    const user = await User.create({
      userId: cleanUserId,
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role.trim(),
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: `User '${user.name}' successfully registered as ${user.role}`,
      token,
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
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both User ID/Email and Password',
      });
    }

    const cleanIdentifier = identifier.trim();

    // Exact query matching identifier (email or userId) AND exact role
    const query = {
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { userId: cleanIdentifier },
        { userId: cleanIdentifier.toUpperCase() },
      ],
    };

    if (role) {
      query.role = role.trim();
    }

    const user = await User.findOne(query);

    // If no user found with matching identifier and role
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not registered for this role. Please contact Admin or register first.',
      });
    }

    // Compare password using bcrypt.compare
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password.',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}! Authenticated as ${user.role}.`,
      token,
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
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
