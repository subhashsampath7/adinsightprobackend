const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyToken, checkProfileCompleted, checkKYCVerified } = require('../middleware/auth');
const { uploadPayment } = require('../middleware/upload');
const { validatePayment } = require('../middleware/validation');

// Get pricing plans (public)
router.get('/plans', paymentController.getPricingPlans);

// Validate discount code (authenticated)
router.post('/validate-discount', verifyToken, paymentController.validateDiscountCode);

// Create payment record
router.post('/create',
    verifyToken,
    checkProfileCompleted,
    checkKYCVerified,
    validatePayment,
    paymentController.createPayment
);

// Create Stripe Checkout Session (NEW)
router.post('/create-checkout-session',
    verifyToken,
    paymentController.createStripeCheckoutSession
);

// Verify Stripe Payment (NEW)
router.post('/verify-stripe-payment',
    verifyToken,
    paymentController.verifyStripePayment
);

// Upload payment proof (bank transfer)
router.post('/upload-proof',
    verifyToken,
    uploadPayment.single('proof'),
    paymentController.uploadPaymentProof
);

// Get user payments
router.get('/my-payments', verifyToken, paymentController.getUserPayments);

module.exports = router;