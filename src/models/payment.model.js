const db = require('../config/database');

class Payment {
    // Create payment
    static async create(paymentData) {
        const query = `
      INSERT INTO payments (
        user_id, plan_id, amount, discount_code_id, discount_amount,
        final_amount, payment_method, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

        const values = [
            paymentData.userId,
            paymentData.planId,
            paymentData.amount,
            paymentData.discountCodeId || null,
            paymentData.discountAmount || 0,
            paymentData.finalAmount,
            paymentData.paymentMethod
        ];

        const [result] = await db.execute(query, values);
        return result.insertId;
    }

    // Find payment by ID
    static async findById(paymentId) {
        const query = `
      SELECT p.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name,
             pp.duration_months, pp.price as plan_price
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN pricing_plans pp ON p.plan_id = pp.id
      WHERE p.id = ?
    `;

        const [rows] = await db.execute(query, [paymentId]);
        return rows[0];
    }

    // Find payments by user ID
    static async findByUserId(userId) {
        const query = `
      SELECT p.*, pp.duration_months, pp.price as plan_price
      FROM payments p
      JOIN pricing_plans pp ON p.plan_id = pp.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;

        const [rows] = await db.execute(query, [userId]);
        return rows;
    }

    // Get all payments (admin)
    static async getAll() {
        const query = `
      SELECT p.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name,
             pp.duration_months, pp.price as plan_price
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN pricing_plans pp ON p.plan_id = pp.id
      ORDER BY p.created_at DESC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Get pending payments
    static async getPending() {
        const query = `
      SELECT p.*, u.uid, u.email, u.first_name, u.middle_name, u.last_name,
             pp.duration_months, pp.price as plan_price
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN pricing_plans pp ON p.plan_id = pp.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
    `;

        const [rows] = await db.execute(query);
        return rows;
    }

    // Update payment status
    static async updateStatus(paymentId, status, transactionId = null, declineReason = null) {
        const query = `
      UPDATE payments 
      SET status = ?, transaction_id = ?, decline_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const values = [status, transactionId, declineReason, paymentId];
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Upload payment proof
    static async uploadProof(paymentId, proofFilename) {
        const query = `
      UPDATE payments 
      SET payment_proof = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        const [result] = await db.execute(query, [proofFilename, paymentId]);
        return result.affectedRows > 0;
    }

    // Get payment statistics
    static async getStats() {
        const query = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined,
        COALESCE(SUM(CASE WHEN status = 'success' THEN final_amount ELSE 0 END), 0) as total_revenue
      FROM payments
    `;

        const [rows] = await db.execute(query);
        return rows[0];
    }

    // Get user's pending payments
    static async getUserPendingPayments(userId) {
        const query = `
      SELECT p.*, pp.duration_months
      FROM payments p
      JOIN pricing_plans pp ON p.plan_id = pp.id
      WHERE p.user_id = ? AND p.status = 'pending'
      ORDER BY p.created_at DESC
    `;

        const [rows] = await db.execute(query, [userId]);
        return rows;
    }

    // Check if user has pending payment for plan
    static async hasPendingPaymentForPlan(userId, planId) {
        const query = `
      SELECT id FROM payments 
      WHERE user_id = ? AND plan_id = ? AND status = 'pending'
    `;

        const [rows] = await db.execute(query, [userId, planId]);
        return rows.length > 0;
    }

    // Delete payment
    static async delete(paymentId) {
        const query = 'DELETE FROM payments WHERE id = ?';
        const [result] = await db.execute(query, [paymentId]);
        return result.affectedRows > 0;
    }
}

module.exports = Payment;