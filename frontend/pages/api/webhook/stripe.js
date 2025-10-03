import Stripe from 'stripe';
import { buffer } from 'micro';
import { supabaseAdmin } from '../../../lib/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseUserId(userIdString) {
  if (!userIdString || userIdString === 'guest') {
    return null;
  }
  
  const parsed = parseInt(userIdString, 10);
  
  if (isNaN(parsed) || parsed < 1 || parsed > 2147483647) {
    console.error('Invalid userId in webhook metadata:', userIdString);
    return null;
  }
  
  return parsed;
}

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

  // Check for duplicate webhook events
  const { data: existingEvent, error: checkError } = await supabaseAdmin
    .from('processed_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingEvent) {
    console.log('Duplicate webhook event received (already processed):', event.id);
    return res.status(200).json({ 
      received: true, 
      duplicate: true,
      message: 'Event already processed'
    });
  }

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking webhook event:', checkError);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const fullSession = await stripe.checkout.sessions.retrieve(
          event.data.object.id,
          { expand: ['subscription'] }
        );
        await handleCheckoutSessionCompleted(fullSession);
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
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Record that we processed this event
    const { error: insertError } = await supabaseAdmin
      .from('processed_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString()
      });

    if (insertError && insertError.code !== '23505') {
      console.error('Error recording processed webhook event:', insertError);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  console.log('Session mode:', session.mode);
  
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return;
  }

  let subscriptionId = session.subscription;
  
  if (subscriptionId && typeof subscriptionId === 'object' && subscriptionId.id) {
    subscriptionId = subscriptionId.id;
  }
  
  if (session.mode === 'subscription' && !subscriptionId) {
    console.log('Subscription ID not found, retrieving full session...');
    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['subscription', 'payment_intent']
      });
      subscriptionId = fullSession.subscription?.id || fullSession.subscription;
      console.log('Retrieved subscription ID:', subscriptionId);
    } catch (error) {
      console.error('Error retrieving full session:', error);
    }
  }

  const donationData = {
    user_id: parseUserId(session.metadata?.userId),
    amount: session.amount_total / 100,
    currency: session.currency,
    status: 'completed',
    stripe_payment_intent_id: session.mode === 'payment' ? session.payment_intent : null,
    stripe_subscription_id: session.mode === 'subscription' ? subscriptionId : null,
    is_recurring: session.mode === 'subscription',
    anonymous: session.metadata?.isAnonymous === 'true',
    message: session.metadata?.message || null
  };

  console.log('Creating donation record:', donationData);

  const { error } = await supabaseAdmin
    .from('donations')
    .insert(donationData);

  if (error) {
    console.error('Error creating donation record:', error);
  } else {
    console.log('Successfully created donation record');
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  // Skip - we record the subscription in checkout.session.completed
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription cancelled/deleted:', subscription.id);
  
  if (!supabaseAdmin) return;

  // Update subscription status to cancelled
  const { error } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription status:', error);
  } else {
    console.log('Successfully updated subscription to cancelled');
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  
  if (!supabaseAdmin) return;

  // Handle cancel_at_period_end flag
  if (subscription.cancel_at_period_end) {
    console.log('Subscription set to cancel at period end:', subscription.id);
    
    const { error } = await supabaseAdmin
      .from('donations')
      .update({
        status: 'cancelling',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription to cancelling:', error);
    }
  } else if (subscription.status === 'active') {
    // Subscription was reactivated or cancel was undone
    const { error } = await supabaseAdmin
      .from('donations')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription to active:', error);
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  if (!invoice.subscription || !supabaseAdmin) return;
  
  // Skip initial subscription invoice (already recorded in checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') {
    console.log('Skipping initial subscription invoice - already recorded');
    return;
  }
  
  // This is a recurring payment - record it
  const { error } = await supabaseAdmin
    .from('donations')
    .insert({
      user_id: parseUserId(invoice.metadata?.userId),
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
  } else {
    console.log('Successfully recorded recurring payment');
  }
}