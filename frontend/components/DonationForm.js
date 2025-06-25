import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Lock, AlertCircle, Loader2, Mail, MessageSquare, Eye, EyeOff } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function DonationForm({ user, selectedAmount, onSuccess, onError }) {
  const [amount, setAmount] = useState(selectedAmount || '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (selectedAmount) {
      setAmount(selectedAmount);
      setCustomAmount(false);
    }
  }, [selectedAmount]);

  const validateForm = () => {
    const errors = {};
    
    if (!amount || amount < 1) {
      errors.amount = 'Please enter an amount of at least $1';
    }
    
    if (!user && !email) {
      errors.email = 'Email is required for guest donations';
    } else if (!user && email && !/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setProcessing(true);
    
    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          isRecurring,
          email: user?.email || email,
          userId: user?.id,
          message,
          isAnonymous,
          metadata: {
            username: user?.username || 'Guest',
            donationType: isRecurring ? 'recurring' : 'one-time'
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Donation Type Toggle */}
      <div className="glass-card rounded-xl p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setIsRecurring(false)}
            className={`py-3 px-4 rounded-lg font-medium transition-all ${
              !isRecurring 
                ? 'bg-white text-neutral-800 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            One-time
          </button>
          <button
            type="button"
            onClick={() => setIsRecurring(true)}
            className={`py-3 px-4 rounded-lg font-medium transition-all ${
              isRecurring 
                ? 'bg-white text-neutral-800 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Custom Amount Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {customAmount || !selectedAmount ? 'Enter amount' : 'Donation amount'}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">
            $
          </span>
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            onFocus={() => setCustomAmount(true)}
            placeholder="0.00"
            className={`w-full pl-8 pr-4 py-3 rounded-xl border ${
              formErrors.amount ? 'border-red-300' : 'border-neutral-200'
            } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
          />
        </div>
        {formErrors.amount && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {formErrors.amount}
          </p>
        )}
        {customAmount && !formErrors.amount && (
          <p className="mt-1 text-sm text-neutral-500">
            Enter any amount you'd like to donate
          </p>
        )}
      </div>

      {/* Email for guests */}
      {!user && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={`w-full px-4 py-3 rounded-xl border ${
              formErrors.email ? 'border-red-300' : 'border-neutral-200'
            } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
          />
          {formErrors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {formErrors.email}
            </p>
          )}
          <p className="mt-1 text-sm text-neutral-500">
            We'll send your receipt to this email
          </p>
        </div>
      )}

      {/* Message (optional) */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave a message with your donation..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Anonymous toggle */}
      <div className="flex items-center gap-3 glass-card rounded-xl p-4">
        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isAnonymous ? 'bg-primary-500' : 'bg-neutral-300'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isAnonymous ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer"
          onClick={() => setIsAnonymous(!isAnonymous)}>
          {isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          Make donation anonymous
        </label>
      </div>

      {/* Payment info */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">Secure payment</p>
            <p>Your payment info is encrypted and processed securely through Stripe.</p>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={processing || !amount}
        className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 ${
          processing || !amount
            ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
            : 'bg-primary-500 hover:bg-primary-600 text-white transform hover:scale-105 hover:shadow-lg'
        }`}
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Donate ${amount || '0'} {isRecurring ? 'Monthly' : 'Now'}
          </>
        )}
      </button>

      {/* Legal text */}
      <p className="text-xs text-neutral-500 text-center">
        By donating, you agree that your donation is non-refundable and given freely to support osu!Challengers.
      </p>
    </form>
  );
}