const { promisePool } = require('../config/database');
const { sendKYCNotification } = require('../config/telegram');

// Submit KYC verification
const submitKYC = async (req, res) => {
    try {
        const { documentType } = req.body;
        const userId = req.user.id;
        const files = req.files;

        // Validate files based on document type
        if (documentType === 'nic' && (!files.front || !files.back)) {
            return res.status(400).json({
                success: false,
                message: 'Both front and back images required for NIC'
            });
        }

        if ((documentType === 'passport' || documentType === 'driving_license') && !files.front) {
            return res.status(400).json({
                success: false,
                message: 'Document image is required'
            });
        }

        // Check if KYC already submitted or verified
        const [existingKYC] = await promisePool.query(
            'SELECT status FROM kyc_verifications WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [userId]
        );

        if (existingKYC.length > 0 && ['pending', 'approved'].includes(existingKYC[0].status)) {
            return res.status(400).json({
                success: false,
                message: 'KYC verification already submitted or approved'
            });
        }

        // Insert KYC verification
        const frontImage = files.front ? files.front[0].filename : null;
        const backImage = files.back ? files.back[0].filename : null;

        await promisePool.query(
            `INSERT INTO kyc_verifications (user_id, document_type, document_front_image, document_back_image, status) 
             VALUES (?, ?, ?, ?, 'pending')`,
            [userId, documentType, frontImage, backImage]
        );

        // Update user KYC status
        await promisePool.query(
            'UPDATE users SET kyc_status = ? WHERE id = ?',
            ['submitted', userId]
        );

        // Send Telegram notification
        const [users] = await promisePool.query(
            'SELECT uid, email, first_name, middle_name, last_name FROM users WHERE id = ?',
            [userId]
        );

        if (users.length > 0) {
            await sendKYCNotification(users[0], documentType);
        }

        res.json({
            success: true,
            message: 'KYC verification submitted successfully'
        });
    } catch (error) {
        console.error('KYC submission error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit KYC verification' });
    }
};

// Get KYC status
const getKYCStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const [kyc] = await promisePool.query(
            `SELECT document_type, status, decline_reason, submitted_at, reviewed_at 
             FROM kyc_verifications 
             WHERE user_id = ? 
             ORDER BY id DESC LIMIT 1`,
            [userId]
        );

        if (kyc.length === 0) {
            return res.json({
                success: true,
                data: { status: 'not_submitted' }
            });
        }

        res.json({
            success: true,
            data: kyc[0]
        });
    } catch (error) {
        console.error('Get KYC status error:', error);
        res.status(500).json({ success: false, message: 'Failed to get KYC status' });
    }
};

module.exports = {
    submitKYC,
    getKYCStatus
};
