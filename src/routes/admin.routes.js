const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyAdminToken } = require('../middleware/auth');
const { validateAdminLogin, validateDiscountCode } = require('../middleware/validation');

// Admin login
router.post('/login', validateAdminLogin, adminController.adminLogin);

// Dashboard stats
router.get('/stats', verifyAdminToken, adminController.getDashboardStats);

// Users management
router.get('/users', verifyAdminToken, adminController.getAllUsers);
router.get('/users/:userId', verifyAdminToken, adminController.getUserProfile);
router.post('/users/suspend', verifyAdminToken, adminController.suspendUser); // ✅ NEW
router.post('/users/activate', verifyAdminToken, adminController.activateUser); // ✅ NEW

// KYC management
router.get('/kyc/pending', verifyAdminToken, adminController.getPendingKYC);
router.post('/kyc/review', verifyAdminToken, adminController.reviewKYC);

// Payments management
router.get('/payments', verifyAdminToken, adminController.getAllPayments);
router.post('/payments/review', verifyAdminToken, adminController.reviewPayment);

// Licenses management
router.get('/licenses', verifyAdminToken, adminController.getAllLicenses);

// Pricing management
router.put('/pricing/update', verifyAdminToken, adminController.updatePricingPlan);

// Discount codes management
router.get('/discount-codes', verifyAdminToken, adminController.getAllDiscountCodes);
router.post('/discount-codes/create', verifyAdminToken, validateDiscountCode, adminController.createDiscountCode);
router.put('/discount-codes/toggle', verifyAdminToken, adminController.toggleDiscountCode);

module.exports = router;
