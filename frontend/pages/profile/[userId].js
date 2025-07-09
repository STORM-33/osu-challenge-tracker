import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading'; 
import { useAuth } from '../../lib/AuthContext';
import { 
  Trophy, Target, Calendar, User, Award, BarChart3, 
  Sparkles, Flame, Zap, ArrowLeft, ExternalLink, TrendingUp,
  Star, Clock, MapPin, Music, ChevronRight, Activity,
  Crown, Medal, Loader2
} from 'lucide-react';

export default function UserProfile() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [allScores, setAllScores] = useState([]);
  const [allBestPerformances, setAllBestPerformances] = useState([]);
  const [stats, setStats] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('recent');
  const [tabLoading, setTabLoading] = useState(false);
  const router = useRouter();
  const { userId } = router.query;

  useEffect(() => {
    if (!userId) return;
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const profileResponse = await fetch(`/api/user/profile/${userId}`);
      
      if (!profileResponse.ok) {
        if (profileResponse.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to load user profile');
        }
        return;
      }

      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        setError(profileData.error?.message || 'Failed to load profile');
        return;
      }

      setProfileUser(profileData.user);
      setAllScores(profileData.scores || []);
      setAllBestPerformances(profileData.bestPerformances || []);
      setStats(profileData.stats || null);
      setStreaks(profileData.streaks || null);

    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    setTabLoading(true);
    setActiveTab(newTab);
    setTimeout(() => setTabLoading(false), 300);
  };

  // Helper functions
  const getCountryFlagUrl = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return null;
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 98) return 'text-purple-400';
    if (accuracy >= 95) return 'text-green-400';
    if (accuracy >= 90) return 'text-blue-400';
    if (accuracy >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAccuracyBorder = (accuracy) => {
    if (accuracy >= 98) return 'acc-badge-purple';
    if (accuracy >= 95) return 'acc-badge-green';
    if (accuracy >= 90) return 'acc-badge-blue';
    if (accuracy >= 85) return 'acc-badge-yellow';
    return 'acc-badge-red';
  };

  const getAccuracyGradient = (accuracy) => {
    if (accuracy >= 98) return 'from-purple-500 to-pink-500';
    if (accuracy >= 95) return 'from-emerald-500 to-green-500';
    if (accuracy >= 90) return 'from-blue-500 to-cyan-500';
    if (accuracy >= 85) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getRankGradient = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-amber-600';
    if (rank <= 3) return 'from-gray-300 to-gray-500';
    if (rank <= 10) return 'from-orange-400 to-red-500';
    return 'from-blue-400 to-indigo-500';
  };

  const getStreakEmoji = (streak) => {
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '✨';
    if (streak >= 3) return '⭐';
    return '💫';
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const getNextMilestone = (totalScores) => {
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    const nextMilestone = milestones.find(m => totalScores < m);
    
    if (!nextMilestone) {
      return { 
        title: '🎉 Legend!', 
        remaining: 0,
        isLegend: true 
      };
    }
    
    return { 
      title: `${nextMilestone} Plays`, 
      remaining: nextMilestone - totalScores,
      isLegend: false
    };
  };

  const getScoresForTab = () => {
    if (activeTab === 'recent') {
      return allScores;
    } else if (activeTab === 'best') {
      return allBestPerformances.length > 0 ? allBestPerformances : 
        allScores.filter(score => (score.calculated_rank) <= 10)
          .sort((a, b) => a.calculated_rank - b.calculated_rank)
          .slice(0, 5);
    }
    return [];
  };

  const isOwnProfile = currentUser && profileUser && currentUser.id === profileUser.id;

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen py-4 sm:py-8">
          <div className="max-w-7xl mx-auto px-3 sm:px-4">
            {/* Mobile-First Loading Skeleton */}
            <div className="space-y-4 sm:space-y-6">
              {/* Header Skeleton */}
              <div className="glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 animate-pulse">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="w-20 h-20 sm:w-32 sm:h-32 bg-white/20 rounded-xl sm:rounded-2xl"></div>
                  <div className="flex-1 space-y-3 sm:space-y-4 text-center sm:text-left">
                    <div className="h-6 sm:h-8 bg-white/20 rounded w-32 sm:w-1/3 mx-auto sm:mx-0"></div>
                    <div className="h-3 sm:h-4 bg-white/20 rounded w-24 sm:w-1/2 mx-auto sm:mx-0"></div>
                    <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start">
                      <div className="h-4 sm:h-6 bg-white/20 rounded w-16 sm:w-20"></div>
                      <div className="h-4 sm:h-6 bg-white/20 rounded w-20 sm:w-24"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stats Skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 animate-pulse">
                    <div className="h-4 sm:h-8 bg-white/20 rounded mb-2 sm:mb-3"></div>
                    <div className="h-3 sm:h-6 bg-white/20 rounded w-2/3"></div>
                  </div>
                ))}
              </div>

              {/* Content Skeleton */}
              <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-8 animate-pulse">
                <div className="space-y-3 sm:space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 sm:h-20 bg-white/20 rounded-lg sm:rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !profileUser) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-3 sm:px-4">
          <div className="text-center max-w-sm sm:max-w-md">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-200/60 to-gray-300/60 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 glass-2">
              <User className="w-12 h-12 sm:w-16 sm:h-16 text-white/70 icon-shadow-adaptive" />
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-white/90 mb-3 sm:mb-4 text-shadow-adaptive">
              {error || 'User Not Found'}
            </h2>
            <p className="text-sm sm:text-base text-white/70 mb-6 sm:mb-8 text-shadow-adaptive-sm">
              The user profile you're looking for doesn't exist or has been removed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 sm:px-6 sm:py-3 glass-2 hover:glass-3 text-white font-semibold rounded-full transition-all flex items-center gap-2 text-shadow-adaptive-sm justify-center"
              >
                <ArrowLeft className="w-4 h-4 icon-shadow-adaptive-sm" />
                Go Back
              </button>
              <Link 
                href="/"
                className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all text-center"
              >
                Browse Challenges
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const scores = getScoresForTab();
  const milestone = getNextMilestone(stats?.totalScores || 0);

  return (
    <Layout>
      <div className="min-h-screen py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          
          {/* Compact Header */}
          <div className="mb-4 sm:mb-8">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-2 text-white/70 hover:text-white/90 font-medium text-shadow-adaptive-sm transition-all text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform icon-shadow-adaptive-sm" />
              Back
            </button>
          </div>

          {/* Mobile-First Profile Hero Section */}
          <div className="relative overflow-hidden glass-1 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 shadow-2xl">
            {/* Enhanced gradient overlay */}
            <div 
              className="absolute inset-0 opacity-70"
              style={{
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9) 0%, rgba(236, 72, 153, 0.9) 50%, rgba(239, 68, 68, 0.9) 100%)'
              }}
            />
            
            {/* Background pattern - simplified for mobile */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-4 -right-4 sm:-top-8 sm:-right-8 w-48 h-48 sm:w-96 sm:h-96 bg-white rounded-full blur-3xl animate-pulse-soft"></div>
              <div className="absolute -bottom-4 -left-4 sm:-bottom-8 sm:-left-8 w-40 h-40 sm:w-80 sm:h-80 bg-white rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
            </div>
            
            <div className="relative z-10 p-4 sm:p-8 text-white">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-8">
                {/* Avatar and Basic Info - Mobile Optimized */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 flex-1 w-full">
                  <div className="relative group">
                    {profileUser.avatar_url ? (
                      <img 
                        src={profileUser.avatar_url} 
                        alt={profileUser.username}
                        className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-white/30 shadow-2xl group-hover:scale-105 transition-transform avatar-border"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-32 sm:h-32 glass-3 rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 sm:border-4 border-white/30 shadow-2xl">
                        <span className="text-2xl sm:text-5xl font-bold text-white text-shadow-adaptive">{profileUser.username[0]}</span>
                      </div>
                    )}
                    {/* Status indicator - smaller on mobile */}
                    <div className="absolute -bottom-1 -right-1 sm:-bottom-3 sm:-right-3 w-6 h-6 sm:w-10 sm:h-10 bg-green-400 rounded-full border-2 sm:border-4 border-white flex items-center justify-center shadow-lg">
                      <div className="w-2 h-2 sm:w-4 sm:h-4 bg-green-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-adaptive">
                        {profileUser.osu_id ? (
                          <a
                            href={`https://osu.ppy.sh/users/${profileUser.osu_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white/80 transition-colors flex items-center gap-2 sm:gap-3 group"
                          >
                            {profileUser.username}
                            <ExternalLink className="w-4 h-4 sm:w-7 sm:h-7 opacity-60 group-hover:opacity-100 transition-opacity icon-shadow-adaptive" />
                          </a>
                        ) : (
                          profileUser.username
                        )}
                      </h1>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                      {profileUser.country && (
                        <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-4 sm:py-2 glass-3 rounded-full">
                          {getCountryFlagUrl(profileUser.country) && (
                            <img 
                              src={getCountryFlagUrl(profileUser.country)} 
                              alt={`${profileUser.country} flag`}
                              className="w-4 h-3 sm:w-6 sm:h-4 object-cover rounded shadow-sm"
                            />
                          )}
                          <span className="font-medium text-white text-shadow-adaptive-sm text-xs sm:text-sm">{profileUser.country.toUpperCase()}</span>
                        </div>
                      )}
                      
                      <div className="px-2 py-1 sm:px-4 sm:py-2 glass-3 rounded-full flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 icon-shadow-adaptive-sm" />
                        <span className="font-medium text-white text-shadow-adaptive-sm text-xs sm:text-sm">
                          Joined {new Date(profileUser.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {profileUser.global_rank && (
                        <div className="px-2 py-1 sm:px-4 sm:py-2 glass-3 rounded-full flex items-center gap-1.5 sm:gap-2">
                          <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 icon-shadow-adaptive-sm" />
                          <span className="font-medium text-white text-shadow-adaptive-sm text-xs sm:text-sm">
                            #{formatNumber(profileUser.global_rank)} Global
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile-First Streak Display */}
                {streaks && (
                  <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="glass-3 rounded-xl sm:rounded-2xl p-3 sm:p-6 min-w-0 flex-1 sm:min-w-[180px] performance-card-orange">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                        <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 icon-shadow-adaptive-sm" />
                        <span className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">Current</span>
                      </div>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white text-glow-orange">{streaks.currentStreak}</span>
                        <span className="text-lg sm:text-2xl">{getStreakEmoji(streaks.currentStreak)}</span>
                      </div>
                    </div>
                    
                    <div className="glass-3 rounded-xl sm:rounded-2xl p-3 sm:p-6 min-w-0 flex-1 sm:min-w-[180px] performance-card-purple">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                        <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-200 icon-shadow-adaptive-sm" />
                        <span className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">Best</span>
                      </div>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white text-glow-purple">{streaks.longestStreak}</span>
                        <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-300 icon-shadow-adaptive" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile-First Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl transition-all group performance-card-purple">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <Target className="w-5 h-5 sm:w-8 sm:h-8 text-purple-500 group-hover:scale-110 transition-transform icon-shadow-adaptive" />
                <span className={`text-lg sm:text-3xl font-black ${getAccuracyColor(parseFloat(stats?.avgAccuracy || 0))} text-glow-purple`}>
                  {stats?.avgAccuracy ? `${stats.avgAccuracy}%` : '--%'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm text-center sm:text-left">Avg Accuracy</p>
            </div>
            
            <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl transition-all group performance-card-green">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <Activity className="w-5 h-5 sm:w-8 sm:h-8 text-green-500 group-hover:scale-110 transition-transform icon-shadow-adaptive" />
                <span className="text-lg sm:text-3xl font-black text-white text-glow-green">
                  #{stats?.avgRank || '--'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm text-center sm:text-left">Avg Rank</p>
            </div>
            
            <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl transition-all group performance-card-blue">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <BarChart3 className="w-5 h-5 sm:w-8 sm:h-8 text-blue-500 group-hover:scale-110 transition-transform icon-shadow-adaptive" />
                <span className="text-lg sm:text-3xl font-black text-white text-glow-blue">
                  {stats?.totalScores || 0}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm text-center sm:text-left">Total Plays</p>
            </div>
            
            <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl transition-all group performance-card-orange">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <Trophy className="w-5 h-5 sm:w-8 sm:h-8 text-yellow-500 group-hover:scale-110 transition-transform icon-shadow-adaptive" />
                <span className="text-lg sm:text-3xl font-black text-white text-glow-orange">
                  {stats?.firstPlaceCount || 0}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm text-center sm:text-left">First Places</p>
            </div>
          </div>

          {/* Mobile-First Tab System */}
          <div className="mb-4 sm:mb-6">
            <div className="view-mode-slider text-sm sm:text-base">
              <div className="slider-track">
                <div className={`slider-thumb ${
                  activeTab === 'best' ? 'slider-thumb-right' : 
                  activeTab === 'stats' ? 'slider-thumb-right' : ''
                }`} style={{
                  left: activeTab === 'recent' ? '4px' : 
                        activeTab === 'best' ? '33.33%' :
                        '66.66%',
                  right: activeTab === 'recent' ? '66.66%' : 
                         activeTab === 'best' ? '33.33%' :
                         '4px'
                }} />
                <button
                  onClick={() => handleTabChange('recent')}
                  className={`slider-option ${activeTab === 'recent' ? 'slider-option-active' : ''}`}
                >
                  <span className="hidden sm:inline">Recent Scores</span>
                  <span className="sm:hidden">Recent</span>
                </button>
                <button
                  onClick={() => handleTabChange('best')}
                  className={`slider-option ${activeTab === 'best' ? 'slider-option-active' : ''}`}
                >
                  <span className="hidden sm:inline">Best Performances</span>
                  <span className="sm:hidden">Best</span>
                </button>
                <button
                  onClick={() => handleTabChange('stats')}
                  className={`slider-option ${activeTab === 'stats' ? 'slider-option-active' : ''}`}
                >
                  Statistics
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content - Mobile Optimized */}
          {tabLoading ? (
            <div className="glass-1 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-white/70 mx-auto mb-3 sm:mb-4 icon-shadow-adaptive" />
              <p className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">Loading...</p>
            </div>
          ) : (
            <>
              {/* Recent/Best Scores Tabs - Mobile Optimized */}
              {(activeTab === 'recent' || activeTab === 'best') && (
                <div>
                  {scores.length === 0 ? (
                    <div className="glass-1 rounded-2xl sm:rounded-3xl p-8 sm:p-16 text-center shadow-lg">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 glass-3">
                        <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-purple-200 icon-shadow-adaptive" />
                      </div>
                      <h3 className="text-lg sm:text-2xl font-bold text-white/90 mb-3 sm:mb-4 text-shadow-adaptive">
                        {activeTab === 'recent' ? 'No Scores Yet' : 'No Top Performances Yet'}
                      </h3>
                      <p className="text-sm sm:text-base text-white/70 mb-6 sm:mb-8 max-w-sm sm:max-w-md mx-auto text-shadow-adaptive-sm">
                        {activeTab === 'recent' 
                          ? (isOwnProfile 
                              ? "Start participating in challenges to build your profile!" 
                              : `${profileUser.username} hasn't participated in any challenges yet.`)
                          : "Keep playing to earn your spot in the top rankings!"
                        }
                      </p>
                      {isOwnProfile && activeTab === 'recent' && (
                        <Link 
                          href="/"
                          className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all text-sm sm:text-base"
                        >
                          Browse Challenges
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {scores.map((score) => (
                        <div 
                          key={score.id}
                          className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all group hover:glass-2"
                        >
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3 sm:gap-4">
                                {/* Mobile-Optimized Rank Badge */}
                                <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-2xl bg-gradient-to-br ${getRankGradient(score.calculated_rank || 0)} flex items-center justify-center shadow-lg transition-transform`}>
                                  <span className="text-white font-black text-sm sm:text-xl text-shadow-adaptive">
                                    #{score.calculated_rank || '?'}
                                  </span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm sm:text-lg font-bold text-white mb-1 group-hover:text-purple-300 transition-colors text-shadow-adaptive truncate">
                                    {score.playlists?.beatmap_title || 'Unknown Beatmap'}
                                  </h4>
                                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/80 mb-2 sm:mb-3 text-shadow-adaptive-sm">
                                    <span className="flex items-center gap-1 truncate">
                                      <Music className="w-3 h-3 sm:w-4 sm:h-4 icon-shadow-adaptive-sm flex-shrink-0" />
                                      <span className="truncate">{score.playlists?.challenges?.name || 'Unknown Challenge'}</span>
                                    </span>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="text-xs sm:text-sm whitespace-nowrap">
                                      {new Date(score.submitted_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                  
                                  {/* Mobile-First Score Details */}
                                  <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <span className="text-xs sm:text-sm text-white/80 text-shadow-adaptive-sm">Score:</span>
                                      <span className="font-mono font-bold text-white text-shadow-adaptive text-sm sm:text-base">
                                        {formatNumber(score.score)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <span className="text-xs sm:text-sm text-white/80 text-shadow-adaptive-sm">Acc:</span>
                                      <div className={`px-2 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r ${getAccuracyGradient(score.accuracy)} ${getAccuracyBorder(score.accuracy)} text-white rounded-full font-bold text-xs sm:text-sm shadow-md`}>
                                        {score.accuracy.toFixed(1)}%
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <span className="text-xs sm:text-sm text-white/80 text-shadow-adaptive-sm">Combo:</span>
                                      <span className="font-bold text-white text-shadow-adaptive text-sm sm:text-base">{score.max_combo}x</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Mobile-Optimized View Button */}
                            {score.playlists?.challenges?.room_id && (
                              <Link 
                                href={`/challenges/${score.playlists.challenges.room_id}`}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 glass-3 hover:performance-card-purple text-white font-medium rounded-full transition-all flex items-center gap-1.5 sm:gap-2 group-hover:shadow-md text-shadow-adaptive-sm text-xs sm:text-sm whitespace-nowrap"
                              >
                                View
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 icon-shadow-adaptive-sm" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Statistics Tab - Mobile Optimized */}
              {activeTab === 'stats' && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg">
                    <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-shadow-adaptive">
                      <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 icon-shadow-adaptive" />
                      <span>Statistics</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                      {/* Performance Overview - Mobile First */}
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-shadow-adaptive-sm">Performance Overview</h4>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center justify-between p-3 sm:p-4 glass-2 rounded-lg sm:rounded-xl performance-card-purple">
                            <span className="font-medium text-white/90 text-shadow-adaptive-sm text-sm sm:text-base">Total Maps Played</span>
                            <span className="text-lg sm:text-xl font-bold text-purple-200 text-glow-purple">{stats?.totalScores || 0}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 sm:p-4 glass-2 rounded-lg sm:rounded-xl performance-card-blue">
                            <span className="font-medium text-white/90 text-shadow-adaptive-sm text-sm sm:text-base">Average Score</span>
                            <span className="text-lg sm:text-xl font-bold text-blue-200 text-glow-blue">
                              {stats?.avgScore ? formatNumber(stats.avgScore) : '0'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 sm:p-4 glass-2 rounded-lg sm:rounded-xl performance-card-green">
                            <span className="font-medium text-white/90 text-shadow-adaptive-sm text-sm sm:text-base">Perfect Scores (100%)</span>
                            <span className="text-lg sm:text-xl font-bold text-green-200 text-glow-green">
                              {stats?.perfectScoreCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Rank Distribution - Mobile First */}
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-shadow-adaptive-sm">Rank Distribution</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">2-3</span>
                            </div>
                            <div className="flex-1 glass-2 rounded-full h-6 sm:h-8 relative overflow-hidden">
                              <div 
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-end pr-2 sm:pr-3"
                                style={{ width: `${Math.min((stats?.rankDistribution?.topThree || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                              >
                                <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">
                                  {stats?.rankDistribution?.topThree || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">4-10</span>
                            </div>
                            <div className="flex-1 glass-2 rounded-full h-6 sm:h-8 relative overflow-hidden">
                              <div 
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-end pr-2 sm:pr-3"
                                style={{ width: `${Math.min((stats?.rankDistribution?.topTen || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                              >
                                <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">
                                  {stats?.rankDistribution?.topTen || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">11+</span>
                            </div>
                            <div className="flex-1 glass-2 rounded-full h-6 sm:h-8 relative overflow-hidden">
                              <div 
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-end pr-2 sm:pr-3"
                                style={{ width: `${Math.min((stats?.rankDistribution?.other || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                              >
                                <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">
                                  {stats?.rankDistribution?.other || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Monthly Activity - Mobile First */}
                    <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/20">
                      <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-shadow-adaptive-sm">Monthly Activity</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {stats?.monthlyActivity && Object.entries(stats.monthlyActivity).slice(-4).map(([month, count]) => (
                          <div key={month} className="text-center p-3 sm:p-4 glass-2 rounded-lg sm:rounded-xl performance-card-blue">
                            <p className="text-xs sm:text-sm text-white/80 mb-1 text-shadow-adaptive-sm">{month}</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-200 text-glow-blue">{count}</p>
                            <p className="text-xs text-white/70 mt-1 text-shadow-adaptive-sm">plays</p>
                          </div>
                        ))}
                        {(!stats?.monthlyActivity || Object.keys(stats.monthlyActivity).length === 0) && (
                          <div className="col-span-full text-center py-6 sm:py-8 text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">
                            No activity data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Mobile-First Achievement Showcase */}
          {stats?.firstPlaceCount > 0 && (
            <div className="mt-6 sm:mt-8 relative overflow-hidden glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg">
              {/* Trophy cabinet gradient overlay */}
              <div 
                className="absolute inset-0 opacity-30 rounded-2xl sm:rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.4) 50%, rgba(217, 119, 6, 0.4) 100%)'
                }}
              />
              <div className="relative z-10">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-shadow-adaptive">
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 icon-shadow-adaptive" />
                  Trophy Cabinet
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="glass-2 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center performance-card-orange">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg">
                      <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-yellow-400 mb-1 text-glow-orange">
                      {stats?.firstPlaceCount || 0}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">First Places</p>
                  </div>
                  
                  <div className="glass-2 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center performance-card-purple">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg">
                      <Award className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-gray-400 mb-1">
                      {stats?.podiumCount || 0}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">Podium Finishes</p>
                  </div>
                  
                  <div className="glass-2 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center performance-card-blue">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg">
                      <Star className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-blue-200 mb-1 text-glow-blue">
                      {stats?.top10Count || 0}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">Top 10 Finishes</p>
                  </div>
                  
                  <div className="glass-2 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center performance-card-green">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg">
                      <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-green-200 mb-1 text-glow-green">
                      {stats?.highAccuracyCount || 0}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">98%+ Accuracy</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile-First Progress & Milestones Section */}
          {allScores.length > 0 && (
            <div className="mt-6 sm:mt-8 relative overflow-hidden glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg">
              {/* Progress gradient overlay */}
              <div 
                className="absolute inset-0 opacity-25 rounded-2xl sm:rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)'
                }}
              />
              <div className="relative z-10">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-shadow-adaptive">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 icon-shadow-adaptive" />
                  Progress & Insights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="glass-2 rounded-lg sm:rounded-xl p-4 sm:p-6 performance-card-purple">
                    <p className="text-xs sm:text-sm font-medium text-white/80 mb-2 text-shadow-adaptive-sm">Most Active Month</p>
                    <p className="text-base sm:text-lg font-bold text-purple-200 text-glow-purple">
                      {stats?.monthlyActivity && Object.keys(stats.monthlyActivity).length > 0 
                        ? Object.entries(stats.monthlyActivity).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                        : 'N/A'
                      }
                    </p>
                    <p className="text-xs sm:text-sm text-white/70 mt-1 text-shadow-adaptive-sm">
                      {stats?.monthlyActivity && Object.keys(stats.monthlyActivity).length > 0
                        ? `${Object.entries(stats.monthlyActivity).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} plays`
                        : '0 plays'
                      }
                    </p>
                  </div>
                  <div className="glass-2 rounded-lg sm:rounded-xl p-4 sm:p-6 performance-card-blue">
                    <p className="text-xs sm:text-sm font-medium text-white/80 mb-2 text-shadow-adaptive-sm">Total Score Points</p>
                    <p className="text-base sm:text-lg font-bold text-blue-200 text-glow-blue">
                      {formatNumber(stats?.totalScorePoints || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-white/70 mt-1 text-shadow-adaptive-sm">Lifetime total</p>
                  </div>
                  <div className="glass-2 rounded-lg sm:rounded-xl p-4 sm:p-6 performance-card-green">
                    <p className="text-xs sm:text-sm font-medium text-white/80 mb-2 text-shadow-adaptive-sm">Next Milestone</p>
                    <p className="text-base sm:text-lg font-bold text-green-200 text-glow-green">
                      {milestone.title}
                    </p>
                    <p className="text-xs sm:text-sm text-white/70 mt-1 text-shadow-adaptive-sm">
                      {milestone.isLegend ? 'Achieved!' : `${milestone.remaining} to go`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile-First Footer */}
          <div className="mt-12 sm:mt-16 text-center pb-6 sm:pb-8">
            <div className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 glass-1 rounded-full shadow-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">
                Profile syncs with osu! automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}