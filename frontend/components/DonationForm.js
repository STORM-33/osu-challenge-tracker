import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  CreditCard, Lock, AlertCircle, Loader2, Mail, 
  MessageSquare, Eye, EyeOff, Gift, Sparkles,
  Heart, Check, ChevronRight, Shield
} from 'lucide-react';

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
  const [focusedInput, setFocusedInput] = useState(null);

  const predefinedAmounts = [5, 10, 20, 50, 100];

  useEffect(() => {
    if (selectedAmount) {
      setAmount(selectedAmount.toString());
      setActiveAmount(selectedAmount);
      setCustomAmount('');
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
      
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseInt(finalAmount) * 100),
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

  return (
    <div className="space-y-6">
      {/* Donation Type Selector - Redesigned */}
      <div>
        <label className="block text-sm font-bold text-white mb-3 text-shadow-adaptive flex items-center gap-2">
          <Gift className="w-4 h-4 icon-shadow-adaptive-sm" />
          Donation Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsRecurring(false)}
            className={`
              relative p-4 rounded-xl font-semibold text-white transition-all duration-300
              ${!isRecurring 
                ? 'glass-2 border-2 border-primary-500 shadow-lg scale-[1.02]' 
                : 'glass-1 border-2 border-transparent hover:glass-2'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 icon-shadow-adaptive-sm" />
              <span className="text-shadow-adaptive">One-time</span>
            </div>
            {!isRecurring && (
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsRecurring(true)}
            className={`
              relative p-4 rounded-xl font-semibold text-white transition-all duration-300
              ${isRecurring 
                ? 'glass-2 border-2 border-primary-500 shadow-lg scale-[1.02]' 
                : 'glass-1 border-2 border-transparent hover:glass-2'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 icon-shadow-adaptive-sm" />
              <span className="text-shadow-adaptive">Monthly</span>
            </div>
            {isRecurring && (
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Amount Selection - Redesigned */}
      <div>
        <label className="block text-sm font-bold text-white mb-3 text-shadow-adaptive flex items-center gap-2">
          <CreditCard className="w-4 h-4 icon-shadow-adaptive-sm" />
          Select Amount (USD)
        </label>
        
        {/* Quick Select Amounts - Better mobile layout */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {predefinedAmounts.slice(0, 3).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleAmountSelect(value)}
              className={`
                relative p-3 sm:p-4 rounded-xl font-bold text-white transition-all duration-300
                ${activeAmount === value && !customAmount
                  ? 'glass-3 scale-105 border-2 border-primary-500' 
                  : 'glass-1 border-2 border-transparent hover:glass-2 hover:border-white/30'
                }
              `}
            >
              <div className="text-xl sm:text-2xl text-shadow-adaptive">${value}</div>
              {activeAmount === value && !customAmount && (
                <div className="absolute -top-1.5 -right-1.5">
                  <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
          {predefinedAmounts.slice(3).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleAmountSelect(value)}
              className={`
                relative p-3 sm:p-4 rounded-xl font-bold text-white transition-all duration-300
                ${activeAmount === value && !customAmount
                  ? 'glass-3 scale-105 border-2 border-primary-500' 
                  : 'glass-1 border-2 border-transparent hover:glass-2 hover:border-white/30'
                }
              `}
            >
              <div className="text-xl sm:text-2xl text-shadow-adaptive">${value}</div>
              {activeAmount === value && !customAmount && (
                <div className="absolute -top-1.5 -right-1.5">
                  <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Custom Amount - Improved design */}
        <div className="relative">
          <div className={`
            relative overflow-hidden rounded-xl transition-all duration-300
            ${focusedInput === 'custom' ? 'ring-2 ring-primary-500' : ''}
            ${customAmount ? 'glass-3 border-2 border-primary-500' : 'glass-2 border-2 border-transparent'}
          `}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-xl font-bold pointer-events-none text-shadow-adaptive">
              $
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={customAmount}
              onChange={handleCustomAmountChange}
              onFocus={() => setFocusedInput('custom')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Enter custom amount"
              className="w-full pl-10 pr-4 py-4 bg-transparent font-bold text-white placeholder-white/50 text-lg focus:outline-none text-shadow-adaptive"
            />
            {customAmount && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {formErrors.amount && (
          <div className="mt-2 flex items-center gap-2 text-red-300">
            <AlertCircle className="w-4 h-4 icon-shadow-adaptive-sm" />
            <span className="text-sm text-shadow-adaptive-sm">{formErrors.amount}</span>
          </div>
        )}
      </div>

      {/* Email for Guests - Redesigned */}
      {!user && (
        <div>
          <label className="block text-sm font-bold text-white mb-3 text-shadow-adaptive flex items-center gap-2">
            <Mail className="w-4 h-4 icon-shadow-adaptive-sm" />
            Email Address
          </label>
          <div className={`
            relative rounded-xl overflow-hidden transition-all duration-300
            ${focusedInput === 'email' ? 'ring-2 ring-primary-500' : ''}
            ${formErrors.email ? 'glass-2 border-2 border-red-400' : 'glass-2 border-2 border-transparent'}
          `}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-transparent font-medium text-white placeholder-white/50 focus:outline-none text-shadow-adaptive"
            />
          </div>
          {formErrors.email && (
            <div className="mt-2 flex items-center gap-2 text-red-300">
              <AlertCircle className="w-4 h-4 icon-shadow-adaptive-sm" />
              <span className="text-sm text-shadow-adaptive-sm">{formErrors.email}</span>
            </div>
          )}
          <p className="mt-2 text-xs text-white/60 text-shadow-adaptive-sm">
            We'll send your receipt here
          </p>
        </div>
      )}

      {/* Message - Redesigned */}
      <div>
        <label className="block text-sm font-bold text-white mb-3 text-shadow-adaptive flex items-center gap-2">
          <MessageSquare className="w-4 h-4 icon-shadow-adaptive-sm" />
          Support Message (optional)
        </label>
        <div className={`
          relative rounded-xl overflow-hidden transition-all duration-300
          ${focusedInput === 'message' ? 'ring-2 ring-primary-500' : ''}
          glass-2 border-2 border-transparent
        `}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setFocusedInput('message')}
            onBlur={() => setFocusedInput(null)}
            placeholder="Share why you're supporting osu!Challengers..."
            rows={3}
            className="w-full px-4 py-3 bg-transparent font-medium text-white placeholder-white/50 focus:outline-none resize-none text-shadow-adaptive"
          />
        </div>
      </div>

      {/* Privacy Options - Redesigned */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={`
            w-full p-4 rounded-xl transition-all duration-300 group
            ${isAnonymous ? 'glass-2 border-2 border-primary-500' : 'glass-1 border-2 border-transparent hover:glass-2'}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isAnonymous ? (
                <EyeOff className="w-5 h-5 text-white icon-shadow-adaptive-sm" />
              ) : (
                <Eye className="w-5 h-5 text-white/70 icon-shadow-adaptive-sm group-hover:text-white" />
              )}
              <div className="text-left">
                <div className="font-semibold text-white text-shadow-adaptive">
                  Anonymous Donation
                </div>
                <div className="text-xs text-white/60 text-shadow-adaptive-sm">
                  Your name won't be displayed publicly
                </div>
              </div>
            </div>
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center transition-all
              ${isAnonymous ? 'bg-primary-500' : 'glass-2'}
            `}>
              {isAnonymous && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
        </button>
      </div>

      {/* Payment Security Notice - Redesigned */}
      <div className="glass-1 rounded-xl p-4 border-2 border-green-400/30">
        <div className="flex items-start gap-3">
          <div className="p-2 icon-gradient-green rounded icon-container-green">
            <Shield className="w-4 h-4 text-white icon-shadow-adaptive-sm" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-1 text-shadow-adaptive">
              Secure Payment Processing
            </h4>
            <p className="text-xs text-white/80 text-shadow-adaptive-sm">
              Your payment is encrypted and processed securely through Stripe. 
              We never store your payment information.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button - Redesigned */}
      <button
        onClick={handleSubmit}
        disabled={processing || !getFinalAmount()}
        className={`
          w-full py-5 rounded-xl font-bold text-lg transition-all duration-300 relative overflow-hidden
          ${processing || !getFinalAmount()
            ? 'glass-1 text-white/30 cursor-not-allowed'
            : 'bg-gradient-to-r from-primary-500 to-pink-500 text-white transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'
          }
        `}
      >
        {processing ? (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin icon-shadow-adaptive" />
            <span className="text-shadow-adaptive">Processing Payment...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <Heart className="w-6 h-6 icon-shadow-adaptive" />
            <span className="text-shadow-adaptive">
              Donate ${getFinalAmount() || '0'} {isRecurring ? 'Monthly' : 'Now'}
            </span>
            <ChevronRight className="w-6 h-6 icon-shadow-adaptive" />
          </div>
        )}
        
        {/* Animated gradient overlay */}
        {!processing && getFinalAmount() && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        )}
      </button>

      {/* Legal Notice - Simplified */}
      <p className="text-xs text-white/50 text-center text-shadow-adaptive-sm">
        Donations are non-refundable and support the osu!Challengers platform
      </p>
    </div>
  );
}