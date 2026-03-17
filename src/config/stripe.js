const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
    console.error('⚠️  Stripe secret key is not configured!');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia',
});

module.exports = stripe;