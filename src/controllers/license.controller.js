const { promisePool } = require('../config/database');
const { generateUniqueLicenseKey, calculateExpiryDate, calculateDaysUntilExpiry } = require('../utils/generators');
const { sendLicenseKeyEmail } = require('../services/email.service');

// Activate license key (from extension)
const activateLicense = async(req, res) => {
    try {
        const { key, extensionName } = req.body;

        if (!key) {
            return res.status(400).json({ success: false, message: 'License key is required' });
        }

        // Check license in database
        const [licenses] = await promisePool.query(
            `SELECT l.*, u.email, u.first_name, u.last_name 
       FROM licenses l 
       JOIN users u ON l.user_id = u.id 
       WHERE l.license_key = ?`, [key]
        );

        if (licenses.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid license key' });
        }

        const license = licenses[0];

        // Check if expired
        if (license.status === 'expired') {
            return res.status(400).json({ success: false, message: 'License key has expired' });
        }

        // Check if revoked
        if (license.status === 'revoked') {
            return res.status(400).json({ success: false, message: 'License key has been revoked' });
        }

        // Check expiry date
        if (new Date(license.expires_at) < new Date()) {
            await promisePool.query('UPDATE licenses SET status = ? WHERE id = ?', ['expired', license.id]);
            return res.status(400).json({ success: false, message: 'License key has expired' });
        }

        // Update activated_at if first activation
        if (!license.activated_at) {
            await promisePool.query('UPDATE licenses SET activated_at = NOW() WHERE id = ?', [license.id]);
        }

        res.json({
            success: true,
            message: 'License valid',
            data: {
                expiresAt: license.expires_at,
                daysRemaining: calculateDaysUntilExpiry(license.expires_at)
            }
        });
    } catch (error) {
        console.error('License activation error:', error);
        res.status(500).json({ success: false, message: 'License activation failed' });
    }
};

// Get user licenses
const getUserLicenses = async(req, res) => {
    try {
        const userId = req.user.id;

        const [licenses] = await promisePool.query(
            `SELECT l.*, p.duration_months, p.description 
       FROM licenses l 
       JOIN pricing_plans p ON l.plan_id = p.id 
       WHERE l.user_id = ? 
       ORDER BY l.created_at DESC`, [userId]
        );

        // Calculate days remaining for each license
        const licensesWithDays = licenses.map(license => ({
            ...license,
            daysRemaining: calculateDaysUntilExpiry(license.expires_at)
        }));

        res.json({
            success: true,
            data: licensesWithDays
        });
    } catch (error) {
        console.error('Get user licenses error:', error);
        res.status(500).json({ success: false, message: 'Failed to get licenses' });
    }
};

module.exports = {
    activateLicense,
    getUserLicenses
};