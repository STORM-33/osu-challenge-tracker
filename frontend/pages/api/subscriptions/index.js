import { withAuth } from '../../../lib/auth-middleware';
import stripe from '../../../lib/stripe';
import { supabaseAdmin } from '../../../lib/supabase-admin';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = req;

  try {
    // Get all user's active or cancelling subscriptions
    const { data: donations, error } = await supabaseAdmin
      .from('donations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true)
      .not('stripe_subscription_id', 'is', null)
      .in('status', ['completed', 'cancelling'])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!donations || donations.length === 0) {
      return res.status(200).json({
        success: true,
        subscriptions: []
      });
    }

    // Fetch full subscription details from Stripe
    const subscriptionsWithDetails = await Promise.all(
      donations.map(async (donation) => {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            donation.stripe_subscription_id
          );

          return {
            id: subscription.id,
            amount: donation.amount,
            currency: donation.currency,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            created: new Date(subscription.created * 1000).toISOString(),
            canceled_at: subscription.canceled_at 
              ? new Date(subscription.canceled_at * 1000).toISOString() 
              : null,
            ended_at: subscription.ended_at 
              ? new Date(subscription.ended_at * 1000).toISOString() 
              : null,
            // Our database fields
            dbStatus: donation.status,
            message: donation.message,
            anonymous: donation.anonymous
          };
        } catch (stripeError) {
          console.error(`Error fetching subscription ${donation.stripe_subscription_id}:`, stripeError);
          // Return partial data if Stripe fetch fails
          return {
            id: donation.stripe_subscription_id,
            amount: donation.amount,
            currency: donation.currency,
            status: 'unknown',
            dbStatus: donation.status,
            error: 'Could not fetch subscription details'
          };
        }
      })
    );

    // Filter out subscriptions that are actually cancelled/ended
    const activeSubscriptions = subscriptionsWithDetails.filter(sub => 
      sub.status !== 'canceled' && 
      sub.status !== 'incomplete_expired' &&
      sub.status !== 'unpaid'
    );

    return res.status(200).json({
      success: true,
      subscriptions: activeSubscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch subscriptions' 
    });
  }
}

export default withAuth(handler);