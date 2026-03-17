const db = require('../config/database');

class KYC {
    // Create KYC verification
    static async create(kycData) {
        const query = `
      INSERT INTO kyc_verifications (
        user_id, document_type, document_front_image, 
        document_back_image, status, submitted_at
      ) VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `;

        const values = [
            kycData.userId,
            kycData.documentType,
            kycData.frontImage,
            kycData.backImage || null
        ];

        const [result] = await db.execute(query, values);
        return result.insertId;
    }

    // Find KYC by user ID
    static async findByUserId(userId) {
        const query = `
      SELECT k.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      WHERE k.user_id = ?
      ORDER BY k.submitted_at DESC
      LIMIT 1
    `;

        const [rows] = await db.execute(query, [userId]);
        return rows[0];
    }

    // Find KYC by ID
    static async findById(kycId) {
        const query = `
      SELECT k.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      WHERE k.id = ?
    `;

        const [rows] = await db.execute(query, [kycId]);
        return rows[0];
    }

    // Get all pending KYC verifications
    static async getPending() {
        const query = `
      SELECT k.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      WHERE k.status = 'pending'
      ORDER BY k.submitted_at ASC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Get all KYC verifications (admin)
    static async getAll() {
        const query = `
      SELECT k.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      ORDER BY k.submitted_at DESC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Update KYC status
    static async updateStatus(kycId, status, reviewedBy, declineReason = null) {
        const query = `
      UPDATE kyc_verifications 
      SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
          decline_reason = ?
      WHERE id = ?
    `;

        const values = [status, reviewedBy, declineReason, kycId];
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Check if user has pending KYC
    static async hasPendingKYC(userId) {
        const query = `
      SELECT id FROM kyc_verifications 
      WHERE user_id = ? AND status = 'pending'
    `;

        const [rows] = await db.execute(query, [userId]);
        return rows.length > 0;
    }

    // Check if user has verified KYC
    static async hasVerifiedKYC(userId) {
        const query = `
      SELECT id FROM kyc_verifications 
      WHERE user_id = ? AND status = 'approved'
    `;

        const [rows] = await db.execute(query, [userId]);
        return rows.length > 0;
    }

    // Get KYC statistics
    static async getStats() {
        const query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined
      FROM kyc_verifications
    `;

        const [rows] = await db.execute(query);
        return rows[0];
    }

    // Delete KYC (for resubmission)
    static async delete(kycId) {
        const query = 'DELETE FROM kyc_verifications WHERE id = ?';
        const [result] = await db.execute(query, [kycId]);
        return result.affectedRows > 0;
    }
}

module.exports = KYC;