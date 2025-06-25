import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import DonationForm from '../components/DonationForm';
import { Heart, Sparkles, Shield, Zap, Star, Coffee, Pizza, Rocket } from 'lucide-react';
import { auth } from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function DonatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);

  const donationTiers = [
    {
      id: 'coffee',
      name: 'Coffee',
      amount: 5,
      icon: Coffee,
      description: 'Buy me a coffee to keep me coding!',
      color: 'from-amber-400 to-orange-500'
    },
    {
      id: 'pizza',
      name: 'Pizza',
      amount: 20,
      icon: Pizza,
      description: 'Fuel a late night coding session',
      color: 'from-red-400 to-pink-500'
    },
    {
      id: 'supporter',
      name: 'Supporter',
      amount: 50,
      icon: Star,
      description: 'Become a champion supporter',
      color: 'from-purple-400 to-indigo-500'
    },
    {
      id: 'hero',
      name: 'Hero',
      amount: 100,
      icon: Rocket,
      description: 'Help us reach new heights',
      color: 'from-blue-400 to-cyan-500'
    }
  ];

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await auth.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDonationComplete = (paymentIntent) => {
    // Redirect to thank you page with payment details
    router.push(`/thank-you?payment_intent=${paymentIntent.id}&amount=${paymentIntent.amount}`);
  };

  const handleDonationError = (error) => {
    toast.error(error.message || 'Something went wrong. Please try again.');
  };

  return (
    <Layout>
      <Toaster position="top-center" />
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Heart className="w-10 h-10 text-primary-500 animate-pulse" />
            <h1 className="text-4xl font-bold text-neutral-800">
              Support osu!Challengers
            </h1>
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-4">
            Help us keep the challenges running and improve the platform for everyone!
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-neutral-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Secure payments via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              <span>Instant processing</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Donation Tiers */}
          <div>
            <h2 className="text-2xl font-bold text-neutral-800 mb-6">Choose an Amount</h2>
            
            <div className="grid gap-4 mb-6">
              {donationTiers.map((tier) => {
                const Icon = tier.icon;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier)}
                    className={`
                      relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300
                      ${selectedTier?.id === tier.id 
                        ? 'glass-card-enhanced scale-105 ring-2 ring-primary-500' 
                        : 'glass-card hover:glass-card-enhanced hover:scale-105'
                      }
                    `}
                  >
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-10`} />
                    
                    <div className="relative flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${tier.color} 
                        flex items-center justify-center text-white shadow-lg`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-neutral-800">{tier.name}</h3>
                        <p className="text-sm text-neutral-600">{tier.description}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-neutral-800">${tier.amount}</div>
                        <div className="text-xs text-neutral-500">USD</div>
                      </div>
                    </div>
                    
                    {selectedTier?.id === tier.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* What your donation supports */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold text-neutral-800 mb-4">Your donation helps us:</h3>
              <ul className="space-y-3 text-sm text-neutral-600">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                  <span>Keep the servers running 24/7 for uninterrupted challenge tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  </div>
                  <span>Develop new features and improve the platform</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  </div>
                  <span>Create more exciting challenges and events</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  </div>
                  <span>Maintain our commitment to keeping the platform free for everyone</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <h2 className="text-2xl font-bold text-neutral-800 mb-6">Payment Details</h2>
            
            {!loading && (
              <DonationForm
                user={user}
                selectedAmount={selectedTier?.amount}
                onSuccess={handleDonationComplete}
                onError={handleDonationError}
              />
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 glass-card rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Frequently Asked Questions</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-neutral-800 mb-2">Is my donation secure?</h3>
              <p className="text-sm text-neutral-600">
                Yes! We use Stripe for payment processing, which is PCI compliant and uses industry-standard encryption.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-neutral-800 mb-2">Can I donate anonymously?</h3>
              <p className="text-sm text-neutral-600">
                Absolutely! You can choose to make your donation anonymous during the checkout process.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-neutral-800 mb-2">Are donations refundable?</h3>
              <p className="text-sm text-neutral-600">
                Please contact us at support@osuchallengers.com within 30 days if you need assistance with your donation.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-neutral-800 mb-2">Do I need an account to donate?</h3>
              <p className="text-sm text-neutral-600">
                No, you can donate as a guest. However, having an account lets you view your donation history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}