import React, { useMemo } from 'react';
import { Trophy, Star, Crown, Medal, Award, Sparkles, Target, Flame } from 'lucide-react';

// Medal definitions
const MEDAL_DEFINITIONS = {
  // Achievement medals
  first_victory: {
    name: 'First Victory',
    description: 'Win your first challenge',
    category: 'achievement',
    icon: Trophy,
    color: 'from-green-400 to-emerald-500',
    check: (stats) => (stats.firstPlaceCount || 0) >= 1
  },
  challenger: {
    name: 'Challenger', 
    description: 'Win 3 challenges',
    category: 'achievement',
    icon: Trophy,
    color: 'from-cyan-400 to-blue-500',
    check: (stats) => (stats.firstPlaceCount || 0) >= 3
  },
  gladiator: {
    name: 'Gladiator',
    description: 'Win 10 challenges', 
    category: 'achievement',
    icon: Trophy,
    color: 'from-pink-400 to-purple-500',
    check: (stats) => (stats.firstPlaceCount || 0) >= 10
  },
  
  // Streak medals
  consistent: {
    name: 'Consistent',
    description: 'Achieve a 7 challenge streak',
    category: 'streak',
    icon: Flame,
    color: 'from-orange-400 to-red-500',
    check: (stats, streaks) => (streaks?.longestStreak || 0) >= 7
  },
  dedicated: {
    name: 'Dedicated',
    description: 'Achieve a 14 challenge streak',
    category: 'streak',
    icon: Flame, 
    color: 'from-red-400 to-pink-500',
    check: (stats, streaks) => (streaks?.longestStreak || 0) >= 14
  },
  
  // Performance medals
  perfectionist: {
    name: 'Perfectionist',
    description: 'Achieve 100% accuracy',
    category: 'performance',
    icon: Target,
    color: 'from-yellow-400 to-orange-500',
    check: (stats, streaks, scores) => scores?.some(s => s.accuracy === 100) || false
  },
  top_performer: {
    name: 'Top Performer',
    description: 'Achieve 95%+ average accuracy',
    category: 'performance', 
    icon: Star,
    color: 'from-pink-400 to-purple-500',
    check: (stats) => (stats.avgAccuracy || 0) >= 95
  },
  
  // Participation medals
  active_player: {
    name: 'Active Player',
    description: 'Play 50+ maps',
    category: 'participation',
    icon: Medal,
    color: 'from-green-400 to-emerald-500', 
    check: (stats) => (stats.totalScores || 0) >= 50
  },
  veteran: {
    name: 'Veteran',
    description: 'Play 200+ maps',
    category: 'participation',
    icon: Medal,
    color: 'from-cyan-400 to-blue-500',
    check: (stats) => (stats.totalScores || 0) >= 200
  }
};

const TITLE_DEFINITIONS = {
  champion: {
    name: 'Champion',
    description: 'Current #1 player',
    category: 'seasonal',
    temporary: true,
    icon: Crown,
    color: 'from-yellow-400 to-orange-500',
    check: (stats, streaks, scores, seasonRank) => seasonRank === 1
  },
  rising_star: {
    name: 'Rising Star', 
    description: 'Top 10% this season',
    category: 'seasonal',
    temporary: true,
    icon: Star,
    color: 'from-purple-400 to-pink-500', 
    check: (stats, streaks, scores, seasonRank, seasonPercentile) => (seasonPercentile || 0) >= 90
  }
};

const MedalsDisplay = ({ stats, streaks, scores, userAchievements, seasonRank, seasonPercentile }) => {
  // Calculate earned medals client-side using existing data
  const earnedMedals = useMemo(() => {
    const earned = [];
    
    Object.entries(MEDAL_DEFINITIONS).forEach(([code, medal]) => {
      if (medal.check(stats, streaks, scores, seasonRank, seasonPercentile)) {
        earned.push({
          code,
          ...medal,
          earned_at: userAchievements?.find(a => a.achievement_code === code)?.earned_at || new Date()
        });
      }
    });
    
    return earned.sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at));
  }, [stats, streaks, scores, userAchievements, seasonRank, seasonPercentile]);

  const earnedTitles = useMemo(() => {
    const earned = [];
    
    Object.entries(TITLE_DEFINITIONS).forEach(([code, title]) => {
      if (title.check(stats, streaks, scores, seasonRank, seasonPercentile)) {
        earned.push({
          code, 
          ...title,
          earned_at: userAchievements?.find(a => a.achievement_code === code)?.earned_at || new Date()
        });
      }
    });
    
    return earned;
  }, [stats, streaks, scores, userAchievements, seasonRank, seasonPercentile]);

  const categories = [
    { id: 'all', name: 'All', icon: Medal },
    { id: 'achievement', name: 'Achievement', icon: Trophy },
    { id: 'streak', name: 'Streak', icon: Flame },
    { id: 'performance', name: 'Performance', icon: Target },
    { id: 'participation', name: 'Participation', icon: Sparkles }
  ];

  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const filteredMedals = earnedMedals.filter(medal => 
    selectedCategory === 'all' || medal.category === selectedCategory
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Current Title */}
      {earnedTitles.length > 0 && (
        <div className="glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
          <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 flex items-center gap-3 text-shadow-adaptive">
            <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 icon-shadow-adaptive" />
            Current Title
          </h3>
          <div className="flex items-center gap-4 p-4 sm:p-6 glass-2 rounded-xl sm:rounded-2xl border border-yellow-400/30">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">
                {earnedTitles[0].name}
              </h4>
              <p className="text-sm sm:text-base text-white/80 text-shadow-adaptive-sm">
                {earnedTitles[0].description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Medals */}
      <div className="glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-3 text-shadow-adaptive">
            <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-white/90 icon-shadow-adaptive" />
            Medals ({earnedMedals.length})
          </h3>
          
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive 
                      ? 'bg-white/20 text-white shadow-lg' 
                      : 'glass-1 text-white/90 hover:text-white hover:glass-2'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredMedals.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-b from-gray-500/30 to-gray-600/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 glass-3">
              <Medal className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 icon-shadow-adaptive" />
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-white/80 mb-2 text-shadow-adaptive">
              No Medals Yet
            </h4>
            <p className="text-sm sm:text-base text-white/60 text-shadow-adaptive-sm">
              Keep playing to earn your first medal!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredMedals.map((medal) => {
              const Icon = medal.icon;
              return (
                <div
                  key={medal.code}
                  className="group relative p-4 sm:p-6 glass-2 rounded-xl sm:rounded-2xl"
                >
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-b ${medal.color} rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  
                  <div className="text-center">
                    <h4 className="font-bold text-white text-sm sm:text-base mb-1 text-shadow-adaptive">
                      {medal.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-white/90 text-shadow-adaptive-sm line-clamp-2">
                      {medal.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedalsDisplay;