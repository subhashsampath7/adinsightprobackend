const { promisePool } = require('../config/database');
const { sendWelcomeEmail } = require('../services/email.service');

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { firstName, middleName, lastName, address, phone, dateOfBirth, gender } = req.body;
        const userId = req.user.id;

        // ✅ Check if account is suspended
        const [userCheck] = await promisePool.query(
            'SELECT profile_completed, is_active FROM users WHERE id = ?',
            [userId]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // ✅ Check if account is suspended
        if (userCheck[0].is_active === 0 || userCheck[0].is_active === false) {
            return res.status(403).json({
                success: false,
                message: 'Your account is suspended. Profile updates are not allowed.',
                suspended: true
            });
        }

        // Check if profile already completed
        if (userCheck[0].profile_completed) {
            return res.status(400).json({
                success: false,
                message: 'Profile already completed and cannot be edited'
            });
        }

        // Update user profile
        await promisePool.query(
            `UPDATE users SET 
             first_name = ?, middle_name = ?, last_name = ?, address = ?, 
             phone = ?, date_of_birth = ?, gender = ?, profile_completed = TRUE 
             WHERE id = ?`,
            [firstName, middleName, lastName, address, phone, dateOfBirth, gender, userId]
        );

        // Send welcome email with name
        const [users] = await promisePool.query('SELECT email, uid FROM users WHERE id = ?', [userId]);
        
        const fullName = [firstName, middleName, lastName]
            .filter(part => part && part.trim())
            .join(' ');

        try {
            await sendWelcomeEmail(users[0].email, fullName, users[0].uid);
        } catch (emailError) {
            console.log('Welcome email skipped:', emailError.message);
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update profile',
            error: error.message 
        });
    }
};

// Get user dashboard data
const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // ✅ Get user info with ALL fields (including suspension data)
        const [users] = await promisePool.query(
            `SELECT id, uid, email, first_name, middle_name, last_name, 
                    kyc_status, kyc_decline_reason, profile_completed, 
                    is_active, suspension_reason 
             FROM users 
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // ✅ If account is suspended, return limited data (no licenses/payments)
        if (user.is_active === 0 || user.is_active === false) {
            console.log('⚠️ Suspended user accessing dashboard:', user.email);
            return res.json({
                success: true,
                data: {
                    user: user,
                    activeLicenses: [],
                    pendingPayments: [],
                    suspended: true
                }
            });
        }

        // ✅ Get active licenses (only for active accounts)
        const [licenses] = await promisePool.query(
            `SELECT l.*, p.duration_months 
             FROM licenses l 
             JOIN pricing_plans p ON l.plan_id = p.id 
             WHERE l.user_id = ? AND l.status = 'active'
             ORDER BY l.created_at DESC`,
            [userId]
        );

        // ✅ Get pending payments (only for active accounts)
        const [payments] = await promisePool.query(
            `SELECT p.*, pl.duration_months 
             FROM payments p 
             JOIN pricing_plans pl ON p.plan_id = pl.id 
             WHERE p.user_id = ? AND p.status = 'pending'
             ORDER BY p.created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                user: user,
                activeLicenses: licenses,
                pendingPayments: payments,
                suspended: false
            }
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get dashboard data',
            error: error.message 
        });
    }
};

// ✅ Get user profile details
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await promisePool.query(
            `SELECT id, uid, email, firebase_uid, email_verified,
                    first_name, middle_name, last_name, address, phone,
                    date_of_birth, gender, profile_completed, kyc_status,
                    kyc_decline_reason, is_active, suspension_reason,
                    created_at, updated_at
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // ✅ Log if suspended user is accessing profile
        if (user.is_active === 0 || user.is_active === false) {
            console.log('⚠️ Suspended user accessing profile:', user.email);
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile',
            error: error.message
        });
    }
};

module.exports = {
    updateProfile,
    getDashboardData,
    getUserProfile
};
