import { withAuth } from '../../../lib/auth-middleware';
import stripe from '../../../lib/stripe';
import { supabaseAdmin } from '../../../lib/supabase-admin';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = req;
  const { subscriptionId } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ error: 'Subscription ID is required' });
  }

  try {
    // Verify the subscription belongs to this user
    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donations')
      .select('id, user_id, stripe_subscription_id, status')
      .eq('stripe_subscription_id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (donationError || !donation) {
      return res.status(404).json({ 
        error: 'Subscription not found or does not belong to you' 
      });
    }

    if (donation.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'Subscription is already cancelled' 
      });
    }

    // Cancel the subscription at period end (not immediately)
    const cancelledSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true
      }
    );

    // Update our database to reflect the pending cancellation
    const { error: updateError } = await supabaseAdmin
      .from('donations')
      .update({
        status: 'cancelling', // New status to indicate pending cancellation
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
      console.error('Error updating donation status:', updateError);
      // Don't fail the request - the Stripe cancellation succeeded
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
      cancelsAt: new Date(cancelledSubscription.current_period_end * 1000).toISOString(),
      subscription: {
        id: cancelledSubscription.id,
        status: cancelledSubscription.status,
        cancel_at_period_end: cancelledSubscription.cancel_at_period_end,
        current_period_end: cancelledSubscription.current_period_end
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({ 
      error: 'Failed to cancel subscription. Please try again or contact support.' 
    });
  }
}

export default withAuth(handler);