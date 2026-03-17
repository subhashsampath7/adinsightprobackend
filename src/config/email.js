const nodemailer = require('nodemailer');

// Email transporter configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: 2525,  // 587 වෙනුවට 2525 පාවිච්චි කරමු (Firewall bypass කරන්න)
    secure: false, 
    requireTLS: true, // මේක අනිවාර්යයි
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});
// Send license key email
const sendLicenseKeyEmail = async(email, name, licenseKey, expiresAt) => {
    try {
        const mailOptions = {
            from: `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🎉 Your License Key is Ready!',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .license-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
                        .license-key { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: monospace; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Payment Successful!</h1>
                        </div>
                        <div class="content">
                            <p>Hi <strong>${name}</strong>,</p>
                            <p>Thank you for your purchase! Your payment has been processed successfully.</p>
                            
                            <div class="license-box">
                                <h2 style="margin-top: 0; color: #667eea;">Your License Key</h2>
                                <div class="license-key">${licenseKey}</div>
                                <p style="margin-bottom: 0; color: #666; font-size: 14px;">
                                    Valid until: <strong>${new Date(expiresAt).toLocaleDateString()}</strong>
                                </p>
                            </div>
                            
                            <h3>How to Activate:</h3>
                            <ol>
                                <li>Install the Google Ads Transparency Chrome Extension</li>
                                <li>Click on the extension icon</li>
                                <li>Enter your license key: <code>${licenseKey}</code></li>
                                <li>Click "Activate" and start using!</li>
                            </ol>
                            
                            <div style="text-align: center;">
                                <a href="${process.env.FRONTEND_URL}/my-keys" class="button">View My License Keys</a>
                            </div>
                            
                            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                <strong>Need help?</strong> Contact our support team at support@example.com
                            </p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Google Ads Transparency. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ License key email sent to:', email);
    } catch (error) {
        console.error('❌ Failed to send license key email:', error);
    }
};

// Send payment declined email
const sendPaymentDeclinedEmail = async(email, name, reason) => {
    try {
        const mailOptions = {
            from: `"Google Ads Transparency" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '❌ Payment Declined',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #ea4335; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>❌ Payment Declined</h1>
                        </div>
                        <div class="content">
                            <p>Hi <strong>${name}</strong>,</p>
                            <p>Unfortunately, your payment has been declined by our admin team.</p>
                            
                            <div class="reason-box">
                                <strong>Reason:</strong><br>
                                ${reason}
                            </div>
                            
                            <p>If you believe this is a mistake, please contact our support team with your payment details.</p>
                            
                            <div style="text-align: center;">
                                <a href="${process.env.FRONTEND_URL}/purchase" class="button">Try Again</a>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Payment declined email sent to:', email);
    } catch (error) {
        console.error('❌ Failed to send payment declined email:', error);
    }
};

module.exports = {
    sendLicenseKeyEmail,
    sendPaymentDeclinedEmail
};
