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

  // Load data only when userId changes, not when tab changes
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

  // Tab change with loading state
  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    setTabLoading(true);
    setActiveTab(newTab);
    // Simulate processing time for tab switch
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

  // Get filtered data based on active tab
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
        <div className="min-h-screen py-8">
          <div className="max-w-7xl mx-auto px-4">
            {/* Loading Skeleton */}
            <div className="space-y-6">
              {/* Header Skeleton */}
              <div className="glass-1 rounded-3xl p-8 animate-pulse">
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 bg-white/20 rounded-2xl"></div>
                  <div className="flex-1 space-y-4">
                    <div className="h-8 bg-white/20 rounded w-1/3"></div>
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                    <div className="flex gap-3">
                      <div className="h-6 bg-white/20 rounded w-20"></div>
                      <div className="h-6 bg-white/20 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stats Skeleton */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-1 rounded-2xl p-6 animate-pulse">
                    <div className="h-8 bg-white/20 rounded mb-3"></div>
                    <div className="h-6 bg-white/20 rounded w-2/3"></div>
                  </div>
                ))}
              </div>

              {/* Content Skeleton */}
              <div className="glass-1 rounded-2xl p-8 animate-pulse">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-white/20 rounded-xl"></div>
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
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-32 h-32 bg-gradient-to-br from-gray-200/60 to-gray-300/60 rounded-full flex items-center justify-center mx-auto mb-8 glass-2">
              <User className="w-16 h-16 text-white/70 icon-shadow-adaptive" />
            </div>
            <h2 className="text-3xl font-bold text-white/90 mb-4 text-shadow-adaptive">
              {error || 'User Not Found'}
            </h2>
            <p className="text-white/70 mb-8 text-shadow-adaptive-sm">
              The user profile you're looking for doesn't exist or has been removed.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 glass-2 hover:glass-3 text-white font-semibold rounded-full transition-all flex items-center gap-2 text-shadow-adaptive-sm"
              >
                <ArrowLeft className="w-4 h-4 icon-shadow-adaptive-sm" />
                Go Back
              </button>
              <Link 
                href="/"
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Browse Challenges
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Get current tab data
  const scores = getScoresForTab();
  const milestone = getNextMilestone(stats?.totalScores || 0);

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Compact Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-2 text-white/70 hover:text-white/90 font-medium text-shadow-adaptive-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform icon-shadow-adaptive-sm" />
              Back
            </button>
          </div>

          {/* Profile Hero Section - Redesigned */}
          <div className="relative overflow-hidden glass-1 rounded-3xl mb-8 shadow-2xl">
            {/* Enhanced gradient overlay */}
            <div 
              className="absolute inset-0 opacity-70"
              style={{
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9) 0%, rgba(236, 72, 153, 0.9) 50%, rgba(239, 68, 68, 0.9) 100%)'
              }}
            />
            
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-8 -right-8 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse-soft"></div>
              <div className="absolute -bottom-8 -left-8 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
            </div>
            
            <div className="relative z-10 p-8 text-white">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                {/* Avatar and Basic Info */}
                <div className="flex items-center gap-6 flex-1">
                  <div className="relative group">
                    {profileUser.avatar_url ? (
                      <img 
                        src={profileUser.avatar_url} 
                        alt={profileUser.username}
                        className="w-32 h-32 rounded-3xl border-4 border-white/30 shadow-2xl group-hover:scale-105 transition-transform avatar-border"
                      />
                    ) : (
                      <div className="w-32 h-32 glass-3 rounded-3xl flex items-center justify-center border-4 border-white/30 shadow-2xl">
                        <span className="text-5xl font-bold text-white text-shadow-adaptive">{profileUser.username[0]}</span>
                      </div>
                    )}
                    {/* Enhanced status indicator */}
                    <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-green-400 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                      <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-4">
                      <h1 className="text-4xl lg:text-5xl font-black text-white text-shadow-adaptive">
                        {profileUser.osu_id ? (
                          <a
                            href={`https://osu.ppy.sh/users/${profileUser.osu_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white/80 transition-colors flex items-center gap-3 group"
                          >
                            {profileUser.username}
                            <ExternalLink className="w-7 h-7 opacity-60 group-hover:opacity-100 transition-opacity icon-shadow-adaptive" />
                          </a>
                        ) : (
                          profileUser.username
                        )}
                      </h1>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {profileUser.country && (
                        <div className="flex items-center gap-2 px-4 py-2 glass-3 rounded-full">
                          {getCountryFlagUrl(profileUser.country) && (
                            <img 
                              src={getCountryFlagUrl(profileUser.country)} 
                              alt={`${profileUser.country} flag`}
                              className="w-6 h-4 object-cover rounded shadow-sm"
                            />
                          )}
                          <span className="font-medium text-white text-shadow-adaptive-sm">{profileUser.country.toUpperCase()}</span>
                        </div>
                      )}
                      
                      <div className="px-4 py-2 glass-3 rounded-full flex items-center gap-2">
                        <Calendar className="w-4 h-4 icon-shadow-adaptive-sm" />
                        <span className="font-medium text-white text-shadow-adaptive-sm">
                          Joined {new Date(profileUser.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Additional osu! stats */}
                      {profileUser.global_rank && (
                        <div className="px-4 py-2 glass-3 rounded-full flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-400 icon-shadow-adaptive-sm" />
                          <span className="font-medium text-white text-shadow-adaptive-sm">
                            #{formatNumber(profileUser.global_rank)} Global
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Streak Display */}
                {streaks && (
                  <div className="flex gap-4">
                    <div className="glass-3 rounded-2xl p-6 min-w-[180px] performance-card-orange">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-5 h-5 text-orange-400 icon-shadow-adaptive-sm" />
                        <span className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Current Streak</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white text-glow-orange">{streaks.currentStreak}</span>
                        <span className="text-2xl">{getStreakEmoji(streaks.currentStreak)}</span>
                      </div>
                    </div>
                    
                    <div className="glass-3 rounded-2xl p-6 min-w-[180px] performance-card-purple">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-5 h-5 text-purple-200 icon-shadow-adaptive-sm" />
                        <span className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Best Streak</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white text-glow-purple">{streaks.longestStreak}</span>
                        <Sparkles className="w-6 h-6 text-yellow-300 icon-shadow-adaptive" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass-1 rounded-2xl p-6 hover:shadow-xl transition-all group performance-card-purple">
              <div className="flex items-center justify-between mb-3">
                <Target className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform icon-shadow-adaptive" />
                <span className={`text-3xl font-black ${getAccuracyColor(parseFloat(stats?.avgAccuracy || 0))} text-glow-purple`}>
                  {stats?.avgAccuracy ? `${stats.avgAccuracy}%` : '--.--%'}
                </span>
              </div>
              <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Average Accuracy</p>
            </div>
            
            <div className="glass-1 rounded-2xl p-6 hover:shadow-xl transition-all group performance-card-green">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform icon-shadow-adaptive" />
                <span className="text-3xl font-black text-white text-glow-green">
                  #{stats?.avgRank || '--'}
                </span>
              </div>
              <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Average Rank</p>
            </div>
            
            <div className="glass-1 rounded-2xl p-6 hover:shadow-xl transition-all group performance-card-blue">
              <div className="flex items-center justify-between mb-3">
                <BarChart3 className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform icon-shadow-adaptive" />
                <span className="text-3xl font-black text-white text-glow-blue">
                  {stats?.totalScores || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Total Plays</p>
            </div>
            
            <div className="glass-1 rounded-2xl p-6 hover:shadow-xl transition-all group performance-card-orange">
              <div className="flex items-center justify-between mb-3">
                <Trophy className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform icon-shadow-adaptive" />
                <span className="text-3xl font-black text-white text-glow-orange">
                  {stats?.firstPlaceCount || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">First Places</p>
            </div>
          </div>

          {/* Enhanced Tab System with View Mode Slider */}
          <div className="mb-6">
            <div className="view-mode-slider">
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
                  Recent Scores
                </button>
                <button
                  onClick={() => handleTabChange('best')}
                  className={`slider-option ${activeTab === 'best' ? 'slider-option-active' : ''}`}
                >
                  Best Performances
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

          {/* Tab Content with Loading States */}
          {tabLoading ? (
            <div className="glass-1 rounded-3xl p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-white/70 mx-auto mb-4 icon-shadow-adaptive" />
              <p className="text-white/70 text-shadow-adaptive-sm">Loading...</p>
            </div>
          ) : (
            <>
              {/* Recent Scores Tab */}
              {activeTab === 'recent' && (
                <div>
                  {scores.length === 0 ? (
                    <div className="glass-1 rounded-3xl p-16 text-center shadow-lg">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center mx-auto mb-6 glass-3">
                        <Trophy className="w-12 h-12 text-purple-200 icon-shadow-adaptive" />
                      </div>
                      <h3 className="text-2xl font-bold text-white/90 mb-4 text-shadow-adaptive">
                        No Scores Yet
                      </h3>
                      <p className="text-white/70 mb-8 max-w-md mx-auto text-shadow-adaptive-sm">
                        {isOwnProfile 
                          ? "Start participating in challenges to build your profile!" 
                          : `${profileUser.username} hasn't participated in any challenges yet.`}
                      </p>
                      {isOwnProfile && (
                        <Link 
                          href="/"
                          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:shadow-lg transform hover:scale-105 transition-all"
                        >
                          Browse Challenges
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scores.map((score) => (
                        <div 
                          key={score.id}
                          className="glass-1 rounded-2xl p-6 transition-all group hover:glass-2"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-4">
                                {/* Enhanced Rank Badge */}
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getRankGradient(score.calculated_rank || 0)} flex items-center justify-center shadow-lg transition-transform`}>
                                  <span className="text-white font-black text-xl text-shadow-adaptive">
                                    #{score.calculated_rank || '?'}
                                  </span>
                                </div>
                                
                                <div className="flex-1">
                                  <h4 className="text-lg font-bold text-white mb-1 group-hover:text-purple-300 transition-colors text-shadow-adaptive">
                                    {score.playlists?.beatmap_title || 'Unknown Beatmap'}
                                  </h4>
                                  <div className="flex items-center gap-3 text-sm text-white/80 mb-3 text-shadow-adaptive-sm">
                                    <span className="flex items-center gap-1">
                                      <Music className="w-4 h-4 icon-shadow-adaptive-sm" />
                                      {score.playlists?.challenges?.name || 'Unknown Challenge'}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {new Date(score.submitted_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  
                                  {/* Enhanced Score Details */}
                                  <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-white/80 text-shadow-adaptive-sm">Score:</span>
                                      <span className="font-mono font-bold text-white text-shadow-adaptive">
                                        {formatNumber(score.score)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-white/80 text-shadow-adaptive-sm">Accuracy:</span>
                                      <div className={`px-3 py-1 bg-gradient-to-r ${getAccuracyGradient(score.accuracy)} ${getAccuracyBorder(score.accuracy)} text-white rounded-full font-bold text-sm shadow-md`}>
                                        {score.accuracy.toFixed(2)}%
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-white/80 text-shadow-adaptive-sm">Combo:</span>
                                      <span className="font-bold text-white text-shadow-adaptive">{score.max_combo}x</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {score.playlists?.challenges?.room_id && (
                              <Link 
                                href={`/challenges/${score.playlists.challenges.room_id}`}
                                className="px-4 py-2 glass-3 hover:performance-card-purple text-white font-medium rounded-full transition-all flex items-center gap-2 group-hover:shadow-md text-shadow-adaptive-sm"
                              >
                                View
                                <ChevronRight className="w-4 h-4 icon-shadow-adaptive-sm" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Best Performances Tab */}
              {activeTab === 'best' && (
                <div className="space-y-4">
                  {scores.length === 0 ? (
                    <div className="glass-1 rounded-3xl p-16 text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-6 glass-3">
                        <Star className="w-12 h-12 text-yellow-400 icon-shadow-adaptive" />
                      </div>
                      <h3 className="text-xl font-bold text-white/90 mb-2 text-shadow-adaptive">
                        No Top Performances Yet
                      </h3>
                      <p className="text-white/70 text-shadow-adaptive-sm">Keep playing to earn your spot in the top rankings!</p>
                    </div>
                  ) : (
                    <>

{scores.slice(0, 5).map((score, index) => (
  <div 
    key={score.id}
    className="glass-1 rounded-2xl p-6 transition-all group hover:glass-2"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-start gap-4">          
          {/* Main content section - now matches Recent Scores */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className={`text-2xl font-black ${
                (score.calculated_rank) === 1 ? 'text-yellow-400 text-glow-orange' :
                (score.calculated_rank) === 2 ? 'text-gray-400' :
                (score.calculated_rank) === 3 ? 'text-orange-400 text-glow-orange' :
                'text-purple-200 text-glow-purple'
              } text-shadow-adaptive`}>
                #{score.calculated_rank}
              </span>
              <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors text-shadow-adaptive">
                {score.playlists?.beatmap_title || 'Unknown Beatmap'}
              </h4>
            </div>
            
            {/* Challenge name and date - NOW INCLUDED */}
            <div className="flex items-center gap-3 text-sm text-white/80 mb-3 text-shadow-adaptive-sm">
              <span className="flex items-center gap-1">
                <Music className="w-4 h-4 icon-shadow-adaptive-sm" />
                {score.playlists?.challenges?.name || 'Unknown Challenge'}
              </span>
              <span>•</span>
              <span>
                {new Date(score.submitted_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>
            
            {/* Score details - Enhanced to match Recent Scores */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80 text-shadow-adaptive-sm">Score:</span>
                <span className="font-mono font-bold text-white text-shadow-adaptive">
                  {formatNumber(score.score)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80 text-shadow-adaptive-sm">Accuracy:</span>
                <div className={`px-3 py-1 bg-gradient-to-r ${getAccuracyGradient(score.accuracy)} ${getAccuracyBorder(score.accuracy)} text-white rounded-full font-bold text-sm shadow-md`}>
                  {score.accuracy.toFixed(2)}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80 text-shadow-adaptive-sm">Combo:</span>
                <span className="font-bold text-white text-shadow-adaptive">{score.max_combo}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* View button - NOW INCLUDED */}
      {score.playlists?.challenges?.room_id && (
        <Link 
          href={`/challenges/${score.playlists.challenges.room_id}`}
          className="px-4 py-2 glass-2 hover:performance-card-purple text-white font-medium rounded-full transition-all flex items-center gap-2 group-hover:shadow-md text-shadow-adaptive-sm"
        >
          View
          <ChevronRight className="w-4 h-4 icon-shadow-adaptive-sm" />
        </Link>
      )}
    </div>
  </div>
))}
                    </>
                  )}
                </div>
              )}

              {/* Statistics Tab */}
              {activeTab === 'stats' && (
                <div className="space-y-8">
                  <div className="glass-1 rounded-3xl p-8 shadow-lg">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 text-shadow-adaptive">
                      <BarChart3 className="w-8 h-8 text-purple-500 icon-shadow-adaptive" />
                      Detailed Statistics
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Performance Distribution */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4 text-shadow-adaptive-sm">Performance Overview</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 glass-2 rounded-xl performance-card-purple">
                            <span className="font-medium text-white/90 text-shadow-adaptive-sm">Total Maps Played</span>
                            <span className="text-xl font-bold text-purple-200 text-glow-purple">{stats?.totalScores || 0}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 glass-2 rounded-xl performance-card-blue">
                            <span className="font-medium text-white/90 text-shadow-adaptive-sm">Average Score</span>
                            <span className="text-xl font-bold text-blue-200 text-glow-blue">
                              {stats?.avgScore ? formatNumber(stats.avgScore) : '0'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4 glass-2 rounded-xl performance-card-green">
                            <span className="font-medium text-white/90 text-shadow-adaptive-sm">Perfect Scores (100%)</span>
                            <span className="text-xl font-bold text-green-200 text-glow-green">
                              {stats?.perfectScoreCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Rank Distribution */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4 text-shadow-adaptive-sm">Rank Distribution</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-sm text-shadow-adaptive-sm">2-3</span>
                            </div>
                            <div className="flex-1 glass-2 rounded-full h-8 relative overflow-hidden">
                              <div 
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-end pr-3"
                                style={{ width: `${Math.min((stats?.rankDistribution?.topThree || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                              >
                                <span className="text-white font-bold text-sm text-shadow-adaptive-sm">
                                  {stats?.rankDistribution?.topThree || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-sm text-shadow-adaptive-sm">4-10</span>
                            </div>
                            <div className="flex-1 glass-2 rounded-full h-8 relative overflow-hidden">
                              <div 
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-end pr-3"
                                style={{ width: `${Math.min((stats?.rankDistribution?.topTen || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                              >
                                <span className="text-white font-bold text-sm text-shadow-adaptive-sm">
                                  {stats?.rankDistribution?.topTen || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-sm text-shadow-adaptive-sm">11+</span>
                            </div>
                            <div className="flex-1 glass-2 rounded-full h-8 relative overflow-hidden">
                              <div 
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-end pr-3"
                                style={{ width: `${Math.min((stats?.rankDistribution?.other || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                              >
                                <span className="text-white font-bold text-sm text-shadow-adaptive-sm">
                                  {stats?.rankDistribution?.other || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Monthly Activity */}
                    <div className="mt-8 pt-8 border-t border-white/20">
                      <h4 className="text-lg font-semibold text-white mb-4 text-shadow-adaptive-sm">Monthly Activity</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats?.monthlyActivity && Object.entries(stats.monthlyActivity).slice(-4).map(([month, count]) => (
                          <div key={month} className="text-center p-4 glass-2 rounded-xl performance-card-blue">
                            <p className="text-sm text-white/80 mb-1 text-shadow-adaptive-sm">{month}</p>
                            <p className="text-2xl font-bold text-blue-200 text-glow-blue">{count}</p>
                            <p className="text-xs text-white/70 mt-1 text-shadow-adaptive-sm">plays</p>
                          </div>
                        ))}
                        {(!stats?.monthlyActivity || Object.keys(stats.monthlyActivity).length === 0) && (
                          <div className="col-span-full text-center py-8 text-white/70 text-shadow-adaptive-sm">
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

          {/* Enhanced Achievement Showcase */}
          {stats?.firstPlaceCount > 0 && (
            <div className="mt-8 relative overflow-hidden glass-1 rounded-3xl p-8 shadow-lg">
              {/* Trophy cabinet gradient overlay */}
              <div 
                className="absolute inset-0 opacity-30 rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.4) 50%, rgba(217, 119, 6, 0.4) 100%)'
                }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 text-shadow-adaptive">
                  <Trophy className="w-8 h-8 text-yellow-500 icon-shadow-adaptive" />
                  Trophy Cabinet
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-2 rounded-xl p-6 text-center performance-card-orange">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Trophy className="w-8 h-8 text-white icon-shadow-adaptive" />
                    </div>
                    <p className="text-3xl font-black text-yellow-400 mb-1 text-glow-orange">
                      {stats?.firstPlaceCount || 0}
                    </p>
                    <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">First Places</p>
                  </div>
                  
                  <div className="glass-2 rounded-xl p-6 text-center performance-card-purple">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Award className="w-8 h-8 text-white icon-shadow-adaptive" />
                    </div>
                    <p className="text-3xl font-black text-gray-400 mb-1">
                      {stats?.podiumCount || 0}
                    </p>
                    <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Podium Finishes</p>
                  </div>
                  
                  <div className="glass-2 rounded-xl p-6 text-center performance-card-blue">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Star className="w-8 h-8 text-white icon-shadow-adaptive" />
                    </div>
                    <p className="text-3xl font-black text-blue-200 mb-1 text-glow-blue">
                      {stats?.top10Count || 0}
                    </p>
                    <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Top 10 Finishes</p>
                  </div>
                  
                  <div className="glass-2 rounded-xl p-6 text-center performance-card-green">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Zap className="w-8 h-8 text-white icon-shadow-adaptive" />
                    </div>
                    <p className="text-3xl font-black text-green-200 mb-1 text-glow-green">
                      {stats?.highAccuracyCount || 0}
                    </p>
                    <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">98%+ Accuracy</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Progress & Milestones Section */}
          {allScores.length > 0 && (
            <div className="mt-8 relative overflow-hidden glass-1 rounded-3xl p-8 shadow-lg">
              {/* Progress gradient overlay */}
              <div 
                className="absolute inset-0 opacity-25 rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)'
                }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 text-shadow-adaptive">
                  <TrendingUp className="w-8 h-8 text-purple-500 icon-shadow-adaptive" />
                  Progress & Insights
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="glass-2 rounded-xl p-6 performance-card-purple">
                    <p className="text-sm font-medium text-white/80 mb-2 text-shadow-adaptive-sm">Most Active Month</p>
                    <p className="text-lg font-bold text-purple-200 text-glow-purple">
                      {stats?.monthlyActivity && Object.keys(stats.monthlyActivity).length > 0 
                        ? Object.entries(stats.monthlyActivity).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                        : 'N/A'
                      }
                    </p>
                    <p className="text-sm text-white/70 mt-1 text-shadow-adaptive-sm">
                      {stats?.monthlyActivity && Object.keys(stats.monthlyActivity).length > 0
                        ? `${Object.entries(stats.monthlyActivity).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} plays`
                        : '0 plays'
                      }
                    </p>
                  </div>
                  <div className="glass-2 rounded-xl p-6 performance-card-blue">
                    <p className="text-sm font-medium text-white/80 mb-2 text-shadow-adaptive-sm">Total Score Points</p>
                    <p className="text-lg font-bold text-blue-200 text-glow-blue">
                      {formatNumber(stats?.totalScorePoints || 0)}
                    </p>
                    <p className="text-sm text-white/70 mt-1 text-shadow-adaptive-sm">Lifetime total</p>
                  </div>
                  <div className="glass-2 rounded-xl p-6 performance-card-green">
                    <p className="text-sm font-medium text-white/80 mb-2 text-shadow-adaptive-sm">Next Milestone</p>
                    <p className="text-lg font-bold text-green-200 text-glow-green">
                      {milestone.title}
                    </p>
                    <p className="text-sm text-white/70 mt-1 text-shadow-adaptive-sm">
                      {milestone.isLegend ? 'Achieved!' : `${milestone.remaining} to go`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Footer */}
          <div className="mt-16 text-center pb-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 glass-1 rounded-full shadow-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">
                Profile syncs with osu! automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}