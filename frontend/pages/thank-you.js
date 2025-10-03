import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { CheckCircle, Heart, Home, Trophy, Twitter, Copy, Sparkles, ArrowRight, Gift } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ThankYouPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);
  const { session_id, amount } = router.query;

  useEffect(() => {
    if (session_id) {
      verifyPayment();
      // Trigger animation after a short delay
      setTimeout(() => {
        setAnimationComplete(true);
      }, 500);
    }
  }, [session_id]);

  const verifyPayment = async () => {
    try {
      const response = await fetch(`/api/verify-payment?session_id=${session_id}`);
      const data = await response.json();
      
      if (data.success) {
        setVerified(true);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareOnTwitter = () => {
    const text = `I just supported @osuChallengers to help keep the challenges running! 🎮❤️`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://osuchallengers.com')}`;
    window.open(url, '_blank');
  };

  const copyShareLink = () => {
    const url = 'https://osuchallengers.com/donate';
    navigator.clipboard.writeText(url);
    toast.success('Link copied!', {
      style: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
    });
  };

  const formattedAmount = amount ? (parseInt(amount) / 100).toFixed(2) : '0.00';

  return (
    <Layout>
      <Toaster position="top-center" />
      
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 flex items-center">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 w-full">
          {/* Success Card */}
          <div className={`glass-2 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 transform transition-all duration-700 ${
            animationComplete ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}>
            <div className="text-center">
              {/* Success Icon */}
              <div className="relative inline-flex mb-6 sm:mb-8">
                <div className={`relative p-6 sm:p-8 rounded-full transition-all duration-1000 ${
                  animationComplete ? 'rotate-0 scale-100' : 'rotate-180 scale-0'
                }`}>
                  <div className="p-6 icon-gradient-green rounded-full icon-container-green">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white icon-shadow-adaptive-lg" />
                  </div>
                </div>
                {animationComplete && (
                  <>
                    <Sparkles className="absolute top-0 right-0 w-6 h-6 text-yellow-400 animate-pulse icon-shadow-adaptive-sm" />
                    <Sparkles className="absolute bottom-0 left-0 w-5 h-5 text-yellow-400 animate-pulse icon-shadow-adaptive-sm" style={{ animationDelay: '0.5s' }} />
                  </>
                )}
              </div>

              {/* Thank You Message */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 text-shadow-adaptive-lg">
                Thank You for Your Support!
              </h1>
              
              <div className="flex items-center justify-center gap-2 mb-8">
                <p className="text-lg sm:text-xl text-white/90 text-shadow-adaptive">
                  Your donation of
                </p>
                <span className="px-4 py-2 glass-3 rounded-full font-bold text-xl sm:text-2xl text-white text-shadow-adaptive">
                  ${formattedAmount}
                </span>
                <p className="text-lg sm:text-xl text-white/90 text-shadow-adaptive">
                  has been received
                </p>
              </div>

              {/* Impact Cards */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
                <div className="glass-1 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 icon-gradient-purple rounded-lg icon-container-purple">
                      <Trophy className="w-5 h-5 text-white icon-shadow-adaptive-sm" />
                    </div>
                    <h3 className="font-semibold text-white text-shadow-adaptive">Challenges Supported</h3>
                  </div>
                  <p className="text-sm text-white/80 text-shadow-adaptive-sm">
                    You're helping maintain live challenges for our community
                  </p>
                </div>

                <div className="glass-1 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 icon-gradient-orange rounded-lg icon-container-orange">
                      <Gift className="w-5 h-5 text-white icon-shadow-adaptive-sm" />
                    </div>
                    <h3 className="font-semibold text-white text-shadow-adaptive">Community Hero</h3>
                  </div>
                  <p className="text-sm text-white/80 text-shadow-adaptive-sm">
                    Your generosity keeps the platform free and accessible to all
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/">
                  <button className="flex items-center gap-2 px-6 py-3 glass-2 hover:glass-3 rounded-full transition-all hover:scale-105 font-medium text-white text-shadow-adaptive-sm">
                    <Home className="w-5 h-5 icon-shadow-adaptive-sm" />
                    Back to Home
                  </button>
                </Link>
              </div>

              {/* Receipt Note */}
              <div className="mt-8 text-center">
                <p className="text-xs sm:text-sm text-white/60 text-shadow-adaptive-sm">
                  A receipt has been sent to your email address
                </p>
              </div>
            </div>
          </div>

          {/* Animated Background Elements */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className={`absolute top-20 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl transition-all duration-1000 ${
              animationComplete ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`} style={{ animationDelay: '0.2s' }}></div>
            <div className={`absolute bottom-20 right-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl transition-all duration-1000 ${
              animationComplete ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`} style={{ animationDelay: '0.4s' }}></div>
            <div className={`absolute top-40 right-20 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl transition-all duration-1000 ${
              animationComplete ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`} style={{ animationDelay: '0.6s' }}></div>
          </div>
        </div>
      </div>
    </Layout>
  );
}