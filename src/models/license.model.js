const db = require('../config/database');

class License {
    // Create license
    static async create(licenseData) {
        const query = `
      INSERT INTO licenses (
        user_id, payment_id, license_key, duration_months,
        expires_at, status
      ) VALUES (?, ?, ?, ?, ?, 'active')
    `;

        const values = [
            licenseData.userId,
            licenseData.paymentId,
            licenseData.licenseKey,
            licenseData.durationMonths,
            licenseData.expiresAt
        ];

        const [result] = await db.execute(query, values);
        return result.insertId;
    }

    // Find license by ID
    static async findById(licenseId) {
        const query = `
      SELECT l.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `;

        const [rows] = await db.execute(query, [licenseId]);
        return rows[0];
    }

    // Find license by key
    static async findByKey(licenseKey) {
        const query = `
      SELECT l.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.license_key = ?
    `;

        const [rows] = await db.execute(query, [licenseKey]);
        return rows[0];
    }

    // Find licenses by user ID
    static async findByUserId(userId) {
        const query = `
      SELECT l.*,
             DATEDIFF(l.expires_at, NOW()) as daysRemaining
      FROM licenses l
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `;

        const [rows] = await db.execute(query, [userId]);
        return rows;
    }

    // Get all licenses (admin)
    static async getAll() {
        const query = `
      SELECT l.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name,
             DATEDIFF(l.expires_at, NOW()) as daysRemaining
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Get active licenses
    static async getActive() {
        const query = `
      SELECT l.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name,
             DATEDIFF(l.expires_at, NOW()) as daysRemaining
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active' AND l.expires_at > NOW()
      ORDER BY l.expires_at ASC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Get expiring licenses (within days)
    static async getExpiring(days = 5) {
        const query = `
      SELECT l.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name,
             DATEDIFF(l.expires_at, NOW()) as daysRemaining
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active' 
        AND l.expires_at > NOW()
        AND l.expires_at <= DATE_ADD(NOW(), INTERVAL ? DAY)
      ORDER BY l.expires_at ASC
    `;

        const [rows] = await db.execute(query, [days]);
        return rows;
    }

    // Get expired licenses
    static async getExpired() {
        const query = `
      SELECT l.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active' AND l.expires_at <= NOW()
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Update license status
    static async updateStatus(licenseId, status) {
        const query = `
      UPDATE licenses 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const [result] = await db.execute(query, [status, licenseId]);
        return result.affectedRows > 0;
    }

    // Mark license as expired
    static async markExpired(licenseId) {
        return await this.updateStatus(licenseId, 'expired');
    }

    // Revoke license
    static async revoke(licenseId) {
        return await this.updateStatus(licenseId, 'revoked');
    }

    // Update last activated timestamp
    static async updateLastActivated(licenseId) {
        const query = `
      UPDATE licenses 
      SET last_activated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const [result] = await db.execute(query, [licenseId]);
        return result.affectedRows > 0;
    }

    // Check if license key exists
    static async keyExists(licenseKey) {
        const query = 'SELECT id FROM licenses WHERE license_key = ?';
        const [rows] = await db.execute(query, [licenseKey]);
        return rows.length > 0;
    }

    // Validate license (for extension)
    static async validate(licenseKey) {
        const query = `
      SELECT l.*, u.uid, u.email
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.license_key = ? 
        AND l.status = 'active'
        AND l.expires_at > NOW()
    `;

        const [rows] = await db.execute(query, [licenseKey]);
        return rows[0];
    }

    // Get license statistics
    static async getStats() {
        const query = `
      SELECT 
        COUNT(*) as total_licenses,
        SUM(CASE WHEN status = 'active' AND expires_at > NOW() THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'expired' OR expires_at <= NOW() THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked
      FROM licenses
    `;

        const [rows] = await db.execute(query);
        return rows[0];
    }

    // Get user's active licenses
    static async getUserActiveLicenses(userId) {
        const query = `
      SELECT l.*,
             DATEDIFF(l.expires_at, NOW()) as daysRemaining
      FROM licenses l
      WHERE l.user_id = ? 
        AND l.status = 'active'
        AND l.expires_at > NOW()
      ORDER BY l.expires_at DESC
    `;

        const [rows] = await db.execute(query, [userId]);
        return rows;
    }

    // Delete license
    static async delete(licenseId) {
        const query = 'DELETE FROM licenses WHERE id = ?';
        const [result] = await db.execute(query, [licenseId]);
        return result.affectedRows > 0;
    }
}

module.exports = License;