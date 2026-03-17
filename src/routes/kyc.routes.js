const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kyc.controller');
const { verifyToken, checkProfileCompleted } = require('../middleware/auth');
const { uploadKYC } = require('../middleware/upload');
const { validateKYC } = require('../middleware/validation');

// Submit KYC
router.post('/submit',
    verifyToken,
    checkProfileCompleted,
    uploadKYC.fields([
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 }
    ]),
    validateKYC,
    kycController.submitKYC
);

// Get KYC status
router.get('/status', verifyToken, kycController.getKYCStatus);

module.exports = router;
