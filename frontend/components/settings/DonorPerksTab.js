// components/settings/DonorPerksTab.js
import { useState, useEffect } from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { Gift, Heart, Star, Lock, Check, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DonorPerksTab() {
  const { settings, donorStatus, availableBackgrounds, updateSettings } = useSettings();
  const [selectedBackground, setSelectedBackground] = useState(settings.donor_background_id);

  const handleBackgroundSelect = (backgroundId) => {
    setSelectedBackground(backgroundId);
    updateSettings({ donor_background_id: backgroundId }, true); // Preview mode
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const donorTiers = [
    {
      name: 'Supporter',
      minAmount: 10,
      color: 'from-blue-500 to-cyan-500',
      borderColor: 'border-blue-400',
      perks: [
        'Access to special backgrounds',
        'Supporter badge on profile',
        'Priority sync for scores',
        'Early access to new features'
      ]
    },
    {
      name: 'Premium Supporter',
      minAmount: 25,
      color: 'from-purple-500 to-pink-500',
      borderColor: 'border-purple-400',
      perks: [
        'All Supporter perks',
        'Exclusive premium backgrounds',
        'Custom profile effects',
        'Special username gradient',
        'Beta feature access'
      ]
    }
  ];

  const currentTier = donorStatus?.tier;
  const totalDonations = donorStatus?.totalDonations || 0;

  if (!donorStatus?.isDonor) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2 text-shadow-adaptive">
            <Gift className="w-5 h-5 sm:w-6 sm:h-6 icon-shadow-adaptive" />
            Donor Perks
          </h2>
          <p className="text-white/80 text-sm sm:text-base text-shadow-adaptive-sm">
            Support osu!Challengers and unlock exclusive features!
          </p>
        </div>

        {/* Become a Donor CTA */}
        <div className="glass-2 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
          <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-pink-400 mx-auto mb-4 icon-shadow-adaptive" />
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 text-shadow-adaptive">
            Become a Supporter
          </h3>
          <p className="text-white/80 mb-6 max-w-md mx-auto text-shadow-adaptive-sm">
            Your donations help keep osu!Challengers running and allow us to add new features for the community!
          </p>
          
          {/* Tier Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {donorTiers.map((tier) => (
              <div key={tier.name} className={`glass-1 rounded-xl p-4 border-2 ${tier.borderColor}`}>
                <div className={`inline-flex px-3 py-1 bg-gradient-to-r ${tier.color} text-white rounded-full text-sm font-bold mb-3`}>
                  {tier.name}
                </div>
                <p className="text-lg font-bold text-white mb-3 text-shadow-adaptive">
                  {formatAmount(tier.minAmount)}+
                </p>
                <ul className="space-y-2 text-left">
                  {tier.perks.slice(0, 3).map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-shadow-adaptive-sm">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <Link href="/donate" className="btn-primary inline-flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Donate Now
          </Link>
        </div>
      </div>
    );
  }

  // Donor view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2 text-shadow-adaptive">
          <Gift className="w-5 h-5 sm:w-6 sm:h-6 icon-shadow-adaptive" />
          Donor Perks
        </h2>
        <p className="text-white/80 text-sm sm:text-base text-shadow-adaptive-sm">
          Thank you for supporting osu!Challengers! 💖
        </p>
      </div>

      {/* Donor Status */}
      <div className="glass-2 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white text-shadow-adaptive">Your Status</h3>
            <p className="text-sm text-white/70 text-shadow-adaptive-sm">
              Total donated: {formatAmount(totalDonations)}
            </p>
          </div>
          <div className={`px-4 py-2 bg-gradient-to-r ${
            currentTier === 'premium' ? 'from-purple-500 to-pink-500' : 'from-blue-500 to-cyan-500'
          } text-white rounded-full font-bold shadow-lg`}>
            {currentTier === 'premium' ? 'Premium' : 'Supporter'}
          </div>
        </div>

        {/* Progress to next tier */}
        {currentTier !== 'premium' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70 text-shadow-adaptive-sm">Progress to Premium</span>
              <span className="text-white/90 font-medium text-shadow-adaptive-sm">
                {formatAmount(25 - totalDonations)} to go
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((totalDonations / 25) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Special Backgrounds */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white text-shadow-adaptive flex items-center gap-2">
          <Sparkles className="w-5 h-5 icon-shadow-adaptive" />
          Special Backgrounds
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Default option */}
          <button
            onClick={() => handleBackgroundSelect(null)}
            className={`glass-1 rounded-xl p-4 transition-all hover:glass-2 ${
              selectedBackground === null ? 'ring-2 ring-white/50 shadow-lg' : ''
            }`}
          >
            <div className="aspect-video rounded-lg bg-gradient-to-br from-orange-500 to-red-500 mb-3" />
            <h4 className="font-semibold text-white text-shadow-adaptive">Default Theme</h4>
            <p className="text-sm text-white/70 text-shadow-adaptive-sm">Use color settings</p>
          </button>

          {/* Available backgrounds */}
          {availableBackgrounds.map((bg) => (
            <button
              key={bg.id}
              onClick={() => handleBackgroundSelect(bg.id)}
              className={`glass-1 rounded-xl p-4 transition-all hover:glass-2 ${
                selectedBackground === bg.id ? 'ring-2 ring-white/50 shadow-lg' : ''
              }`}
            >
              <div 
                className="aspect-video rounded-lg mb-3 bg-cover bg-center"
                style={{ backgroundImage: `url(${bg.preview_url || bg.image_url})` }}
              />
              <h4 className="font-semibold text-white text-shadow-adaptive">{bg.name}</h4>
              {bg.description && (
                <p className="text-sm text-white/70 text-shadow-adaptive-sm">{bg.description}</p>
              )}
              {bg.min_donation_total > totalDonations && (
                <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400">
                  <Lock className="w-3 h-3" />
                  Requires {formatAmount(bg.min_donation_total)}+
                </div>
              )}
            </button>
          ))}
        </div>

        {/* More backgrounds coming soon */}
        <div className="glass-1 rounded-xl p-6 text-center">
          <p className="text-white/70 text-shadow-adaptive-sm">
            More exclusive backgrounds coming soon! 🎨
          </p>
        </div>
      </div>

      {/* Active Perks */}
      <div className="glass-1 rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 text-shadow-adaptive">Active Perks</h3>
        <ul className="space-y-3">
          {donorTiers
            .find(tier => tier.name.toLowerCase().includes(currentTier))
            ?.perks.map((perk, i) => (
              <li key={i} className="flex items-center gap-3 text-white/90">
                <div className="p-1 rounded-full bg-green-500/20">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-shadow-adaptive-sm">{perk}</span>
              </li>
            ))}
        </ul>
      </div>

      {/* Donate More */}
      <div className="text-center pt-4 border-t border-white/10">
        <Link 
          href="/donate" 
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <Heart className="w-4 h-4" />
          <span className="text-shadow-adaptive-sm">Donate more to support us</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}