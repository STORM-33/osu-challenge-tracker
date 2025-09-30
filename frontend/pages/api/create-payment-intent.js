import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { withOptionalAuth } from '../../lib/auth-middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user?.id || null;
    const username = req.user?.username || 'Guest';
    
    const {
      amount,
      currency = 'usd',
      isRecurring,
      email,
      message,
      isAnonymous,
      metadata = {}
    } = req.body;

    if (!amount || amount < 100 || amount > 100000) {
      return res.status(400).json({ 
        error: 'Invalid amount. Must be between $1.00 and $1,000.00' 
      });
    }

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
        userId: userId ? userId.toString() : 'guest',
        email: email || '',
        message: message || '',
        isAnonymous: isAnonymous ? 'true' : 'false',
        username: username
      },
      ...(email && { customer_email: email })
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withOptionalAuth(handler);