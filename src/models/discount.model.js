const db = require('../config/database');

class Discount {
    // Create discount code
    static async create(discountData) {
        const query = `
      INSERT INTO discount_codes (
        code, discount_percentage, max_uses, current_uses,
        expires_at, is_active
      ) VALUES (?, ?, ?, 0, ?, true)
    `;

        const values = [
            discountData.code.toUpperCase(),
            discountData.discountPercentage,
            discountData.maxUses,
            discountData.expiresAt || null
        ];

        const [result] = await db.execute(query, values);
        return result.insertId;
    }

    // Find discount by ID
    static async findById(discountId) {
        const query = 'SELECT * FROM discount_codes WHERE id = ?';
        const [rows] = await db.execute(query, [discountId]);
        return rows[0];
    }

    // Find discount by code
    static async findByCode(code) {
        const query = 'SELECT * FROM discount_codes WHERE code = ?';
        const [rows] = await db.execute(query, [code.toUpperCase()]);
        return rows[0];
    }

    // Get all discount codes
    static async getAll() {
        const query = `
      SELECT * FROM discount_codes 
      ORDER BY created_at DESC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Get active discount codes
    static async getActive() {
        const query = `
      SELECT * FROM discount_codes 
      WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND current_uses < max_uses
      ORDER BY created_at DESC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Validate discount code
    static async validate(code) {
        const query = `
      SELECT * FROM discount_codes 
      WHERE code = ?
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND current_uses < max_uses
    `;

        const [rows] = await db.execute(query, [code.toUpperCase()]);
        return rows[0];
    }

    // Increment usage count
    static async incrementUsage(discountId) {
        const query = `
      UPDATE discount_codes 
      SET current_uses = current_uses + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const [result] = await db.execute(query, [discountId]);
        return result.affectedRows > 0;
    }

    // Toggle active status
    static async toggleActive(discountId, isActive) {
        const query = `
      UPDATE discount_codes 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const [result] = await db.execute(query, [isActive, discountId]);
        return result.affectedRows > 0;
    }

    // Update discount code
    static async update(discountId, updateData) {
        const query = `
      UPDATE discount_codes 
      SET discount_percentage = ?, max_uses = ?, expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const values = [
            updateData.discountPercentage,
            updateData.maxUses,
            updateData.expiresAt || null,
            discountId
        ];

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Check if code exists
    static async codeExists(code) {
        const query = 'SELECT id FROM discount_codes WHERE code = ?';
        const [rows] = await db.execute(query, [code.toUpperCase()]);
        return rows.length > 0;
    }

    // Get discount statistics
    static async getStats() {
        const query = `
      SELECT 
        COUNT(*) as total_codes,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_codes,
        SUM(current_uses) as total_uses,
        AVG(discount_percentage) as avg_discount
      FROM discount_codes
    `;

        const [rows] = await db.execute(query);
        return rows[0];
    }

    // Get expired codes
    static async getExpired() {
        const query = `
      SELECT * FROM discount_codes 
      WHERE expires_at IS NOT NULL AND expires_at <= NOW()
      ORDER BY expires_at DESC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Get fully used codes
    static async getFullyUsed() {
        const query = `
      SELECT * FROM discount_codes 
      WHERE current_uses >= max_uses
      ORDER BY updated_at DESC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Delete discount code
    static async delete(discountId) {
        const query = 'DELETE FROM discount_codes WHERE id = ?';
        const [result] = await db.execute(query, [discountId]);
        return result.affectedRows > 0;
    }

    // Deactivate expired codes (cron job)
    static async deactivateExpired() {
        const query = `
      UPDATE discount_codes 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE expires_at IS NOT NULL 
        AND expires_at <= NOW()
        AND is_active = true
    `;

        const [result] = await db.execute(query);
        return result.affectedRows;
    }

    // Deactivate fully used codes (cron job)
    static async deactivateFullyUsed() {
        const query = `
      UPDATE discount_codes 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE current_uses >= max_uses
        AND is_active = true
    `;

        const [result] = await db.execute(query);
        return result.affectedRows;
    }
}

module.exports = Discount;