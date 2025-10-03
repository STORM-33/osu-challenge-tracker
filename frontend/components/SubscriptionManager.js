import { useState, useEffect } from 'react';
import { 
  CreditCard, Calendar, DollarSign, AlertCircle, 
  CheckCircle, XCircle, Loader2, X 
} from 'lucide-react';

export default function SubscriptionManager({ user }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      // Silently fail - just don't show subscriptions section
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (subscription) => {
    setSelectedSubscription(subscription);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedSubscription) return;

    try {
      setCancellingId(selectedSubscription.id);
      
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: selectedSubscription.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Refresh subscriptions list
      await fetchSubscriptions();
      
      setShowCancelModal(false);
      setSelectedSubscription(null);
      
      alert(`Subscription cancelled successfully. It will remain active until ${new Date(data.cancelsAt).toLocaleDateString()}`);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      alert(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  // Don't render anything while loading or if no subscriptions
  if (loading || subscriptions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white text-shadow-adaptive flex items-center gap-2">
          <CreditCard className="w-5 h-5 icon-shadow-adaptive" />
          Your Subscriptions
        </h3>

        {subscriptions.map((subscription) => (
          <div 
            key={subscription.id} 
            className="glass-2 rounded-xl p-6 border-2 border-white/10"
          >
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {subscription.cancel_at_period_end ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-400">
                      Cancelling
                    </span>
                  </div>
                ) : subscription.status === 'active' ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-500/20 border border-gray-500/40 rounded-full">
                    <span className="text-sm font-semibold text-gray-400">
                      {subscription.status}
                    </span>
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              {!subscription.cancel_at_period_end && subscription.status === 'active' && (
                <button
                  onClick={() => handleCancelClick(subscription)}
                  disabled={cancellingId === subscription.id}
                  className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingId === subscription.id ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    'Cancel Subscription'
                  )}
                </button>
              )}
            </div>

            {/* Subscription Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white/60 text-shadow-adaptive-sm">
                    Monthly Amount
                  </p>
                  <p className="text-lg font-bold text-white text-shadow-adaptive">
                    {formatAmount(subscription.amount, subscription.currency)}
                  </p>
                </div>
              </div>

              {/* Next Billing Date */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-white/60 text-shadow-adaptive-sm">
                    {subscription.cancel_at_period_end ? 'Ends On' : 'Next Billing'}
                  </p>
                  <p className="text-lg font-bold text-white text-shadow-adaptive">
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>
            </div>

            {/* Started Date */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-white/60 text-shadow-adaptive-sm">
                Started: {formatDate(subscription.created)}
              </p>
            </div>

            {/* Cancellation Notice */}
            {subscription.cancel_at_period_end && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-300 text-shadow-adaptive-sm">
                  Your subscription will remain active until{' '}
                  <strong>{formatDate(subscription.current_period_end)}</strong>.
                  You'll continue to have access to all donor perks until then.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-2 rounded-2xl p-6 max-w-md w-full border-2 border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white text-shadow-adaptive">
                Cancel Subscription?
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-white/80 text-shadow-adaptive-sm">
                Are you sure you want to cancel your monthly subscription of{' '}
                <strong>{formatAmount(selectedSubscription.amount, selectedSubscription.currency)}</strong>?
              </p>

              <div className="glass-1 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-white/90 text-shadow-adaptive-sm">
                    Your subscription will remain active until{' '}
                    <strong>{formatDate(selectedSubscription.current_period_end)}</strong>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-white/90 text-shadow-adaptive-sm">
                    You'll keep all your donor perks based on your total donations
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-white/90 text-shadow-adaptive-sm">
                    No more charges after the current period ends
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-all"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={cancellingId === selectedSubscription.id}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingId === selectedSubscription.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    'Cancel Subscription'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}