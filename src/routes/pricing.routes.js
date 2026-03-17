const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database'); // ✅ Changed this line

/**
 * @route   GET /api/pricing/plans
 * @desc    Get all active pricing plans (Public route)
 * @access  Public
 */
router.get('/plans', async(req, res) => {
    try {
        console.log('📊 Fetching pricing plans...');

        const [plans] = await promisePool.query(
            'SELECT id, duration_months, price, description, features, is_active FROM pricing_plans WHERE is_active = 1 ORDER BY duration_months ASC'
        );

        console.log('✅ Plans fetched:', plans.length);

        res.json({
            success: true,
            plans: plans
        });
    } catch (error) {
        console.error('❌ Error fetching pricing plans:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage
        });

        res.status(500).json({
            success: false,
            message: 'Failed to fetch pricing plans',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/pricing/plans/:id
 * @desc    Get specific pricing plan by ID
 * @access  Public
 */
router.get('/plans/:id', async(req, res) => {
    try {
        const { id } = req.params;

        console.log('📊 Fetching plan ID:', id);

        const [plans] = await promisePool.query(
            'SELECT * FROM pricing_plans WHERE id = ? AND is_active = 1', [id]
        );

        if (plans.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pricing plan not found'
            });
        }

        res.json({
            success: true,
            plan: plans[0]
        });
    } catch (error) {
        console.error('❌ Error fetching pricing plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pricing plan',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   POST /api/pricing/calculate
 * @desc    Calculate price with discount code
 * @access  Public
 */
router.post('/calculate', async(req, res) => {
    try {
        const { plan_id, discount_code } = req.body;

        // Get plan
        const [plans] = await promisePool.query(
            'SELECT * FROM pricing_plans WHERE id = ? AND is_active = 1', [plan_id]
        );

        if (plans.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pricing plan not found'
            });
        }

        const plan = plans[0];
        let finalPrice = plan.price;
        let discount = 0;
        let discountInfo = null;

        // Check discount code if provided
        if (discount_code) {
            const [discounts] = await promisePool.query(
                'SELECT * FROM discount_codes WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())', [discount_code]
            );

            if (discounts.length > 0) {
                const discountData = discounts[0];

                // Check usage limit
                if (discountData.max_uses && discountData.uses >= discountData.max_uses) {
                    return res.status(400).json({
                        success: false,
                        message: 'Discount code has reached maximum usage limit'
                    });
                }

                // Calculate discount
                if (discountData.discount_type === 'percentage') {
                    discount = (plan.price * discountData.discount_value) / 100;
                } else {
                    discount = discountData.discount_value;
                }

                finalPrice = Math.max(0, plan.price - discount);

                discountInfo = {
                    code: discountData.code,
                    type: discountData.discount_type,
                    value: discountData.discount_value,
                    discount_amount: discount
                };
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired discount code'
                });
            }
        }

        res.json({
            success: true,
            calculation: {
                plan_id: plan.id,
                plan_name: `${plan.duration_months} Month${plan.duration_months > 1 ? 's' : ''}`,
                original_price: plan.price,
                discount: discount,
                final_price: finalPrice,
                discount_info: discountInfo
            }
        });

    } catch (error) {
        console.error('❌ Error calculating price:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate price',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;