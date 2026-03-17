const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { verifyFirebaseToken } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Google Sign-In
router.post('/google', async(req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'ID token is required'
            });
        }

        console.log('🔐 Verifying Firebase token...');

        // Verify Firebase token using your existing function
        const verificationResult = await verifyFirebaseToken(idToken);

        if (!verificationResult.success) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Firebase token',
                error: verificationResult.error
            });
        }

        const { uid, email } = verificationResult;
        console.log('✅ Token verified:', { uid, email });

        // Check if user exists
        const [users] = await promisePool.query(
            'SELECT * FROM users WHERE firebase_uid = ?', [uid]
        );

        let user;

        if (users.length === 0) {
            console.log('📝 Creating new user...');

            // Generate unique 6-digit UID
            let userUid;
            let isUnique = false;

            while (!isUnique) {
                userUid = Math.floor(100000 + Math.random() * 900000).toString();
                const [existing] = await promisePool.query(
                    'SELECT id FROM users WHERE uid = ?', [userUid]
                );
                if (existing.length === 0) {
                    isUnique = true;
                }
            }

            // Create new user
            const [result] = await promisePool.query(
                `INSERT INTO users (uid, email, firebase_uid, email_verified) 
         VALUES (?, ?, ?, ?)`, [userUid, email, uid, 1]
            );

            // Get created user
            const [newUser] = await promisePool.query(
                'SELECT * FROM users WHERE id = ?', [result.insertId]
            );
            user = newUser[0];

            console.log('✅ User created:', user.uid);
        } else {
            user = users[0];
            console.log('✅ Existing user:', user.uid);

            // Update email verification status
            if (!user.email_verified) {
                await promisePool.query(
                    'UPDATE users SET email_verified = 1 WHERE id = ?', [user.id]
                );
                user.email_verified = 1;
            }
        }

        // Generate JWT token
        const token = jwt.sign({
                userId: user.id,
                uid: user.uid,
                email: user.email
            },
            process.env.JWT_SECRET, { expiresIn: '30d' }
        );

        console.log('✅ JWT token generated');

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                uid: user.uid,
                email: user.email,
                email_verified: user.email_verified,
                first_name: user.first_name,
                middle_name: user.middle_name,
                last_name: user.last_name,
                address: user.address,
                phone: user.phone,
                date_of_birth: user.date_of_birth,
                gender: user.gender,
                profile_completed: user.profile_completed,
                kyc_status: user.kyc_status
            }
        });

    } catch (error) {
        console.error('❌ Google auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: error.message
        });
    }
});

// Get current user - UPDATED TO FETCH FROM DATABASE
router.get('/me', verifyToken, async(req, res) => {
    try {
        console.log('📥 GET /auth/me - User ID:', req.user.id || req.user.userId);

        // Fetch fresh user data from database
        const [users] = await promisePool.query(
            'SELECT * FROM users WHERE id = ?', [req.user.id || req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        console.log('✅ User found:', {
            id: user.id,
            uid: user.uid,
            email: user.email,
            profile_completed: user.profile_completed,
            phone: user.phone,
            gender: user.gender,
            address: user.address ? user.address.substring(0, 30) + '...' : null,
            date_of_birth: user.date_of_birth
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                uid: user.uid,
                email: user.email,
                email_verified: user.email_verified,
                first_name: user.first_name,
                middle_name: user.middle_name,
                last_name: user.last_name,
                address: user.address,
                phone: user.phone,
                date_of_birth: user.date_of_birth,
                gender: user.gender,
                profile_completed: user.profile_completed,
                kyc_status: user.kyc_status,
                kyc_decline_reason: user.kyc_decline_reason,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });
    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user data',
            error: error.message
        });
    }
});

// Legacy routes (if you still need them)
router.post('/register', (req, res) => {
    res.status(400).json({
        success: false,
        message: 'Please use Google Sign-In'
    });
});

router.post('/login', (req, res) => {
    res.status(400).json({
        success: false,
        message: 'Please use Google Sign-In'
    });
});

module.exports = router;