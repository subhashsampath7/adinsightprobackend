const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');
const { verifyFirebaseToken } = require('../config/firebase');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [users] = await promisePool.query(
            'SELECT id, uid, email, first_name, last_name, kyc_status, profile_completed, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const user = users[0];

        // ✅ Check if user account is suspended
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Please contact support for more information.',
                suspended: true
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Verify admin token
const verifyAdminToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const [admins] = await promisePool.query(
            'SELECT id, username, email, role FROM admin_users WHERE id = ? AND is_active = TRUE',
            [decoded.adminId]
        );

        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: 'Admin not found' });
        }

        req.admin = admins[0];
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Check if profile is completed
const checkProfileCompleted = async (req, res, next) => {
    if (!req.user.profile_completed) {
        return res.status(403).json({
            success: false,
            message: 'Please complete your profile first',
            requiresProfileCompletion: true
        });
    }
    next();
};

// Check if KYC is verified
const checkKYCVerified = async (req, res, next) => {
    if (req.user.kyc_status !== 'verified') {
        return res.status(403).json({
            success: false,
            message: 'KYC verification required',
            requiresKYC: true,
            kycStatus: req.user.kyc_status
        });
    }
    next();
};

module.exports = {
    verifyToken,
    verifyAdminToken,
    checkProfileCompleted,
    checkKYCVerified
};
