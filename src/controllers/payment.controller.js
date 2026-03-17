const { promisePool } = require('../config/database');
const { sendPaymentNotification, sendPaymentApprovalNotification } = require('../config/telegram');
const stripe = require('../config/stripe');
const { sendLicenseKeyEmail } = require('../services/email.service');

// Get pricing plans
const getPricingPlans = async(req, res) => {
    try {
        const [plans] = await promisePool.query(
            'SELECT * FROM pricing_plans WHERE is_active = TRUE ORDER BY duration_months ASC'
        );

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Get pricing plans error:', error);
        res.status(500).json({ success: false, message: 'Failed to get pricing plans' });
    }
};

// Validate discount code
const validateDiscountCode = async(req, res) => {
    try {
        const { code } = req.body;

        const [discounts] = await promisePool.query(
            `SELECT * FROM discount_codes 
             WHERE code = ? AND is_active = TRUE 
             AND (expires_at IS NULL OR expires_at > NOW())
             AND current_uses < max_uses`, [code]
        );

        if (discounts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired discount code'
            });
        }

        res.json({
            success: true,
            data: {
                discountPercentage: discounts[0].discount_percentage,
                remainingUses: discounts[0].max_uses - discounts[0].current_uses
            }
        });
    } catch (error) {
        console.error('Validate discount code error:', error);
        res.status(500).json({ success: false, message: 'Failed to validate discount code' });
    }
};

// Create payment
const createPayment = async(req, res) => {
    try {
        const { planId, paymentMethod, discountCode } = req.body;
        const userId = req.user.id;

        console.log('🔍 Creating payment:', { planId, paymentMethod, userId });

        // Get plan details
        const [plans] = await promisePool.query(
            'SELECT * FROM pricing_plans WHERE id = ? AND is_active = TRUE', [planId]
        );

        if (plans.length === 0) {
            console.error('❌ Plan not found:', planId);
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        const plan = plans[0];
        let discountAmount = 0;
        let discountCodeId = null;

        // Apply discount if provided
        if (discountCode) {
            const [discounts] = await promisePool.query(
                `SELECT * FROM discount_codes 
                 WHERE code = ? AND is_active = TRUE 
                 AND (expires_at IS NULL OR expires_at > NOW())
                 AND current_uses < max_uses`, [discountCode]
            );

            if (discounts.length > 0) {
                discountCodeId = discounts[0].id;
                discountAmount = (plan.price * discounts[0].discount_percentage) / 100;

                // Increment discount code usage
                await promisePool.query(
                    'UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = ?', [discountCodeId]
                );
            }
        }

        const finalAmount = plan.price - discountAmount;

        // Create payment record
        const [result] = await promisePool.query(
            `INSERT INTO payments (user_id, plan_id, payment_method, amount, discount_code_id, discount_amount, final_amount, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`, [userId, planId, paymentMethod, plan.price, discountCodeId, discountAmount, finalAmount]
        );

        console.log('✅ Payment created:', result.insertId);

        res.json({
            success: true,
            message: 'Payment created successfully',
            data: {
                paymentId: result.insertId,
                amount: plan.price,
                discountAmount,
                finalAmount,
                paymentMethod
            }
        });
    } catch (error) {
        console.error('❌ Create payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Create Stripe Checkout Session
const createStripeCheckoutSession = async(req, res) => {
    try {
        const { paymentId } = req.body;
        const userId = req.user.id;

        console.log('🔍 Creating Stripe checkout session:', { paymentId, userId });

        // Check if Stripe is configured
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('❌ Stripe secret key not configured');
            return res.status(500).json({
                success: false,
                message: 'Payment system not configured. Please contact administrator.'
            });
        }

        // Get payment details with user info
        const [payments] = await promisePool.query(
            `SELECT p.*, u.email, u.first_name, u.last_name, u.uid, pl.duration_months, pl.description
             FROM payments p 
             JOIN users u ON p.user_id = u.id 
             JOIN pricing_plans pl ON p.plan_id = pl.id
             WHERE p.id = ? AND p.user_id = ? AND p.status = 'pending'`, [paymentId, userId]
        );

        if (payments.length === 0) {
            console.error('❌ Payment not found:', { paymentId, userId });
            return res.status(404).json({
                success: false,
                message: 'Payment not found or already processed'
            });
        }

        const payment = payments[0];
        console.log('✅ Payment found:', payment);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${payment.duration_months} Month License Key`,
                        description: payment.description || `Google Ads Transparency - ${payment.duration_months} Month(s) Access`,
                    },
                    unit_amount: Math.round(payment.final_amount * 100), // Convert to cents
                },
                quantity: 1,
            }, ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&payment_id=${paymentId}`,
            cancel_url: `${process.env.FRONTEND_URL}/purchase?canceled=true`,
            customer_email: payment.email,
            metadata: {
                paymentId: payment.id.toString(),
                userId: userId.toString(),
                planId: payment.plan_id.toString(),
                userUid: payment.uid,
                durationMonths: payment.duration_months.toString()
            },
            client_reference_id: paymentId.toString(),
        });

        console.log('✅ Stripe session created:', session.id);

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                sessionUrl: session.url
            }
        });
    } catch (error) {
        console.error('❌ Create Stripe checkout session error:', error);

        let errorMessage = 'Failed to create checkout session';

        if (error.type === 'StripeInvalidRequestError') {
            errorMessage = 'Invalid Stripe configuration. Please check your API keys.';
        } else if (error.type === 'StripeAuthenticationError') {
            errorMessage = 'Stripe authentication failed. Please check your API keys.';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper function to generate license key
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = 4;
    const segmentLength = 4;
    let key = '';

    for (let i = 0; i < segments; i++) {
        if (i > 0) key += '-';
        for (let j = 0; j < segmentLength; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }

    return key;
}

// Verify Stripe Payment (AUTO-GENERATE LICENSE KEY)
const verifyStripePayment = async(req, res) => {
    try {
        const { sessionId, paymentId } = req.body;
        const userId = req.user.id;

        console.log('🔍 Verifying Stripe payment:', { sessionId, paymentId, userId });

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Payment not completed'
            });
        }

        console.log('✅ Stripe payment verified:', session.payment_intent);

        // Update payment status in database
        await promisePool.query(
            `UPDATE payments 
             SET status = 'success', transaction_id = ?, updated_at = NOW() 
             WHERE id = ? AND user_id = ?`, [session.payment_intent, paymentId, userId]
        );

        // Get payment details for license generation
        const [payments] = await promisePool.query(
            `SELECT p.*, u.uid, u.email, u.first_name, u.last_name, pl.duration_months 
             FROM payments p 
             JOIN users u ON p.user_id = u.id 
             JOIN pricing_plans pl ON p.plan_id = pl.id 
             WHERE p.id = ?`, [paymentId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        const payment = payments[0];

        // 🔑 AUTO-GENERATE LICENSE KEY FOR ONLINE PAYMENT
        const licenseKey = generateLicenseKey();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + payment.duration_months);

        // Insert license key
        await promisePool.query(
            `INSERT INTO licenses (user_id, payment_id, license_key, plan_id, expires_at, status) 
             VALUES (?, ?, ?, ?, ?, 'active')`, [userId, paymentId, licenseKey, payment.plan_id, expiresAt]
        );

        console.log('✅ License key generated:', licenseKey);

        // Send email notification with license key
        await sendLicenseKeyEmail(
            payment.email,
            `${payment.first_name} ${payment.last_name}`,
            licenseKey,
            expiresAt
        );

        console.log('✅ License key email sent to:', payment.email);

        // Send Telegram notification
        await sendPaymentApprovalNotification({
                uid: payment.uid,
                email: payment.email,
                first_name: payment.first_name,
                last_name: payment.last_name
            },
            payment.final_amount,
            licenseKey,
            expiresAt
        );

        res.json({
            success: true,
            message: 'Payment verified successfully. License key has been sent to your email.',
            data: {
                transactionId: session.payment_intent,
                paymentStatus: session.payment_status,
                licenseKey: licenseKey,
                expiresAt: expiresAt
            }
        });
    } catch (error) {
        console.error('❌ Verify Stripe payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Upload payment proof (for bank transfer)
const uploadPaymentProof = async(req, res) => {
    try {
        const { paymentId } = req.body;
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Payment proof file is required'
            });
        }

        // Verify payment exists and belongs to user
        const [payments] = await promisePool.query(
            'SELECT * FROM payments WHERE id = ? AND user_id = ?', [paymentId, userId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Update payment with proof
        await promisePool.query(
            'UPDATE payments SET payment_proof = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [file.filename, paymentId, userId]
        );

        // Send Telegram notification
        const [updatedPayments] = await promisePool.query(
            `SELECT p.*, u.uid, u.email, u.first_name, u.last_name, pl.duration_months 
             FROM payments p 
             JOIN users u ON p.user_id = u.id 
             JOIN pricing_plans pl ON p.plan_id = pl.id 
             WHERE p.id = ?`, [paymentId]
        );

        if (updatedPayments.length > 0) {
            const payment = updatedPayments[0];
            await sendPaymentNotification({
                    uid: payment.uid,
                    email: payment.email,
                    first_name: payment.first_name,
                    last_name: payment.last_name
                },
                payment.final_amount,
                'bank_transfer',
                payment.duration_months
            );
        }

        res.json({
            success: true,
            message: 'Payment proof uploaded successfully. Awaiting admin verification.'
        });
    } catch (error) {
        console.error('Upload payment proof error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload payment proof'
        });
    }
};

// Get user payments
const getUserPayments = async(req, res) => {
    try {
        const userId = req.user.id;

        const [payments] = await promisePool.query(
            `SELECT p.*, pl.duration_months, pl.description 
             FROM payments p 
             JOIN pricing_plans pl ON p.plan_id = pl.id 
             WHERE p.user_id = ? 
             ORDER BY p.created_at DESC`, [userId]
        );

        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Get user payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payments'
        });
    }
};

module.exports = {
    getPricingPlans,
    validateDiscountCode,
    createPayment,
    createStripeCheckoutSession,
    verifyStripePayment,
    uploadPaymentProof,
    getUserPayments
};