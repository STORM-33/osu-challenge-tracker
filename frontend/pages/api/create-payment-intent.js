import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      amount,
      currency = 'usd',
      isRecurring,
      email,
      userId,
      message,
      isAnonymous,
      metadata = {}
    } = req.body;

    // Validate amount
    if (!amount || amount < 100) { // Minimum $1.00
      return res.status(400).json({ error: 'Invalid amount. Minimum donation is $1.00' });
    }

    // Create checkout session (no customer creation to save API calls)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: isRecurring ? 'Monthly Support for osu!Challengers' : 'One-time Support for osu!Challengers',
              description: 'Thank you for supporting osu!Challengers!',
            },
            unit_amount: amount,
            ...(isRecurring && {
              recurring: {
                interval: 'month',
                interval_count: 1
              }
            })
          },
          quantity: 1,
        },
      ],
      mode: isRecurring ? 'subscription' : 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}&amount=${amount}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate`,
      metadata: {
        userId: userId || 'guest',
        email: email || '',
        message: message || '',
        isAnonymous: isAnonymous ? 'true' : 'false',
        username: metadata.username || 'Guest'
      },
      ...(email && { customer_email: email })
    });

    // Don't create a pending record - only create on successful payment via webhook
    // This saves database writes

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
}