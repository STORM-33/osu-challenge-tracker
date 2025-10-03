import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import DonationForm from '../components/DonationForm';
import SubscriptionManager from '../components/SubscriptionManager';
import { 
  Heart, Sparkles, Shield, Zap, Trophy, Users, 
  Server, Code, Palette, ChevronRight
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

export default function DonatePage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleDonationComplete = (paymentIntent) => {
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
          
          {/* Hero Section */}
          <div className="mb-8 sm:mb-12">
            <div className="text-center">
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-6">
                  <Heart className="w-16 h-16 sm:w-20 sm:h-20 text-white icon-shadow-adaptive-lg animate-float" />
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-adaptive-lg mb-4">
                  Support osu!Challengers
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-white/85 max-w-3xl mx-auto text-shadow-adaptive leading-relaxed px-4 sm:px-0">
                  Help us keep the platform running and free for everyone. 
                  Your donation directly supports server costs and development.
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Manager (only shows if user has subscriptions) */}
          {user && (
            <div className="mb-8">
              <SubscriptionManager user={user} />
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            
            {/* Left Column - Impact Information */}
            <div className="space-y-6 sm:space-y-8">
              
              {/* Where Your Money Goes */}
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 icon-gradient-purple rounded-lg sm:rounded-xl icon-container-purple">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive">
                    Your Impact
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Server Infrastructure */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 hover:glass-2 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 icon-gradient-blue rounded icon-container-blue mt-0.5">
                        <Server className="w-4 h-4 text-white icon-shadow-adaptive-sm" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-shadow-adaptive mb-1">
                          Server Infrastructure
                        </h4>
                        <p className="text-sm text-white/80 text-shadow-adaptive-sm">
                          Website and database hosting, CDN, and automatic backups for 24/7 availability
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Platform Maintenance */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 hover:glass-2 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 icon-gradient-green rounded icon-container-green mt-0.5">
                        <Code className="w-4 h-4 text-white icon-shadow-adaptive-sm" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-shadow-adaptive mb-1">
                          Reliability & Upkeep
                        </h4>
                        <p className="text-sm text-white/80 text-shadow-adaptive-sm">
                          Keeping things running, bug fixes, and maintaining functionality
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Platform Features */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 hover:glass-2 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 icon-gradient-orange rounded icon-container-orange mt-0.5">
                        <Zap className="w-4 h-4 text-white icon-shadow-adaptive-sm" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-shadow-adaptive mb-1">
                          Platform Features
                        </h4>
                        <p className="text-sm text-white/80 text-shadow-adaptive-sm">
                          Real-time score tracking, leaderboards, seasonal competitions, and API integrations
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Community */}
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 hover:glass-2 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 icon-gradient-purple rounded icon-container-red mt-0.5">
                        <Trophy className="w-4 h-4 text-white icon-shadow-adaptive-sm" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-shadow-adaptive mb-1">
                          Supporter Prizes & Community
                        </h4>
                        <p className="text-sm text-white/80 text-shadow-adaptive-sm">
                          Fund prizes for challenge winners while keeping the platform free for everyone
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why Donate */}
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg font-bold text-white mb-4 text-shadow-adaptive">
                  Why Your Support Matters
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                    <span className="text-sm text-white/90 text-shadow-adaptive-sm">
                      We run entirely on community support with no ads or paywalls
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                    <span className="text-sm text-white/90 text-shadow-adaptive-sm">
                      Every dollar goes directly to platform costs and improvements
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                    <span className="text-sm text-white/90 text-shadow-adaptive-sm">
                      Your contribution helps thousands of players track their progress
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                    <span className="text-sm text-white/90 text-shadow-adaptive-sm">
                      Help maintain reliable service and platform stability
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/70 icon-shadow-adaptive-sm" />
                    <span className="text-sm text-white/90 text-shadow-adaptive-sm">
                      Help maintain fast, reliable service for all players
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info Box */}
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 icon-gradient-green rounded icon-container-green">
                    <Sparkles className="w-4 h-4 text-white icon-shadow-adaptive-sm" />
                  </div>
                  <h3 className="text-lg font-bold text-white text-shadow-adaptive">
                    Our Commitment
                  </h3>
                </div>
                <p className="text-sm text-white/80 text-shadow-adaptive-sm leading-relaxed mb-3">
                  We're committed to transparency and efficiency. Your donations ensure:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-white/90 text-shadow-adaptive-sm">No ads or premium tiers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-white/90 text-shadow-adaptive-sm">Consistent uptime and reliability</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-white/90 text-shadow-adaptive-sm">Community-driven development</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column - Donation Form */}
            <div className="lg:sticky lg:top-6 lg:h-fit">
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <Shield className="w-5 h-5 text-green-400 icon-shadow-adaptive-sm" />
                  <h3 className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">
                    Secure Donation
                  </h3>
                </div>

                <DonationForm
                  user={user}
                  onSuccess={handleDonationComplete}
                  onError={handleDonationError}
                />
              </div>
            </div>
          </div>

          {/* Thank You Section */}
          <div className="mt-12 sm:mt-16 text-center">
            <div className="glass-2 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive animate-pulse-soft" />
                <h3 className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive">
                  Thank You
                </h3>
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive animate-pulse-soft" />
              </div>
              <p className="text-sm sm:text-lg text-white/85 text-shadow-adaptive-sm leading-relaxed">
                Every donation helps keep osu!Challengers running and growing. 
                We're grateful for your support in building this community platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}