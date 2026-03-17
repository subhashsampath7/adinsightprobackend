const cron = require('node-cron');
const { promisePool } = require('../config/database');
const { sendExpiryReminderEmail } = require('./email.service');
require('dotenv').config();

const REMINDER_DAYS = parseInt(process.env.REMINDER_DAYS_BEFORE_EXPIRY) || 5;

// Check for expiring licenses and send reminders
const checkExpiringLicenses = async() => {
    try {
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + REMINDER_DAYS);

        const [licenses] = await promisePool.query(`
      SELECT l.*, u.email, u.first_name, u.last_name
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
      AND l.reminder_sent = FALSE
      AND DATE(l.expires_at) = DATE(?)
    `, [reminderDate]);

        console.log(`Found ${licenses.length} licenses expiring in ${REMINDER_DAYS} days`);

        for (const license of licenses) {
            await sendExpiryReminderEmail(
                license.email,
                `${license.first_name} ${license.last_name}`,
                license.license_key,
                REMINDER_DAYS
            );

            await promisePool.query(
                'UPDATE licenses SET reminder_sent = TRUE WHERE id = ?', [license.id]
            );

            console.log(`Reminder sent for license: ${license.license_key}`);
        }
    } catch (error) {
        console.error('Error checking expiring licenses:', error);
    }
};

// Check for expired licenses and update status
const checkExpiredLicenses = async() => {
    try {
        const [result] = await promisePool.query(`
      UPDATE licenses
      SET status = 'expired'
      WHERE status = 'active'
      AND expires_at < NOW()
    `);

        if (result.affectedRows > 0) {
            console.log(`Updated ${result.affectedRows} expired licenses`);
        }
    } catch (error) {
        console.error('Error checking expired licenses:', error);
    }
};

// Initialize cron jobs
const initializeCronJobs = () => {
    // Check for expiring licenses every day at 9:00 AM
    cron.schedule('0 9 * * *', () => {
        console.log('Running expiring licenses check...');
        checkExpiringLicenses();
    });

    // Check for expired licenses every hour
    cron.schedule('0 * * * *', () => {
        console.log('Running expired licenses check...');
        checkExpiredLicenses();
    });

    console.log('✅ Cron jobs initialized');
};

module.exports = {
    initializeCronJobs,
    checkExpiringLicenses,
    checkExpiredLicenses
};