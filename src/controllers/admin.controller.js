const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');
const { calculateDaysUntilExpiry } = require('../utils/generators');
const { 
    sendLicenseKeyEmail, 
    sendKYCStatusEmail, 
    sendPaymentFailedEmail,
    sendAccountSuspensionEmail,
    sendAccountActivationEmail
} = require('../services/email.service');
const { sendPaymentApprovalNotification } = require('../config/telegram');

// Admin login
const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        const [admins] = await promisePool.query(
            'SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE',
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const admin = admins[0];

        const isValidPassword = password === process.env.ADMIN_DEFAULT_PASSWORD ||
            await bcrypt.compare(password, admin.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        await promisePool.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id]);

        const token = jwt.sign(
            { adminId: admin.id, username: admin.username, role: admin.role, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                username: admin.username,
                role: admin.role,
                token
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const [totalUsers] = await promisePool.query('SELECT COUNT(*) as count FROM users');
        const [pendingKYC] = await promisePool.query('SELECT COUNT(*) as count FROM kyc_verifications WHERE status = "pending"');
        const [pendingPayments] = await promisePool.query('SELECT COUNT(*) as count FROM payments WHERE status = "pending"');
        const [activeLicenses] = await promisePool.query('SELECT COUNT(*) as count FROM licenses WHERE status = "active"');
        const [totalRevenue] = await promisePool.query('SELECT SUM(final_amount) as total FROM payments WHERE status = "success"');

        res.json({
            success: true,
            data: {
                totalUsers: totalUsers[0].count,
                pendingKYC: pendingKYC[0].count,
                pendingPayments: pendingPayments[0].count,
                activeLicenses: activeLicenses[0].count,
                totalRevenue: totalRevenue[0].total || 0
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get statistics' });
    }
};

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const [users] = await promisePool.query(
            `SELECT id, uid, email, first_name, middle_name, last_name, phone, 
             kyc_status, profile_completed, is_active, suspension_reason, created_at 
             FROM users 
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get users',
            error: error.message 
        });
    }
};

// Get user profile by ID
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const [users] = await promisePool.query(
            `SELECT id, uid, email, firebase_uid, email_verified, 
                    first_name, middle_name, last_name, address, phone, 
                    date_of_birth, gender, profile_completed, kyc_status, 
                    is_active, suspension_reason, created_at, updated_at
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

        res.json({
            success: true,
            data: users[0]
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

// Suspend user account
const suspendUser = async (req, res) => {
    try {
        const { userId, reason } = req.body;
        const adminId = req.admin.id;

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Suspension reason is required'
            });
        }

        const [users] = await promisePool.query(
            'SELECT id, email, first_name, middle_name, last_name, is_active FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        if (!user.is_active) {
            return res.status(400).json({
                success: false,
                message: 'User is already suspended'
            });
        }

        await promisePool.query(
            'UPDATE users SET is_active = 0, suspension_reason = ?, updated_at = NOW() WHERE id = ?',
            [reason, userId]
        );

        // Log the action (optional - only if audit_logs table exists)
        try {
            await promisePool.query(
                `INSERT INTO audit_logs (admin_id, action, target_table, target_id, old_values, new_values) 
                 VALUES (?, 'suspend_user', 'users', ?, ?, ?)`,
                [
                    adminId,
                    userId,
                    JSON.stringify({ is_active: 1 }),
                    JSON.stringify({ is_active: 0, suspension_reason: reason })
                ]
            );
        } catch (auditError) {
            console.log('Audit log skipped:', auditError.message);
        }

        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(part => part && part.trim())
            .join(' ') || 'User';

        // Send email (optional - only if email service is configured)
        try {
            await sendAccountSuspensionEmail(user.email, fullName, reason);
        } catch (emailError) {
            console.log('Email notification skipped:', emailError.message);
        }

        res.json({
            success: true,
            message: 'User account suspended successfully'
        });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to suspend user account',
            error: error.message
        });
    }
};

// Activate user account
const activateUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const adminId = req.admin.id;

        const [users] = await promisePool.query(
            'SELECT id, email, first_name, middle_name, last_name, is_active FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        if (user.is_active) {
            return res.status(400).json({
                success: false,
                message: 'User account is already active'
            });
        }

        await promisePool.query(
            'UPDATE users SET is_active = 1, suspension_reason = NULL, updated_at = NOW() WHERE id = ?',
            [userId]
        );

        // Log the action (optional)
        try {
            await promisePool.query(
                `INSERT INTO audit_logs (admin_id, action, target_table, target_id, old_values, new_values) 
                 VALUES (?, 'activate_user', 'users', ?, ?, ?)`,
                [
                    adminId,
                    userId,
                    JSON.stringify({ is_active: 0 }),
                    JSON.stringify({ is_active: 1 })
                ]
            );
        } catch (auditError) {
            console.log('Audit log skipped:', auditError.message);
        }

        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(part => part && part.trim())
            .join(' ') || 'User';

        // Send email (optional)
        try {
            await sendAccountActivationEmail(user.email, fullName);
        } catch (emailError) {
            console.log('Email notification skipped:', emailError.message);
        }

        res.json({
            success: true,
            message: 'User account activated successfully'
        });
    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate user account',
            error: error.message
        });
    }
};

// Get pending KYC verifications
const getPendingKYC = async (req, res) => {
    try {
        const [kyc] = await promisePool.query(
            `SELECT k.*, 
                    u.uid, u.email, u.first_name, u.middle_name, u.last_name,
                    k.user_id
             FROM kyc_verifications k 
             JOIN users u ON k.user_id = u.id 
             WHERE k.status = 'pending' 
             ORDER BY k.submitted_at DESC`
        );

        res.json({
            success: true,
            data: kyc
        });
    } catch (error) {
        console.error('Get pending KYC error:', error);
        res.status(500).json({ success: false, message: 'Failed to get KYC verifications' });
    }
};

// Review KYC verification
const reviewKYC = async (req, res) => {
    try {
        const { kycId, status, declineReason } = req.body;
        const adminId = req.admin.id;

        if (!['approved', 'declined'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        if (status === 'declined' && !declineReason) {
            return res.status(400).json({ success: false, message: 'Decline reason is required' });
        }

        await promisePool.query(
            'UPDATE kyc_verifications SET status = ?, decline_reason = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?',
            [status, declineReason, adminId, kycId]
        );

        const userStatus = status === 'approved' ? 'verified' : 'declined';
        const [kyc] = await promisePool.query('SELECT user_id FROM kyc_verifications WHERE id = ?', [kycId]);

        await promisePool.query(
            'UPDATE users SET kyc_status = ?, kyc_decline_reason = ? WHERE id = ?',
            [userStatus, declineReason, kyc[0].user_id]
        );

        const [users] = await promisePool.query(
            'SELECT email, first_name, middle_name, last_name FROM users WHERE id = ?',
            [kyc[0].user_id]
        );

        if (users.length > 0) {
            const user = users[0];
            const fullName = [user.first_name, user.middle_name, user.last_name]
                .filter(part => part && part.trim())
                .join(' ');

            try {
                await sendKYCStatusEmail(user.email, fullName, userStatus, declineReason);
            } catch (emailError) {
                console.log('Email notification skipped:', emailError.message);
            }
        }

        res.json({
            success: true,
            message: `KYC ${status} successfully`
        });
    } catch (error) {
        console.error('Review KYC error:', error);
        res.status(500).json({ success: false, message: 'Failed to review KYC' });
    }
};

// Get all payments
const getAllPayments = async (req, res) => {
    try {
        const [payments] = await promisePool.query(
            `SELECT p.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name, pl.duration_months 
             FROM payments p 
             JOIN users u ON p.user_id = u.id 
             JOIN pricing_plans pl ON p.plan_id = pl.id 
             ORDER BY p.created_at DESC`
        );

        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ success: false, message: 'Failed to get payments' });
    }
};

// Helper function to generate license key
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = 4;
    const segmentLength = 4;
    let key = '';

    for (let i = 0; i < segments; i++) {
        if (i > 0) key += '-';
        for (let j = 0; j < segmentLength; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }

    return key;
}

// Review payment
const reviewPayment = async (req, res) => {
    try {
        const { paymentId, status, declineReason } = req.body;

        if (!['success', 'declined'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "success" or "declined"'
            });
        }

        const [payments] = await promisePool.query(
            `SELECT p.*, u.email, u.first_name, u.middle_name, u.last_name, u.uid, pl.duration_months 
             FROM payments p 
             JOIN users u ON p.user_id = u.id 
             JOIN pricing_plans pl ON p.plan_id = pl.id 
             WHERE p.id = ? AND p.status = 'pending'`,
            [paymentId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found or already processed'
            });
        }

        const payment = payments[0];

        if (payment.payment_method === 'online') {
            return res.status(400).json({
                success: false,
                message: 'Online payments are automatically approved. Cannot manually review.'
            });
        }

        if (status === 'success') {
            const licenseKey = generateLicenseKey();
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + payment.duration_months);

            const connection = await promisePool.getConnection();
            await connection.beginTransaction();

            try {
                await connection.query(
                    'UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?',
                    ['success', paymentId]
                );

                await connection.query(
                    `INSERT INTO licenses (user_id, payment_id, license_key, plan_id, expires_at, status) 
                     VALUES (?, ?, ?, ?, ?, 'active')`,
                    [payment.user_id, paymentId, licenseKey, payment.plan_id, expiresAt]
                );

                await connection.commit();
                connection.release();

                const fullName = [payment.first_name, payment.middle_name, payment.last_name]
                    .filter(part => part && part.trim())
                    .join(' ');

                try {
                    await sendLicenseKeyEmail(payment.email, fullName, licenseKey, expiresAt);
                } catch (emailError) {
                    console.log('Email notification skipped:', emailError.message);
                }

                try {
                    await sendPaymentApprovalNotification(
                        {
                            uid: payment.uid,
                            email: payment.email,
                            first_name: payment.first_name,
                            middle_name: payment.middle_name,
                            last_name: payment.last_name
                        },
                        payment.final_amount,
                        licenseKey,
                        expiresAt
                    );
                } catch (telegramError) {
                    console.log('Telegram notification skipped:', telegramError.message);
                }

                res.json({
                    success: true,
                    message: 'Payment approved and license key generated successfully',
                    data: {
                        licenseKey,
                        expiresAt
                    }
                });
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } else if (status === 'declined') {
            if (!declineReason) {
                return res.status(400).json({
                    success: false,
                    message: 'Decline reason is required'
                });
            }

            await promisePool.query(
                'UPDATE payments SET status = ?, decline_reason = ?, updated_at = NOW() WHERE id = ?',
                ['declined', declineReason, paymentId]
            );

            const fullName = [payment.first_name, payment.middle_name, payment.last_name]
                .filter(part => part && part.trim())
                .join(' ');

            try {
                await sendPaymentFailedEmail(payment.email, fullName, declineReason);
            } catch (emailError) {
                console.log('Email notification skipped:', emailError.message);
            }

            res.json({
                success: true,
                message: 'Payment declined successfully'
            });
        }
    } catch (error) {
        console.error('Review payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review payment',
            error: error.message
        });
    }
};

// Get all licenses
const getAllLicenses = async (req, res) => {
    try {
        const [licenses] = await promisePool.query(
            `SELECT l.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name, p.duration_months 
             FROM licenses l 
             JOIN users u ON l.user_id = u.id 
             JOIN pricing_plans p ON l.plan_id = p.id 
             ORDER BY l.created_at DESC`
        );

        const licensesWithDays = licenses.map(license => ({
            ...license,
            daysRemaining: calculateDaysUntilExpiry(license.expires_at)
        }));

        res.json({
            success: true,
            data: licensesWithDays
        });
    } catch (error) {
        console.error('Get all licenses error:', error);
        res.status(500).json({ success: false, message: 'Failed to get licenses' });
    }
};

// Update pricing plan
const updatePricingPlan = async (req, res) => {
    try {
        const { planId, price, description, features } = req.body;

        await promisePool.query(
            'UPDATE pricing_plans SET price = ?, description = ?, features = ? WHERE id = ?',
            [price, description, JSON.stringify(features), planId]
        );

        res.json({
            success: true,
            message: 'Pricing plan updated successfully'
        });
    } catch (error) {
        console.error('Update pricing plan error:', error);
        res.status(500).json({ success: false, message: 'Failed to update pricing plan' });
    }
};

// Create discount code
const createDiscountCode = async (req, res) => {
    try {
        const { code, discountPercentage, maxUses, expiresAt } = req.body;

        await promisePool.query(
            'INSERT INTO discount_codes (code, discount_percentage, max_uses, expires_at) VALUES (?, ?, ?, ?)',
            [code, discountPercentage, maxUses, expiresAt || null]
        );

        res.json({
            success: true,
            message: 'Discount code created successfully'
        });
    } catch (error) {
        console.error('Create discount code error:', error);
        res.status(500).json({ success: false, message: 'Failed to create discount code' });
    }
};

// Get all discount codes
const getAllDiscountCodes = async (req, res) => {
    try {
        const [codes] = await promisePool.query(
            'SELECT * FROM discount_codes ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: codes
        });
    } catch (error) {
        console.error('Get discount codes error:', error);
        res.status(500).json({ success: false, message: 'Failed to get discount codes' });
    }
};

// Toggle discount code status
const toggleDiscountCode = async (req, res) => {
    try {
        const { codeId, isActive } = req.body;

        await promisePool.query(
            'UPDATE discount_codes SET is_active = ? WHERE id = ?',
            [isActive, codeId]
        );

        res.json({
            success: true,
            message: 'Discount code status updated'
        });
    } catch (error) {
        console.error('Toggle discount code error:', error);
        res.status(500).json({ success: false, message: 'Failed to update discount code' });
    }
};

module.exports = {
    adminLogin,
    getDashboardStats,
    getAllUsers,
    getUserProfile,
    suspendUser,
    activateUser,
    getPendingKYC,
    reviewKYC,
    getAllPayments,
    reviewPayment,
    getAllLicenses,
    updatePricingPlan,
    createDiscountCode,
    getAllDiscountCodes,
    toggleDiscountCode
};
