import Stripe from 'stripe';

// Server-side Stripe instance
let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

// Utility functions for common Stripe operations
export const stripeUtils = {
  // Create a customer
  createCustomer: async ({ email, userId, username }) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.customers.create({
      email,
      metadata: {
        userId: userId || 'guest',
        username: username || 'Guest User'
      }
    });
  },

  // Create a payment intent
  createPaymentIntent: async ({ amount, currency = 'usd', customerId, metadata }) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  },

  // Create a subscription
  createSubscription: async ({ customerId, priceId, metadata }) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata
    });
  },

  // Cancel a subscription
  cancelSubscription: async (subscriptionId) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.subscriptions.cancel(subscriptionId);
  },

  // List customer's subscriptions
  listSubscriptions: async (customerId) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method']
    });
  },

  // Get payment methods
  getPaymentMethods: async (customerId) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
  }
};

// Price IDs for different donation tiers (create these in Stripe Dashboard)
export const DONATION_PRICES = {
  oneTime: {
    coffee: 'price_coffee_onetime',      // $5
    pizza: 'price_pizza_onetime',        // $20
    supporter: 'price_supporter_onetime', // $50
    hero: 'price_hero_onetime'           // $100
  },
  recurring: {
    coffee: 'price_coffee_monthly',      // $5/month
    pizza: 'price_pizza_monthly',        // $20/month
    supporter: 'price_supporter_monthly', // $50/month
    hero: 'price_hero_monthly'           // $100/month
  }
};

export default stripe;