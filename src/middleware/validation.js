const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    next();
};

// Registration validation
const validateRegistration = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('firebaseUid').notEmpty().withMessage('Firebase UID is required'),
    handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('phone').matches(/^[0-9+\-\s()]+$/).withMessage('Valid phone number is required'),
    body('dateOfBirth').isDate().withMessage('Valid date of birth is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
    handleValidationErrors
];

// KYC validation
const validateKYC = [
    body('documentType').isIn(['nic', 'passport', 'driving_license']).withMessage('Valid document type is required'),
    handleValidationErrors
];

// Payment validation
const validatePayment = [
    body('planId').isInt().withMessage('Valid plan ID is required'),
    body('paymentMethod').isIn(['online', 'bank_transfer']).withMessage('Valid payment method is required'),
    handleValidationErrors
];

// Discount code validation
const validateDiscountCode = [
    body('code').trim().notEmpty().withMessage('Discount code is required'),
    body('discountPercentage').isFloat({ min: 0, max: 100 }).withMessage('Valid discount percentage is required'),
    body('maxUses').isInt({ min: 1 }).withMessage('Valid max uses is required'),
    handleValidationErrors
];

// Admin login validation
const validateAdminLogin = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateProfileUpdate,
    validateKYC,
    validatePayment,
    validateDiscountCode,
    validateAdminLogin,
    handleValidationErrors
};