const axios = require('axios');
require('dotenv').config();

// Email template wrapper
const emailTemplate = (title, content, buttonText = null, buttonUrl = null) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 15px; font-size: 16px; }
            .license-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin: 25px 0; }
            .license-key { font-size: 28px; font-weight: bold; letter-spacing: 3px; font-family: 'Courier New', monospace; word-break: break-all; }
            .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
            .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
            .error-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
            .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; text-align: center; transition: transform 0.2s; }
            .button:hover { transform: translateY(-2px); }
            .steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .steps ol, .steps ul { margin: 10px 0; padding-left: 20px; }
            .steps li { margin: 8px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; font-size: 14px; }
            .footer a { color: #667eea; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${title}</h1>
            </div>
            <div class="content">
                ${content}
                ${buttonText && buttonUrl ? `
                <div style="text-align: center;">
                    <a href="${buttonUrl}" class="button">${buttonText}</a>
                </div>
                ` : ''}
            </div>
            <div class="footer">
                <p><strong>Google Ads Transparency Platform</strong></p>
                <p>Need help? Contact us at <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>
                <p style="margin-top: 20px; font-size: 12px;">
                    © ${new Date().getFullYear()} Google Ads Transparency. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// API Call Core Function
const sendEmailViaBrevo = async (toEmail, toName, subject, htmlContent) => {
    try {
        console.log(`⏳ Sending email to ${toEmail} via Brevo API...`);
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: "Google Ads Transparency", email: process.env.EMAIL_USER || "a540af001@smtp-brevo.com" },
            to: [{ email: toEmail, name: toName || toEmail.split('@')[0] }],
            subject: subject,
            htmlContent: htmlContent
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            }
        });
        console.log(`✅ Email successfully sent to ${toEmail} (ID: ${response.data.messageId})`);
        return { success: true, messageId: response.data.messageId };
    } catch (error) {
        console.error(`❌ Brevo API Error for ${toEmail}:`, error.response ? JSON.stringify(error.response.data) : error.message);
        throw error;
    }
};

// Send welcome email
const sendWelcomeEmail = async (email, name, uid) => {
    try {
        const content = `
            <p>Hi <strong>${name}</strong>,</p>
            <p>Welcome to the <strong>Google Ads Transparency Platform</strong>! 🎉</p>
            <div class="success-box">
                <p style="margin: 0;"><strong>Your Account Details:</strong></p>
                <p style="margin: 5px 0 0;">User ID (UID): <strong>${uid}</strong></p>
            </div>
            <p><strong>Next Steps:</strong></p>
            <div class="steps">
                <ol>
                    <li>Complete your profile information</li>
                    <li>Submit KYC verification documents</li>
                    <li>Wait for admin approval</li>
                    <li>Purchase a license key</li>
                    <li>Activate the Chrome extension</li>
                </ol>
            </div>
            <p>Thank you for joining us!</p>
        `;
        const html = emailTemplate('Welcome to Our Platform!', content, 'Complete Your Profile', `${process.env.FRONTEND_URL}/profile`);
        return await sendEmailViaBrevo(email, name, '🎉 Welcome to Google Ads Transparency Platform', html);
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Send license key email
const sendLicenseKeyEmail = async (email, name, licenseKey, expiryDate) => {
    try {
        const content = `
            <p>Hi <strong>${name}</strong>,</p>
            <p>Great news! Your payment has been confirmed and your license key is ready. 🎉</p>
            <div class="license-box">
                <p style="margin: 0 0 10px; font-size: 14px; opacity: 0.9;">Your License Key</p>
                <div class="license-key">${licenseKey}</div>
                <p style="margin: 15px 0 0; font-size: 14px; opacity: 0.9;">
                    Valid until: <strong>${new Date(expiryDate).toLocaleDateString()}</strong>
                </p>
            </div>
            <p><strong>How to Activate Your License:</strong></p>
            <div class="steps">
                <ol>
                    <li>Install the Chrome Extension</li>
                    <li>Click on the extension icon</li>
                    <li>Enter your license key</li>
                    <li>Click "Activate"</li>
                </ol>
            </div>
        `;
        const html = emailTemplate('License Key Activated!', content, 'View My License Keys', `${process.env.FRONTEND_URL}/my-keys`);
        return await sendEmailViaBrevo(email, name, '🔑 Your License Key is Ready!', html);
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Send expiry reminder email
const sendExpiryReminderEmail = async (email, name, licenseKey, daysLeft) => {
    try {
        const urgency = daysLeft <= 3 ? 'error-box' : 'warning-box';
        const content = `
            <p>Hi <strong>${name}</strong>,</p>
            <p>This is a friendly reminder that your license key is expiring soon. ⏰</p>
            <div class="${urgency}">
                <p style="margin: 0;"><strong>License Key:</strong> ${licenseKey}</p>
                <p style="margin: 5px 0 0;"><strong>Expires in:</strong> ${daysLeft} day${daysLeft > 1 ? 's' : ''}</p>
            </div>
            <p>Please renew your license to avoid any service disruption.</p>
        `;
        const html = emailTemplate('License Expiring Soon', content, 'Renew License Now', `${process.env.FRONTEND_URL}/purchase`);
        return await sendEmailViaBrevo(email, name, `⏰ License Expiring in ${daysLeft} Days`, html);
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Send payment failed email
const sendPaymentFailedEmail = async (email, name, reason) => {
    try {
        const content = `
            <p>Hi <strong>${name}</strong>,</p>
            <p>We're sorry, but your payment could not be processed. 😔</p>
            <div class="error-box">
                <p style="margin: 0;"><strong>Reason:</strong></p>
                <p style="margin: 5px 0 0;">${reason}</p>
            </div>
            <p>Please check your payment details and try again.</p>
        `;
        const html = emailTemplate('Payment Failed', content, 'Try Again', `${process.env.FRONTEND_URL}/purchase`);
        return await sendEmailViaBrevo(email, name, '❌ Payment Failed', html);
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Send KYC status email
const sendKYCStatusEmail = async (email, name, status, reason = null) => {
    try {
        const isApproved = status === 'verified';
        const content = isApproved ? `
            <p>Hi <strong>${name}</strong>,</p>
            <p>Great news! Your KYC verification has been <strong>approved</strong>! ✅</p>
            <div class="success-box">
                <p style="margin: 0;"><strong>Status:</strong> Verified</p>
            </div>
            <p>You can now proceed to purchase a license key.</p>
        ` : `
            <p>Hi <strong>${name}</strong>,</p>
            <p>Unfortunately, your KYC verification has been <strong>declined</strong>. ❌</p>
            <div class="error-box">
                <p style="margin: 0;"><strong>Reason:</strong></p>
                <p style="margin: 5px 0 0;">${reason || 'Documents did not meet requirements.'}</p>
            </div>
            <p>Please review and resubmit your documents.</p>
        `;
        const html = emailTemplate(isApproved ? 'KYC Approved!' : 'KYC Declined', content, isApproved ? 'Purchase License' : 'Resubmit KYC', `${process.env.FRONTEND_URL}/${isApproved ? 'purchase' : 'kyc'}`);
        return await sendEmailViaBrevo(email, name, isApproved ? '✅ KYC Approved' : '❌ KYC Declined', html);
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetToken) => {
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const content = `
            <p>Hi <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Click the button below:</p>
            <div class="warning-box">
                <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
                <p style="margin: 5px 0 0;">This link expires in 1 hour.</p>
            </div>
        `;
        const html = emailTemplate('Reset Your Password', content, 'Reset Password', resetUrl);
        return await sendEmailViaBrevo(email, name, '🔐 Password Reset Request', html);
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Send account suspension email
const sendAccountSuspensionEmail = async (email, userName, reason) => {
    try {
        const content = `
            <p>Dear <strong>${userName}</strong>,</p>
            <div class="error-box">
                <p style="margin: 0;"><strong>⚠️ Your account has been suspended.</strong></p>
            </div>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>Please contact support if you believe this is a mistake.</p>
        `;
        const html = emailTemplate('Account Suspended', content, 'Contact Support', `mailto:${process.env.EMAIL_USER}`);
        return await sendEmailViaBrevo(email, userName, '⚠️ Account Suspended', html);
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Send account activation email
const sendAccountActivationEmail = async (email, userName) => {
    try {
        const content = `
            <p>Dear <strong>${userName}</strong>,</p>
            <div class="success-box">
                <p style="margin: 0;"><strong>✅ Good news! Your account has been reactivated.</strong></p>
            </div>
            <p>You can now access all features of your account again.</p>
        `;
        const html = emailTemplate('Account Activated', content, 'Login', `${process.env.FRONTEND_URL}/login`);
        return await sendEmailViaBrevo(email, userName, '✅ Account Activated', html);
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Dummy transporter to prevent app crashes
const transporter = {
    verify: (cb) => {
        console.log('✅ Email service mapped to Brevo API (Bypassing SMTP Block)');
        if(cb) cb(null, true);
    }
};

module.exports = {
    transporter,
    sendWelcomeEmail,
    sendLicenseKeyEmail,
    sendExpiryReminderEmail,
    sendPaymentFailedEmail,
    sendKYCStatusEmail,
    sendPasswordResetEmail,
    sendAccountSuspensionEmail, 
    sendAccountActivationEmail  
};
