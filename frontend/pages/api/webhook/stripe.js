import Stripe from 'stripe';
import { buffer } from 'micro';
import { supabaseAdmin } from '../../../lib/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Disable body parsing, need raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return;
  }

  // Only create a single record on successful payment (minimize DB writes)
  const { error } = await supabaseAdmin
    .from('donations')
    .insert({
      user_id: session.metadata?.userId !== 'guest' ? parseInt(session.metadata.userId) : null,
      amount: session.amount_total / 100,
      currency: session.currency,
      status: 'completed',
      stripe_payment_intent_id: session.payment_intent,
      stripe_subscription_id: session.subscription,
      is_recurring: session.mode === 'subscription',
      anonymous: session.metadata?.isAnonymous === 'true',
      message: session.metadata?.message || null
    });

  if (error) {
    console.error('Error creating donation record:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  
  // Additional processing if needed
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  
  if (!supabaseAdmin) return;

  // Record the subscription
  const { error } = await supabaseAdmin
    .from('donations')
    .insert({
      user_id: subscription.metadata.userId !== 'guest' ? subscription.metadata.userId : null,
      amount: subscription.items.data[0].price.unit_amount / 100,
      currency: subscription.currency,
      status: 'active',
      stripe_subscription_id: subscription.id,
      is_recurring: true,
      anonymous: subscription.metadata.isAnonymous === 'true',
      message: subscription.metadata.message || null
    });

  if (error) {
    console.error('Error recording subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription cancelled:', subscription.id);
  
  if (!supabaseAdmin) return;

  // Update subscription status
  const { error } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // This handles recurring subscription payments
  if (invoice.subscription && supabaseAdmin) {
    // Record the recurring payment
    const { error } = await supabaseAdmin
      .from('donations')
      .insert({
        user_id: invoice.metadata?.userId !== 'guest' ? invoice.metadata.userId : null,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'completed',
        stripe_subscription_id: invoice.subscription,
        is_recurring: true,
        anonymous: invoice.metadata?.isAnonymous === 'true',
        message: 'Recurring monthly donation'
      });

    if (error) {
      console.error('Error recording recurring payment:', error);
    }
  }
}