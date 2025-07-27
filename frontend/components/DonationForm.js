import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Lock, AlertCircle, Loader2, Mail, MessageSquare, Eye, EyeOff, Gift } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function DonationForm({ user, selectedAmount, onSuccess, onError }) {
  const [amount, setAmount] = useState('20');
  const [isRecurring, setIsRecurring] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [activeAmount, setActiveAmount] = useState(20);
  const [formErrors, setFormErrors] = useState({});

  const predefinedAmounts = [5, 10, 20, 50, 100];

  useEffect(() => {
    if (selectedAmount) {
      setAmount(selectedAmount.toString());
      setActiveAmount(selectedAmount);
    }
  }, [selectedAmount]);

  const handleAmountSelect = (value) => {
    setActiveAmount(value);
    setAmount(value.toString());
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
      if (value) {
        setAmount(value);
        setActiveAmount(parseInt(value));
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    const finalAmount = customAmount || amount;
    
    if (!finalAmount || parseInt(finalAmount) < 1) {
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
      const finalAmount = customAmount || amount;
      
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseInt(finalAmount) * 100), // Convert to cents
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

  const getFinalAmount = () => {
    return customAmount || amount;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
  };

  return (
    <div className="space-y-6"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleFormSubmit(e);
        }
      }}>
      {/* Donation Type Toggle */}
      <div className="view-mode-slider">
        <div className="slider-track">
          <div className={`slider-thumb-two-option ${isRecurring ? 'slider-thumb-two-option-right' : ''}`} />
          <button
            type="button"
            onClick={() => setIsRecurring(false)}
            className={`slider-option ${!isRecurring ? 'slider-option-active' : ''}`}
          >
            One-time
          </button>
          <button
            type="button"
            onClick={() => setIsRecurring(true)}
            className={`slider-option ${isRecurring ? 'slider-option-active' : ''}`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Amount Selection */}
      <div>
        <label className="block text-sm font-medium text-white mb-3 text-shadow-adaptive-sm">
          Select Amount (USD)
        </label>
        
        {/* Predefined Amounts - Single Row Mobile Layout */}
        <div className="grid grid-cols-5 gap-1 sm:gap-3 mb-4">
          {predefinedAmounts.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleAmountSelect(value)}
              className={`
                relative p-2 sm:p-4 rounded-lg sm:rounded-xl font-bold text-white transition-all
                touch-manipulation min-h-[44px] flex items-center justify-center text-xs sm:text-lg
                ${activeAmount === value && !customAmount
                  ? 'glass-3 scale-105' 
                  : 'glass-1 hover:glass-2 active:glass-3 active:scale-95'
                }
              `}
              style={{
                border: activeAmount === value && !customAmount 
                  ? '2px solid rgba(244, 114, 182, 1)' 
                  : '2px solid transparent',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span className="text-xs sm:text-xl text-shadow-adaptive leading-none">
                ${value}
              </span>
              {activeAmount === value && !customAmount && (
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-primary-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Custom Amount - Enhanced Mobile */}
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={customAmount}
            onChange={handleCustomAmountChange}
            placeholder="Enter custom amount"
            className={`
              w-full pl-8 pr-4 py-3 xs:py-4 rounded-xl font-medium text-white placeholder-white/70
              glass-2 border-2 xs:border-3 transition-all text-shadow-adaptive-sm text-base xs:text-lg
              focus:outline-none focus:ring-2 focus:ring-white/70 min-h-[44px]
              ${customAmount ? 'border-primary-500' : 'border-transparent'}
            `}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />
          <span className="absolute left-3 xs:left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold pointer-events-none text-base xs:text-lg">
            $
          </span>
        </div>
        
        {formErrors.amount && (
          <p className="mt-2 text-sm text-red-300 flex items-center gap-1 text-shadow-adaptive-sm">
            <AlertCircle className="w-4 h-4 icon-shadow-adaptive-sm flex-shrink-0" />
            <span className="break-words">{formErrors.amount}</span>
          </p>
        )}
      </div>
      
      {/* Email for guests */}
      {!user && (
        <div>
          <label className="block text-sm font-medium text-white mb-2 text-shadow-adaptive-sm">
            <Mail className="w-4 h-4 inline mr-1 icon-shadow-adaptive-sm" />
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={`
              w-full px-4 py-3 rounded-xl font-medium text-white placeholder-white/50
              glass-2 border-3 transition-all text-shadow-adaptive-sm
              focus:outline-none focus:ring-2 focus:ring-white/50
              ${formErrors.email ? 'border-red-400' : 'border-transparent'}
            `}
          />
          {formErrors.email && (
            <p className="mt-2 text-sm text-red-300 flex items-center gap-1 text-shadow-adaptive-sm">
              <AlertCircle className="w-4 h-4 icon-shadow-adaptive-sm" />
              {formErrors.email}
            </p>
          )}
          <p className="mt-1 text-xs text-white/70 text-shadow-adaptive-sm">
            We'll send your receipt to this email
          </p>
        </div>
      )}

      {/* Message (optional) */}
      <div>
        <label className="block text-sm font-medium text-white mb-2 text-shadow-adaptive-sm">
          <MessageSquare className="w-4 h-4 inline mr-1 icon-shadow-adaptive-sm" />
          Message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave a message with your donation..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl font-medium text-white placeholder-white/70 glass-2 border-3 border-transparent transition-all text-shadow-adaptive-sm focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
        />
      </div>

      {/* Anonymous toggle */}
      <div className="flex items-center justify-between glass-1 rounded-xl p-4">
        <label className="flex items-center gap-3 text-sm font-medium text-white cursor-pointer text-shadow-adaptive-sm">
          {isAnonymous ? <EyeOff className="w-4 h-4 icon-shadow-adaptive-sm" /> : <Eye className="w-4 h-4 icon-shadow-adaptive-sm" />}
          <span>Make donation anonymous</span>
        </label>
        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isAnonymous ? 'bg-primary-500' : 'glass-2'
          }`}
          style={{
            border: '3px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isAnonymous ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Payment info */}
      <div className="glass-1 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-green-400 mt-0.5 icon-shadow-adaptive-sm" />
          <div className="text-sm text-white/90">
            <p className="font-medium mb-1 text-shadow-adaptive-sm">Secure payment</p>
            <p className="text-white/80 text-shadow-adaptive-sm">Your payment info is encrypted and processed securely through Stripe.</p>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleFormSubmit}
        disabled={processing || !getFinalAmount()}
        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-shadow-adaptive ${
          processing || !getFinalAmount()
            ? 'glass-1 text-white/50 cursor-not-allowed'
            : 'bg-gradient-to-r from-primary-500 to-pink-500 text-white transform hover:scale-105 hover:shadow-lg'
        }`}
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin icon-shadow-adaptive-sm" />
            Processing...
          </>
        ) : (
          <>
            <Gift className="w-5 h-5 icon-shadow-adaptive-sm" />
            Donate ${getFinalAmount() || '0'} {isRecurring ? 'Monthly' : 'Now'}
          </>
        )}
      </button>

      {/* Legal text */}
      <p className="text-xs text-white/50 text-center text-shadow-adaptive-sm">
        By donating, you agree that your donation is non-refundable and given freely to support osu!Challengers.
      </p>
    </div>
  );
}