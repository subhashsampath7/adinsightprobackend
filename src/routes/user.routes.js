const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');

// ============================================
// PROFILE ROUTES
// ============================================

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile details
 * @access  Private (requires token)
 */
router.get('/profile', verifyToken, userController.getUserProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile (first time only)
 * @access  Private (requires token)
 */
router.put('/profile', verifyToken, validateProfileUpdate, userController.updateProfile);

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * @route   GET /api/user/dashboard
 * @desc    Get user dashboard data (stats, licenses, payments)
 * @access  Private (requires token)
 */
router.get('/dashboard', verifyToken, userController.getDashboardData);

module.exports = router;
