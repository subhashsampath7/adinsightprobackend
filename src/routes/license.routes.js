const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/license.controller');
const { verifyToken } = require('../middleware/auth');

// Activate license (from extension - no auth required)
router.post('/activation', licenseController.activateLicense);

// Get user licenses
router.get('/my-licenses', verifyToken, licenseController.getUserLicenses);

module.exports = router;