import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { CheckCircle, Heart, Home, Trophy, Share2, Twitter, Copy, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';

export default function ThankYouPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const { session_id, amount } = router.query;

  useEffect(() => {
    if (session_id) {
      verifyPayment();
      // Trigger confetti animation
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
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
    toast.success('Link copied to clipboard!');
  };

  const formattedAmount = amount ? (parseInt(amount) / 100).toFixed(2) : '0.00';

  return (
    <Layout>
      <Toaster position="top-center" />
      
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          {/* Success Icon Animation */}
          <div className="relative inline-flex mb-8">
            <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-8">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-500 animate-pulse" />
          </div>

          {/* Thank You Message */}
          <h1 className="text-4xl font-bold text-neutral-800 mb-4">
            Thank You for Your Support!
          </h1>
          
          <div className="flex items-center justify-center gap-2 mb-6">
            <Heart className="w-6 h-6 text-primary-500 animate-pulse" />
            <p className="text-xl text-neutral-600">
              Your donation of <span className="font-bold text-primary-600">${formattedAmount}</span> has been received
            </p>
            <Heart className="w-6 h-6 text-primary-500 animate-pulse" />
          </div>

          {/* Impact Message */}
          <div className="glass-card-enhanced rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">Your Impact</h2>
            <p className="text-neutral-600 mb-6">
              Thanks to supporters like you, we can continue to provide free access to osu! challenge tracking
              for players worldwide. Your generosity directly helps us:
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-primary-500 rounded-full"></div>
                </div>
                <span className="text-sm text-neutral-700">Maintain 24/7 server uptime</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                </div>
                <span className="text-sm text-neutral-700">Develop new features faster</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                </div>
                <span className="text-sm text-neutral-700">Create exciting new challenges</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-sm text-neutral-700">Keep the platform free for all</span>
              </div>
            </div>
          </div>

          {/* Share Section */}
          <div className="glass-card rounded-2xl p-6 mb-8 max-w-md mx-auto">
            <h3 className="font-bold text-neutral-800 mb-4">Spread the Love</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Help us grow by sharing with your friends!
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={shareOnTwitter}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-neutral-800 transition-all hover:scale-105"
              >
                <Twitter className="w-4 h-4" />
                Share on Twitter
              </button>
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-4 py-2 glass-card hover:glass-card-enhanced rounded-full transition-all hover:scale-105"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-2 px-6 py-3 glass-card hover:glass-card-enhanced rounded-full transition-all hover:scale-105 font-medium">
                <Home className="w-5 h-5" />
                Back to Home
              </button>
            </Link>
            <Link href="/challenges">
              <button className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-all hover:scale-105 hover:shadow-lg font-medium">
                <Trophy className="w-5 h-5" />
                View Challenges
              </button>
            </Link>
          </div>

          {/* Receipt Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-neutral-500">
              A receipt has been sent to your email address. If you have any questions, 
              please contact us at <a href="mailto:support@osuchallengers.com" className="text-primary-600 hover:underline">support@osuchallengers.com</a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}