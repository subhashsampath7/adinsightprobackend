const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter with better configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
});

// Verify transporter on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email service error:', error.message);
        console.error('   Please check your EMAIL_USER and EMAIL_PASSWORD in .env file');
    } else {
        console.log('✅ Email service ready');
    }
});

// Email template wrapper
const emailTemplate = (title, content, buttonText = null, buttonUrl = null) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            .content {
                padding: 40px 30px;
            }
            .content p {
                margin: 0 0 15px;
                font-size: 16px;
            }
            .license-box {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px;
                border-radius: 10px;
                text-align: center;
                margin: 25px 0;
            }
            .license-key {
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 3px;
                font-family: 'Courier New', monospace;
                word-break: break-all;
            }
            .info-box {
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .warning-box {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .error-box {
                background: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .success-box {
                background: #d4edda;
                border-left: 4px solid #28a745;
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white !important;
                padding: 14px 35px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
                transition: transform 0.2s;
            }
            .button:hover {
                transform: translateY(-2px);
            }
            .steps {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .steps ol {
                margin: 10px 0;
                padding-left: 20px;
            }
            .steps li {
                margin: 8px 0;
            }
            .footer {
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
            }
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            .divider {
                height: 1px;
                background: #e9ecef;
                margin: 30px 0;
            }
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
            
            <p>Thank you for joining us! If you have any questions, feel free to reach out.</p>
            
            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🎉 Welcome to Google Ads Transparency Platform',
            html: emailTemplate('Welcome to Our Platform!', content, 'Complete Your Profile', `${process.env.FRONTEND_URL}/profile`)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error);
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
                    Valid until: <strong>${new Date(expiryDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</strong>
                </p>
            </div>
            
            <div class="info-box">
                <p style="margin: 0;"><strong>⚠️ Important:</strong> Keep this license key safe. You'll need it to activate the extension.</p>
            </div>
            
            <p><strong>How to Activate Your License:</strong></p>
            <div class="steps">
                <ol>
                    <li>Install the <strong>Google Ads Transparency Chrome Extension</strong></li>
                    <li>Click on the extension icon in your browser toolbar</li>
                    <li>Enter your license key: <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${licenseKey}</code></li>
                    <li>Click the <strong>"Activate"</strong> button</li>
                    <li>Start using the extension immediately!</li>
                </ol>
            </div>
            
            <p>Your license will expire on <strong>${new Date(expiryDate).toLocaleDateString()}</strong>. We'll send you a reminder before it expires.</p>
            
            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔑 Your License Key is Ready!',
            html: emailTemplate('License Key Activated!', content, 'View My License Keys', `${process.env.FRONTEND_URL}/my-keys`)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ License key email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send license key email:', error);
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
            
            <p>To continue using the <strong>Google Ads Transparency Extension</strong> without interruption, please renew your license before it expires.</p>
            
            <div class="info-box">
                <p style="margin: 0;"><strong>💡 Tip:</strong> Renew now to avoid any service disruption!</p>
            </div>
            
            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `⏰ License Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
            html: emailTemplate('License Expiring Soon', content, 'Renew License Now', `${process.env.FRONTEND_URL}/purchase`)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Expiry reminder email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send expiry reminder email:', error);
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
            
            <p><strong>What you can do:</strong></p>
            <div class="steps">
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Check your payment details and try again</li>
                    <li>Contact your bank if the issue persists</li>
                    <li>Try a different payment method</li>
                    <li>Contact our support team for assistance</li>
                </ul>
            </div>
            
            <p>If you believe this is an error, please contact us at <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>
            
            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '❌ Payment Failed',
            html: emailTemplate('Payment Failed', content, 'Try Again', `${process.env.FRONTEND_URL}/purchase`)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Payment failed email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send payment failed email:', error);
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
                <p style="margin: 5px 0 0;">You can now proceed to purchase a license key.</p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <div class="steps">
                <ol>
                    <li>Choose a subscription plan</li>
                    <li>Complete the payment</li>
                    <li>Receive your license key via email</li>
                    <li>Activate the Chrome extension</li>
                </ol>
            </div>
            
            <p>Thank you for completing the verification process!</p>
            
            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        ` : `
            <p>Hi <strong>${name}</strong>,</p>
            <p>Unfortunately, your KYC verification has been <strong>declined</strong>. ❌</p>
            
            <div class="error-box">
                <p style="margin: 0;"><strong>Reason:</strong></p>
                <p style="margin: 5px 0 0;">${reason || 'Documents did not meet our verification requirements.'}</p>
            </div>
            
            <p><strong>What to do next:</strong></p>
            <div class="steps">
                <ol>
                    <li>Review the decline reason above</li>
                    <li>Prepare correct documents (ID, Passport, or Driver's License)</li>
                    <li>Ensure documents are clear and readable</li>
                    <li>Resubmit your KYC application</li>
                </ol>
            </div>
            
            <div class="info-box">
                <p style="margin: 0;"><strong>💡 Tips for successful verification:</strong></p>
                <ul style="margin: 5px 0 0; padding-left: 20px;">
                    <li>Use high-quality images or scans</li>
                    <li>Ensure all text is clearly visible</li>
                    <li>Documents should not be expired</li>
                    <li>Submit government-issued IDs only</li>
                </ul>
            </div>
            
            <p>If you have questions, please contact us at <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>
            
            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: isApproved ? '✅ KYC Verification Approved' : '❌ KYC Verification Declined',
            html: emailTemplate(
                isApproved ? 'KYC Approved!' : 'KYC Declined',
                content,
                isApproved ? 'Purchase License' : 'Resubmit KYC',
                `${process.env.FRONTEND_URL}/${isApproved ? 'purchase' : 'kyc'}`
            )
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ KYC status email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send KYC status email:', error);
        return { success: false, error: error.message };
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetToken) => {
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const content = `
            <p>Hi <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div class="warning-box">
                <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
                <p style="margin: 5px 0 0;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 14px;">
                ${resetUrl}
            </p>
            
            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Password Reset Request',
            html: emailTemplate('Reset Your Password', content, 'Reset Password', resetUrl)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error);
        return { success: false, error: error.message };
    }
};

// ✅ NEW: Send account suspension email
const sendAccountSuspensionEmail = async (email, userName, reason) => {
    try {
        const content = `
            <p>Dear <strong>${userName}</strong>,</p>
            
            <div class="error-box">
                <p style="margin: 0;"><strong>⚠️ Your account has been suspended.</strong></p>
            </div>

            <p><strong>Reason for suspension:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #e5e7eb;">
                ${reason}
            </p>

            <p>During this suspension period, you will not be able to:</p>
            <div class="steps">
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Access your account dashboard</li>
                    <li>Use active license keys</li>
                    <li>Make new purchases</li>
                    <li>Submit KYC verifications</li>
                </ul>
            </div>

            <div class="warning-box">
                <p style="margin: 0;"><strong>What you can do:</strong></p>
                <p style="margin: 5px 0 0;">If you believe this is a mistake or would like to appeal this decision, please contact our support team at <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>
            </div>

            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '⚠️ Account Suspended - Google Ads Transparency',
            html: emailTemplate('Account Suspended', content, 'Contact Support', `mailto:${process.env.EMAIL_USER}`)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Account suspension email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send suspension email:', error);
        return { success: false, error: error.message };
    }
};

// ✅ NEW: Send account activation email
const sendAccountActivationEmail = async (email, userName) => {
    try {
        const content = `
            <p>Dear <strong>${userName}</strong>,</p>
            
            <div class="success-box">
                <p style="margin: 0;"><strong>✅ Good news! Your account has been reactivated.</strong></p>
            </div>

            <p>You can now access all features of your account again, including:</p>
            <div class="steps">
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Full dashboard access</li>
                    <li>Use of active license keys</li>
                    <li>Purchase new licenses</li>
                    <li>Submit KYC verifications</li>
                </ul>
            </div>

            <div class="info-box">
                <p style="margin: 0;"><strong>💡 Please Note:</strong> Make sure to comply with our terms of service to avoid future suspensions.</p>
            </div>

            <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>

            <p>Best regards,<br><strong>Google Ads Transparency Team</strong></p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '✅ Account Activated - Google Ads Transparency',
            html: emailTemplate('Account Activated', content, 'Login to Your Account', `${process.env.FRONTEND_URL}/login`)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Account activation email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send activation email:', error);
        return { success: false, error: error.message };
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
