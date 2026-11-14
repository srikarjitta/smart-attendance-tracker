const jwt = require('jsonwebtoken');

/**
 * Generate signed JWT token
 * @param {string} id User MongoDB _id
 * @param {string} role User role ('Admin' | 'Faculty' | 'Student')
 * @returns {string} Signed JWT token
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'sru_hackathon_2026_secret_key',
    {
      expiresIn: '7d',
    }
  );
};

module.exports = generateToken;
