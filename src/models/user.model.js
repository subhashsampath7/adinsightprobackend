const db = require('../config/database');

class User {
    // Create new user
    static async create(userData) {
        const query = `
      INSERT INTO users (
        firebase_uid, email, uid, first_name, middle_name, last_name,
        address, phone, date_of_birth, gender, profile_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            userData.firebaseUid,
            userData.email,
            userData.uid,
            userData.firstName || null,
            userData.middleName || null,
            userData.lastName || null,
            userData.address || null,
            userData.phone || null,
            userData.dateOfBirth || null,
            userData.gender || null,
            userData.profileCompleted || false
        ];

        const [result] = await db.execute(query, values);
        return result.insertId;
    }

    // Find user by ID
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }

    // Find user by Firebase UID
    static async findByFirebaseUid(firebaseUid) {
        const query = 'SELECT * FROM users WHERE firebase_uid = ?';
        const [rows] = await db.execute(query, [firebaseUid]);
        return rows[0];
    }

    // Find user by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(query, [email]);
        return rows[0];
    }

    // Find user by UID
    static async findByUid(uid) {
        const query = 'SELECT * FROM users WHERE uid = ?';
        const [rows] = await db.execute(query, [uid]);
        return rows[0];
    }

    // Update user profile
    static async updateProfile(userId, profileData) {
        const query = `
      UPDATE users 
      SET first_name = ?, middle_name = ?, last_name = ?,
          address = ?, phone = ?, date_of_birth = ?, gender = ?,
          profile_completed = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const values = [
            profileData.firstName,
            profileData.middleName || null,
            profileData.lastName,
            profileData.address,
            profileData.phone,
            profileData.dateOfBirth,
            profileData.gender,
            userId
        ];

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Update KYC status
    static async updateKYCStatus(userId, status) {
        const query = `
      UPDATE users 
      SET kyc_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const [result] = await db.execute(query, [status, userId]);
        return result.affectedRows > 0;
    }

    // Get all users (admin)
    static async getAll() {
        const query = `
      SELECT id, uid, firebase_uid, email, first_name, middle_name, last_name,
             phone, address, date_of_birth, gender, kyc_status, 
             profile_completed, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Get user statistics
    static async getStats() {
        const query = `
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN profile_completed = true THEN 1 ELSE 0 END) as completed_profiles,
        SUM(CASE WHEN kyc_status = 'verified' THEN 1 ELSE 0 END) as verified_users,
        SUM(CASE WHEN kyc_status = 'pending' THEN 1 ELSE 0 END) as pending_kyc
      FROM users
    `;

        const [rows] = await db.execute(query);
        return rows[0];
    }

    // Check if email exists
    static async emailExists(email) {
        const query = 'SELECT id FROM users WHERE email = ?';
        const [rows] = await db.execute(query, [email]);
        return rows.length > 0;
    }

    // Check if UID exists
    static async uidExists(uid) {
        const query = 'SELECT id FROM users WHERE uid = ?';
        const [rows] = await db.execute(query, [uid]);
        return rows.length > 0;
    }

    // Delete user (soft delete - for future use)
    static async delete(userId) {
        const query = 'DELETE FROM users WHERE id = ?';
        const [result] = await db.execute(query, [userId]);
        return result.affectedRows > 0;
    }
}

module.exports = User;