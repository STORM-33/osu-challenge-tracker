import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import DonationForm from '../components/DonationForm';
import { Heart, Sparkles, Shield, Zap, Trophy, Users, TrendingUp, Info } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

export default function DonatePage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  const handleDonationComplete = (paymentIntent) => {
    // Redirect to thank you page with payment details
    router.push(`/thank-you?payment_intent=${paymentIntent.id}&amount=${paymentIntent.amount}`);
  };

  const handleDonationError = (error) => {
    toast.error(error.message || 'Something went wrong. Please try again.', {
      style: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
    });
  };

  return (
    <Layout>
      <Toaster position="top-center" />
      
      <div className="min-h-screen py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Section */}
          <div className="mb-8 sm:mb-12">
            <div className="text-center">
              {/* Icon and Title */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4">
                <div className="relative">
                  <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white icon-shadow-adaptive-lg" />
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 absolute -top-1 -right-1 icon-shadow-adaptive-sm" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-shadow-adaptive-lg">
                  Support osu!Challengers
                </h1>
              </div>
              
              {/* Description */}
              <p className="text-white/85 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto text-shadow-adaptive px-4 sm:px-0">
                Your support helps us maintain and improve the challenge tracking platform for thousands of players worldwide
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 lg:items-stretch">
            {/* Left Column - Impact */}
            <div className="flex flex-col space-y-6 sm:space-y-8">
              {/* What Your Support Enables */}
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 icon-gradient-purple rounded-lg sm:rounded-xl icon-container-purple">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive">
                    Your Impact
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Active Challenges */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:glass-2 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 icon-gradient-blue rounded icon-container-blue">
                        <Zap className="w-3 h-3 text-white icon-shadow-adaptive-sm" />
                      </div>
                      <span className="font-semibold text-white text-shadow-adaptive-sm text-sm">24/7 Uptime</span>
                    </div>
                    <p className="text-xs text-white/80 text-shadow-adaptive-sm">
                      Keep challenges running smoothly for all players
                    </p>
                  </div>

                  {/* Score Tracking */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:glass-2 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 icon-gradient-green rounded icon-container-green">
                        <TrendingUp className="w-3 h-3 text-white icon-shadow-adaptive-sm" />
                      </div>
                      <span className="font-semibold text-white text-shadow-adaptive-sm text-sm">Live Updates</span>
                    </div>
                    <p className="text-xs text-white/80 text-shadow-adaptive-sm">
                      Real-time score tracking and leaderboards
                    </p>
                  </div>

                  {/* New Features */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:glass-2 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 icon-gradient-orange rounded icon-container-orange">
                        <Sparkles className="w-3 h-3 text-white icon-shadow-adaptive-sm" />
                      </div>
                      <span className="font-semibold text-white text-shadow-adaptive-sm text-sm">New Features</span>
                    </div>
                    <p className="text-xs text-white/80 text-shadow-adaptive-sm">
                      Develop exciting updates and improvements
                    </p>
                  </div>

                  {/* Community */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:glass-2 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 icon-gradient-red rounded icon-container-red">
                        <Users className="w-3 h-3 text-white icon-shadow-adaptive-sm" />
                      </div>
                      <span className="font-semibold text-white text-shadow-adaptive-sm text-sm">Free Access</span>
                    </div>
                    <p className="text-xs text-white/80 text-shadow-adaptive-sm">
                      Keep the platform free for everyone
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ Section - Moved here and made smaller */}
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 icon-gradient-orange rounded icon-container-orange">
                    <Info className="w-4 h-4 text-white icon-shadow-adaptive-sm" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white text-shadow-adaptive">
                    Frequently Asked Questions
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <div className="glass-1 rounded-lg p-3">
                    <h4 className="font-medium text-white mb-1 text-sm text-shadow-adaptive-sm">
                      Question placeholder 1
                    </h4>
                    <p className="text-xs text-white/70 text-shadow-adaptive-sm">
                      Content to be added later
                    </p>
                  </div>
                  
                  <div className="glass-1 rounded-lg p-3">
                    <h4 className="font-medium text-white mb-1 text-sm text-shadow-adaptive-sm">
                      Question placeholder 2
                    </h4>
                    <p className="text-xs text-white/70 text-shadow-adaptive-sm">
                      Content to be added later
                    </p>
                  </div>

                  <div className="glass-1 rounded-lg p-3">
                    <h4 className="font-medium text-white mb-1 text-sm text-shadow-adaptive-sm">
                      Question placeholder 3
                    </h4>
                    <p className="text-xs text-white/70 text-shadow-adaptive-sm">
                      Content to be added later
                    </p>
                  </div>

                  <div className="glass-1 rounded-lg p-3">
                    <h4 className="font-medium text-white mb-1 text-sm text-shadow-adaptive-sm">
                      Question placeholder 4
                    </h4>
                    <p className="text-xs text-white/70 text-shadow-adaptive-sm">
                      Content to be added later
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Form */}
            <div className="flex-1 space-y-6 sm:space-y-8">
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <Shield className="w-5 h-5 text-green-400 icon-shadow-adaptive-sm" />
                  <h3 className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">
                    Secure Donation
                  </h3>
                </div>

                {/* Let DonationForm handle all the form logic */}
                <DonationForm
                  user={user}
                  onSuccess={handleDonationComplete}
                  onError={handleDonationError}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}