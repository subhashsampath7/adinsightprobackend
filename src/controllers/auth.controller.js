const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { promisePool } = require('../config/database');
const { verifyFirebaseToken } = require('../config/firebase');
const { generateUniqueUID } = require('../utils/generators');
const { sendWelcomeEmail } = require('../services/email.service');

// Register user with Firebase
const register = async(req, res) => {
    try {
        const { email, firebaseUid, idToken } = req.body;

        // Verify Firebase token
        const verification = await verifyFirebaseToken(idToken);
        if (!verification.success) {
            return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
        }

        // Check if user already exists
        const [existingUsers] = await promisePool.query(
            'SELECT id FROM users WHERE email = ? OR firebase_uid = ?', [email, firebaseUid]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Generate unique UID
        const uid = await generateUniqueUID(promisePool);

        // Create user
        const [result] = await promisePool.query(
            'INSERT INTO users (uid, email, firebase_uid, email_verified) VALUES (?, ?, ?, TRUE)', [uid, email, firebaseUid]
        );

        // Generate JWT token
        const token = jwt.sign({ userId: result.insertId, email, uid },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Send welcome email
        await sendWelcomeEmail(email, 'User', uid);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                uid,
                email,
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
};

// Login user with Firebase
const login = async(req, res) => {
    try {
        const { idToken } = req.body;

        // Verify Firebase token
        const verification = await verifyFirebaseToken(idToken);
        if (!verification.success) {
            return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
        }

        // Get user from database
        const [users] = await promisePool.query(
            'SELECT * FROM users WHERE firebase_uid = ?', [verification.uid]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];

        // Generate JWT token
        const token = jwt.sign({ userId: user.id, email: user.email, uid: user.uid },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                uid: user.uid,
                email: user.email,
                profileCompleted: user.profile_completed,
                kycStatus: user.kyc_status,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

// Get current user
const getCurrentUser = async(req, res) => {
    try {
        const [users] = await promisePool.query(
            `SELECT id, uid, email, first_name, middle_name, last_name, address, phone, 
       date_of_birth, gender, profile_completed, kyc_status, kyc_decline_reason, created_at 
       FROM users WHERE id = ?`, [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Failed to get user data' });
    }
};

module.exports = {
    register,
    login,
    getCurrentUser
};