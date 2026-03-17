const axios = require('axios');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Test Telegram connection
const testTelegramConnection = async() => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('⚠️ Telegram credentials not configured in .env file');
        return false;
    }

    try {
        const response = await axios.get(`${TELEGRAM_API_URL}/getMe`);
        if (response.data.ok) {
            console.log('✅ Telegram bot connected:', response.data.result.username);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Telegram connection failed:', error.message);
        return false;
    }
};

// Send message to Telegram
const sendTelegramMessage = async(message, parseMode = 'HTML') => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('⚠️ Telegram credentials not configured');
        return { success: false, error: 'Telegram not configured' };
    }

    try {
        const url = `${TELEGRAM_API_URL}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: parseMode,
            disable_web_page_preview: true
        });

        if (response.data.ok) {
            console.log('✅ Telegram message sent successfully');
            return { success: true, data: response.data };
        } else {
            console.error('❌ Telegram API error:', response.data);
            return { success: false, error: response.data.description };
        }
    } catch (error) {
        console.error('❌ Telegram send failed:', error.message);
        return { success: false, error: error.message };
    }
};

// Send new user registration notification
const sendNewUserNotification = async(user) => {
    const message = `
🎉 <b>NEW USER REGISTERED</b>

👤 <b>Name:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
🔢 <b>UID:</b> <code>${user.uid}</code>
📱 <b>Phone:</b> ${user.phone || 'Not provided'}
🌍 <b>Country:</b> ${user.country || 'Not provided'}
⏰ <b>Time:</b> ${new Date().toLocaleString()}

<i>User needs to complete KYC verification.</i>
    `.trim();

    return await sendTelegramMessage(message);
};

// Send KYC submission notification
const sendKYCNotification = async(user, documentType) => {
    const message = `
🆔 <b>NEW KYC SUBMISSION</b>

👤 <b>User:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
🔢 <b>UID:</b> <code>${user.uid}</code>
📄 <b>Document Type:</b> ${documentType.toUpperCase()}
📱 <b>Phone:</b> ${user.phone || 'Not provided'}
⏰ <b>Submitted:</b> ${new Date().toLocaleString()}

⚠️ <b>ACTION REQUIRED:</b> Please review the KYC documents in the admin panel.

🔗 <a href="${process.env.ADMIN_URL}/kyc">Review KYC Documents</a>
    `.trim();

    return await sendTelegramMessage(message);
};

// Send KYC approval notification
const sendKYCApprovalNotification = async(user, status, reason = null) => {
        const isApproved = status === 'verified';
        const emoji = isApproved ? '✅' : '❌';

        const message = `
${emoji} <b>KYC ${isApproved ? 'APPROVED' : 'DECLINED'}</b>

👤 <b>User:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
🔢 <b>UID:</b> <code>${user.uid}</code>
📊 <b>Status:</b> ${status.toUpperCase()}
${reason ? `📝 <b>Reason:</b> ${reason}` : ''}
⏰ <b>Time:</b> ${new Date().toLocaleString()}

${isApproved 
    ? '✅ User can now proceed to purchase a license key.' 
    : '❌ User has been notified to resubmit documents.'}
    `.trim();

    return await sendTelegramMessage(message);
};

// Send payment notification (for all payment methods)
const sendPaymentNotification = async (user, amount, paymentMethod, plan, paymentId) => {
    const isOnline = paymentMethod === 'online';
    const emoji = isOnline ? '💳' : '🏦';
    
    const message = `
${emoji} <b>NEW PAYMENT RECEIVED</b>

👤 <b>User:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
🔢 <b>UID:</b> <code>${user.uid}</code>

💰 <b>Amount:</b> $${amount}
💳 <b>Method:</b> ${paymentMethod.toUpperCase().replace('_', ' ')}
📦 <b>Plan:</b> ${plan} month(s)
🆔 <b>Payment ID:</b> #${paymentId}
⏰ <b>Time:</b> ${new Date().toLocaleString()}

${isOnline 
    ? '✅ <b>ONLINE PAYMENT</b> - License key generated automatically and sent to user.' 
    : '⏳ <b>BANK TRANSFER</b> - Awaiting admin approval. Please review payment proof.'}

${!isOnline ? `🔗 <a href="${process.env.ADMIN_URL}/payments">Review Payment</a>` : ''}
    `.trim();

    return await sendTelegramMessage(message);
};

// Send payment approval notification (for bank transfer)
const sendPaymentApprovalNotification = async (user, amount, licenseKey, expiresAt, paymentId) => {
    const message = `
🎉 <b>PAYMENT APPROVED - LICENSE KEY GENERATED</b>

👤 <b>User:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
🔢 <b>UID:</b> <code>${user.uid}</code>

💰 <b>Amount:</b> $${amount}
🆔 <b>Payment ID:</b> #${paymentId}
🔑 <b>License Key:</b> <code>${licenseKey}</code>
📅 <b>Expires:</b> ${new Date(expiresAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}
⏰ <b>Approved:</b> ${new Date().toLocaleString()}

✅ License key has been sent to user's email.
    `.trim();

    return await sendTelegramMessage(message);
};

// Send payment declined notification
const sendPaymentDeclinedNotification = async (user, amount, reason, paymentId) => {
    const message = `
❌ <b>PAYMENT DECLINED</b>

👤 <b>User:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
🔢 <b>UID:</b> <code>${user.uid}</code>

💰 <b>Amount:</b> $${amount}
🆔 <b>Payment ID:</b> #${paymentId}
📝 <b>Reason:</b> ${reason}
⏰ <b>Declined:</b> ${new Date().toLocaleString()}

❌ User has been notified via email.
    `.trim();

    return await sendTelegramMessage(message);
};

// Send license expiry reminder notification
const sendLicenseExpiryNotification = async (user, licenseKey, daysLeft) => {
    const urgency = daysLeft <= 3 ? '🚨' : '⏰';
    
    const message = `
${urgency} <b>LICENSE EXPIRING SOON</b>

👤 <b>User:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
🔢 <b>UID:</b> <code>${user.uid}</code>

🔑 <b>License Key:</b> <code>${licenseKey}</code>
⏳ <b>Expires in:</b> ${daysLeft} day${daysLeft > 1 ? 's' : ''}

${daysLeft <= 3 
    ? '🚨 <b>URGENT:</b> License expiring very soon!' 
    : '⏰ Reminder email has been sent to user.'}
    `.trim();

    return await sendTelegramMessage(message);
};

// Send license expired notification
const sendLicenseExpiredNotification = async (user, licenseKey) => {
    const message = `
🔴 <b>LICENSE EXPIRED</b>

👤 <b>User:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
🔢 <b>UID:</b> <code>${user.uid}</code>

🔑 <b>License Key:</b> <code>${licenseKey}</code>
📅 <b>Expired:</b> ${new Date().toLocaleDateString()}

⚠️ License has been deactivated. User needs to renew.
    `.trim();

    return await sendTelegramMessage(message);
};

// Send error/critical notification
const sendErrorNotification = async (errorType, errorMessage, details = {}) => {
    const message = `
🚨 <b>SYSTEM ERROR</b>

⚠️ <b>Type:</b> ${errorType}
📝 <b>Message:</b> ${errorMessage}
⏰ <b>Time:</b> ${new Date().toLocaleString()}

${Object.keys(details).length > 0 ? `<b>Details:</b>\n${JSON.stringify(details, null, 2)}` : ''}

Please check the server logs for more information.
    `.trim();

    return await sendTelegramMessage(message);
};

// Send daily summary notification
const sendDailySummary = async (stats) => {
    const message = `
📊 <b>DAILY SUMMARY</b>
📅 ${new Date().toLocaleDateString()}

👥 <b>New Users:</b> ${stats.newUsers || 0}
🆔 <b>KYC Submissions:</b> ${stats.kycSubmissions || 0}
✅ <b>KYC Approved:</b> ${stats.kycApproved || 0}
💰 <b>Payments Received:</b> ${stats.paymentsReceived || 0}
💵 <b>Total Revenue:</b> $${stats.totalRevenue || 0}
🔑 <b>License Keys Generated:</b> ${stats.licenseKeysGenerated || 0}
⏳ <b>Pending Approvals:</b> ${stats.pendingApprovals || 0}

${stats.pendingApprovals > 0 
    ? `⚠️ You have ${stats.pendingApprovals} pending approval(s).` 
    : '✅ All caught up!'}
    `.trim();

    return await sendTelegramMessage(message);
};

// Send test message
const sendTestMessage = async () => {
    const message = `
🧪 <b>TEST MESSAGE</b>

✅ Telegram bot is working correctly!
⏰ Time: ${new Date().toLocaleString()}

Your bot token and chat ID are configured properly.
    `.trim();

    return await sendTelegramMessage(message);
};

module.exports = {
    testTelegramConnection,
    sendTelegramMessage,
    sendNewUserNotification,
    sendKYCNotification,
    sendKYCApprovalNotification,
    sendPaymentNotification,
    sendPaymentApprovalNotification,
    sendPaymentDeclinedNotification,
    sendLicenseExpiryNotification,
    sendLicenseExpiredNotification,
    sendErrorNotification,
    sendDailySummary,
    sendTestMessage
};