import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading'; 
import { useAuth } from '../../lib/AuthContext';
import MedalsDisplay from '../../components/MedalsDisplay';
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

  const STAFF_MEMBERS = {
  35: { type: 'designer', label: 'o!C Staff - Graphic Designer' },
  268: { type: 'developer', label: 'o!C Staff - Developer' },
  671: { type: 'lead', label: 'o!C Staff - Project Lead' },
};

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

      // Handle both old and new API formats
      const responseData = profileData.data || profileData;
      setProfileUser(responseData.user);
      setAllScores(responseData.scores || []);
      setAllBestPerformances(responseData.bestPerformances || []);
      setStats(responseData.stats || null);
      setStreaks(responseData.streaks || null);

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

  const StaffBadge = ({ user }) => {
    // Check if user is staff by user id
    const staffRole = STAFF_MEMBERS[user.id];
    
    if (!staffRole) return null;
    
    return (
      <div className={`staff-badge staff-badge-${staffRole.type}`}>
        {staffRole.label}
      </div>
    );
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

         {/* Profile Hero Section */}
          <div className="relative overflow-hidden glass-2 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 shadow-2xl">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-4 -right-4 sm:-top-8 sm:-right-8 w-48 h-48 sm:w-96 sm:h-96 bg-white rounded-full blur-3xl animate-pulse-soft"></div>
              <div className="absolute -bottom-4 -left-4 sm:-bottom-8 sm:-left-8 w-40 h-40 sm:w-80 sm:h-80 bg-white rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 p-4 sm:p-8 text-white">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-8">
                {/* Avatar and Basic Info */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 flex-1 w-full">
                  <div className="relative group">
                    {profileUser.avatar_url ? (
                      <img 
                        src={profileUser.avatar_url} 
                        alt={profileUser.username}
                        className="profile-picture w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-white/30 shadow-2xl group-hover:scale-105 transition-transform avatar-border"
                      />
                    ) : (
                      <div className="profile-picture w-20 h-20 sm:w-32 sm:h-32 glass-3 rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 sm:border-4 border-white/30 shadow-2xl">
                        <span className="text-2xl sm:text-5xl font-bold text-white text-shadow-adaptive">{profileUser.username[0]}</span>
                      </div>
                    )}
                    {/* Status indicator */}
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
                        <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-4 sm:py-2 glass-1 rounded-full">
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
                      
                      <div className="px-2 py-1 sm:px-4 sm:py-2 glass-1 rounded-full flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 icon-shadow-adaptive-sm" />
                        <span className="font-medium text-white text-shadow-adaptive-sm text-xs sm:text-sm">
                          Joined {new Date(profileUser.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <StaffBadge user={profileUser} />
                      
                    </div>
                  </div>
                </div>

                {/* Streak Display */}
                {streaks && (
                  <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="streak-card-current rounded-xl sm:rounded-2xl p-3 sm:p-6 min-w-0 flex-1 sm:min-w-[180px]">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                        <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 icon-shadow-adaptive-sm" />
                        <span className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">Current</span>
                      </div>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white/70 text-shadow-adaptive">{streaks.currentStreak}</span>
                      </div>
                    </div>
                    
                    <div className="streak-card-best rounded-xl sm:rounded-2xl p-3 sm:p-6 min-w-0 flex-1 sm:min-w-[180px]">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                        <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 icon-shadow-adaptive-sm" />
                        <span className="text-xs sm:text-sm font-medium text-white/90 text-shadow-adaptive-sm">Best</span>
                      </div>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white/70 text-shadow-adaptive">{streaks.longestStreak}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl transition-all group">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <div className="p-1.5 sm:p-3 icon-gradient-purple rounded-md sm:rounded-xl icon-container-purple">
                  <Target className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-lg sm:text-3xl font-black text-white/80">
                  {stats?.avgAccuracy ? `${stats.avgAccuracy}%` : '--%'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white text-shadow-adaptive-sm text-center sm:text-left">Avg Accuracy</p>
            </div>
            
            <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl transition-all group">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <div className="p-1.5 sm:p-3 icon-gradient-green rounded-md sm:rounded-xl icon-container-green">
                  <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-lg sm:text-3xl font-black text-white/80">
                  #{stats?.avgRank || '--'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white text-shadow-adaptive-sm text-center sm:text-left">Avg Rank</p>
            </div>
            
            <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl transition-all group">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <div className="p-1.5 sm:p-3 icon-gradient-blue rounded-md sm:rounded-xl icon-container-blue">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-lg sm:text-3xl font-black text-white/80">
                  {stats?.totalScores || 0}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white text-shadow-adaptive-sm text-center sm:text-left">Total Plays</p>
            </div>
            
            <div className="glass-1 rounded-lg sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl transition-all group">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                <div className="p-1.5 sm:p-3 icon-gradient-orange rounded-md sm:rounded-xl icon-container-orange">
                  <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-lg sm:text-3xl font-black text-white/80">
                  {stats?.firstPlaceCount || 0}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white text-shadow-adaptive-sm text-center sm:text-left">First Places</p>
            </div>
          </div>
          {/* Tab System */}
          <div className="mb-4 sm:mb-6">
            <div className="view-mode-slider text-sm sm:text-base">
              <div className="slider-track">
                <div className={`slider-thumb ${
                  activeTab === 'best' ? 'slider-thumb-second' : 
                  activeTab === 'stats' ? 'slider-thumb-third' :
                  activeTab === 'achievements' ? 'slider-thumb-fourth' : ''
                }`} />
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
                <button
                  onClick={() => handleTabChange('achievements')}
                  className={`slider-option ${activeTab === 'achievements' ? 'slider-option-active' : ''}`}
                >
                  Medals
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {tabLoading ? (
            <div className="glass-1 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-white/70 mx-auto mb-3 sm:mb-4 icon-shadow-adaptive" />
              <p className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">Loading...</p>
            </div>
          ) : (
            <>
              {/* Recent/Best Scores Tabs */}
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
                                {/* Rank Badge */}
                                <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-2xl bg-gradient-to-b ${getRankGradient(score.calculated_rank || 0)} flex items-center justify-center shadow-lg transition-transform`} style={{
                                  border: '3px solid rgba(255, 255, 255, 0.6)',
                                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)'
                                }}>
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
                                      <Music className="w-3 h-3 sm:w-4 sm:h-4 text-white/90 icon-shadow-adaptive-sm flex-shrink-0" />
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
                                  
                                  {/* Score Details */}
                                  <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <span className="text-xs sm:text-sm text-white/80 text-shadow-adaptive-sm">Score:</span>
                                      <span className="font-mono font-bold text-white text-shadow-adaptive text-sm sm:text-base">
                                        {formatNumber(score.score)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <span className="text-xs sm:text-sm text-white/80 text-shadow-adaptive-sm">Acc:</span>
                                      <span className="font-bold text-white text-shadow-adaptive text-sm sm:text-base">
                                        {score.accuracy.toFixed(1)}%
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <span className="text-xs sm:text-sm text-white/80 text-shadow-adaptive-sm">Combo:</span>
                                      <span className="font-bold text-white text-shadow-adaptive text-sm sm:text-base">{score.max_combo}x</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* View Button */}
                            {score.playlists?.challenges?.room_id && (
                              <Link 
                                href={`/challenges/${score.playlists.challenges.room_id}`}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 glass-1 hover:glass-2 text-white font-medium rounded-full transition-all flex items-center gap-1.5 sm:gap-2 group-hover:shadow-md text-shadow-adaptive-sm text-xs sm:text-sm whitespace-nowrap"
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

              {/* Statistics Tab */}
              {activeTab === 'stats' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-shadow-adaptive">
                    <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white/90 icon-shadow-adaptive" />
                    <span>Statistics</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Performance Overview */}
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-shadow-adaptive">Performance Overview</h4>
                      <div className="space-y-3 sm:space-y-4">
                        <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white text-shadow-adaptive text-sm sm:text-base">Total Maps Played</span>
                            <span className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">{stats?.totalScores || 0}</span>
                          </div>
                        </div>
                        <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white text-shadow-adaptive text-sm sm:text-base">Average Score</span>
                            <span className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">
                              {stats?.avgScore ? formatNumber(stats.avgScore) : '###.#K'}
                            </span>
                          </div>
                        </div>
                        <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white text-shadow-adaptive text-sm sm:text-base">Perfect Scores (100%)</span>
                            <span className="text-lg sm:text-xl font-bold text-white text-shadow-adaptive">
                              {stats?.perfectScoreCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Rank Distribution */}
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-shadow-adaptive">Rank Distribution</h4>
                      <div className="space-y-3">
                        {/* 2-3 ranks: Red gradient */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center" style={{
                            background: 'linear-gradient(to bottom, #d35656, #a93838)',
                            border: '3px solid #e3716b'
                          }}>
                            <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">2-3</span>
                          </div>
                          <div className="flex-1 glass-1 rounded-full h-6 sm:h-8 relative overflow-hidden" style={{ padding: '1px' }}>
                            <div 
                              className="absolute rounded-full"
                              style={{ 
                                top: '1px',
                                bottom: '1px',
                                left: '1px',
                                width: `${Math.min((stats?.rankDistribution?.topThree || 0) / (stats?.totalScores || 1) * 100, 100)}%`,
                                background: 'linear-gradient(to bottom, #d35656, #a93838)',
                                border: '3px solid #e3716b',
                                maxWidth: 'calc(100% - 2px)'
                              }}
                            >
                            </div>
                          </div>
                        </div>
                        
                        {/* 4-10 ranks: Gray gradient */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center" style={{
                            background: 'linear-gradient(to bottom, #777778, #545455)',
                            border: '3px solid #959595'
                          }}>
                            <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">4-10</span>
                          </div>
                          <div className="flex-1 glass-1 rounded-full h-6 sm:h-8 relative overflow-hidden" style={{ padding: '1px' }}>
                            <div 
                              className="absolute rounded-full"
                              style={{ 
                                top: '1px',
                                bottom: '1px',
                                left: '1px',
                                width: `${Math.min((stats?.rankDistribution?.topTen || 0) / (stats?.totalScores || 1) * 100, 100)}%`,
                                background: 'linear-gradient(to bottom, #777778, #545455)',
                                border: '3px solid #959595',
                                maxWidth: 'calc(100% - 2px)'
                              }}
                            >
                            </div>
                          </div>
                        </div>
                        
                        {/* 11+ ranks: Purple gradient */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center" style={{
                            background: 'linear-gradient(to bottom, #9f5dbf, #6d3f87)',
                            border: '3px solid #a77bc3'
                          }}>
                            <span className="text-white font-bold text-xs sm:text-sm text-shadow-adaptive-sm">11+</span>
                          </div>
                          <div className="flex-1 glass-1 rounded-full h-6 sm:h-8 relative overflow-hidden" style={{ padding: '1px' }}>
                            <div 
                              className="absolute rounded-full"
                              style={{ 
                                top: '1px',
                                bottom: '1px',
                                left: '1px',
                                width: `${Math.min((stats?.rankDistribution?.other || 0) / (stats?.totalScores || 1) * 100, 100)}%`,
                                background: 'linear-gradient(to bottom, #9f5dbf, #6d3f87)',
                                border: '3px solid #a77bc3',
                                maxWidth: 'calc(100% - 2px)'
                              }}
                            >
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full-width separator that actually goes to the edges */}
                  <div className="my-6 sm:my-8 -mx-4 sm:-mx-8">
                    <div className="w-full h-px bg-white/30"></div>
                  </div>
                  
                  {/* Monthly Activity */}
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-shadow-adaptive">Monthly Activity</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      {stats?.monthlyActivity && Object.entries(stats.monthlyActivity).slice(-4).map(([month, count]) => (
                        <div key={month} className="text-center p-3 sm:p-4 glass-1 rounded-lg sm:rounded-xl">
                          <p className="text-xs sm:text-sm text-white/80 mb-1 text-shadow-adaptive-sm">{month}</p>
                          <p className="text-xl sm:text-2xl font-bold text-white text-shadow-adaptive">{count}</p>
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
            {activeTab === 'achievements' && (
              <MedalsDisplay 
                stats={stats}
                streaks={streaks} 
                scores={allScores}
                userAchievements={[]} // This would come from existing user data if you store it
                seasonRank={null} // Can be calculated from existing season data
                seasonPercentile={null} // Can be calculated from existing season data
              />
            )}
            </>
          )}

          {/* Achievement Showcase */}
          {stats?.firstPlaceCount > 0 && (
            <div className="mt-6 sm:mt-8 relative overflow-hidden glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg">
              <div className="relative z-10">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-shadow-adaptive">
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white/90 icon-shadow-adaptive" />
                  Trophy Cabinet
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="rounded-lg sm:rounded-xl p-4 sm:p-6 text-center transform hover:scale-105 transition-all shadow-lg" style={{
                    background: 'linear-gradient(to bottom, rgba(66, 101, 196, 0.9), rgba(52, 87, 171, 0.9))',
                    border: '3px solid #5f94ec'
                  }}>
                    <Award className="w-8 h-8 sm:w-12 sm:h-12 text-white mx-auto mb-2 sm:mb-3 icon-shadow-adaptive" />
                    <p className="text-2xl sm:text-3xl font-black text-white/50 mb-1 text-shadow-adaptive">
                      {stats?.podiumCount || 0}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white/80 text-shadow-adaptive-sm">Podium Finishes</p>
                  </div>
                  
                  <div className="rounded-lg sm:rounded-xl p-4 sm:p-6 text-center transform hover:scale-105 transition-all shadow-lg" style={{
                    background: 'linear-gradient(to bottom, rgba(181, 64, 67, 0.9), rgba(163, 48, 49, 0.9))',
                    border: '3px solid #dd615e'
                  }}>
                    <Star className="w-8 h-8 sm:w-12 sm:h-12 text-white mx-auto mb-2 sm:mb-3 icon-shadow-adaptive" />
                    <p className="text-2xl sm:text-3xl font-black text-white/50 mb-1 text-shadow-adaptive">
                      {stats?.top10Count || 0}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white/80 text-shadow-adaptive-sm">Top 10 Finishes</p>
                  </div>
                  
                  <div className="rounded-lg sm:rounded-xl p-4 sm:p-6 text-center transform hover:scale-105 transition-all shadow-lg" style={{
                    background: 'linear-gradient(to bottom, rgba(94, 93, 94, 0.9), rgba(76, 75, 76, 0.9))',
                    border: '3px solid #a1a1a1'
                  }}>
                    <Zap className="w-8 h-8 sm:w-12 sm:h-12 text-white mx-auto mb-2 sm:mb-3 icon-shadow-adaptive" />
                    <p className="text-2xl sm:text-3xl font-black text-white/50 mb-1 text-shadow-adaptive">
                      {stats?.highAccuracyCount || 0}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white/80 text-shadow-adaptive-sm">98%+ Accuracy</p>
                  </div>
                  
                  <div className="rounded-lg sm:rounded-xl p-4 sm:p-6 text-center transform hover:scale-105 transition-all shadow-lg" style={{
                    background: 'linear-gradient(to bottom, rgba(60, 166, 97, 0.9), rgba(45, 141, 99, 0.9))',
                    border: '3px solid #4ed484'
                  }}>
                    <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white mx-auto mb-2 sm:mb-3 icon-shadow-adaptive" />
                    <p className="text-2xl sm:text-3xl font-black text-white/50 mb-1 text-shadow-adaptive">
                      {stats?.firstPlaceCount || 0}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white/80 text-shadow-adaptive-sm">First Places</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Progress & Milestones Section */}
          {allScores.length > 0 && (
            <div className="mt-6 sm:mt-8 relative overflow-hidden glass-1 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg">
              <div className="relative z-10">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-shadow-adaptive">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white/90 icon-shadow-adaptive" />
                  Progress & Insights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6">
                    <p className="text-xs sm:text-sm font-medium text-white/90 mb-2 text-shadow-adaptive-sm">Most Active Month</p>
                    <p className="text-base sm:text-lg font-bold text-white/90 text-shadow-adaptive">
                      {stats?.monthlyActivity && Object.keys(stats.monthlyActivity).length > 0 
                        ? Object.entries(stats.monthlyActivity).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                        : 'N/A'
                      }
                    </p>
                    <p className="text-xs sm:text-sm text-white mt-1 text-shadow-adaptive-sm">
                      {stats?.monthlyActivity && Object.keys(stats.monthlyActivity).length > 0
                        ? `${Object.entries(stats.monthlyActivity).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} plays`
                        : '0 plays'
                      }
                    </p>
                  </div>
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6">
                    <p className="text-xs sm:text-sm font-medium text-white/90 mb-2 text-shadow-adaptive-sm">Total Score Points</p>
                    <p className="text-base sm:text-lg font-bold text-white/90 text-shadow-adaptive">
                      {formatNumber(stats?.totalScorePoints || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-white mt-1 text-shadow-adaptive-sm">Lifetime total</p>
                  </div>
                  <div className="glass-1 rounded-lg sm:rounded-xl p-4 sm:p-6">
                    <p className="text-xs sm:text-sm font-medium text-white/90 mb-2 text-shadow-adaptive-sm">Next Milestone</p>
                    <p className="text-base sm:text-lg font-bold text-white/90 text-shadow-adaptive">
                      {milestone.title}
                    </p>
                    <p className="text-xs sm:text-sm text-white mt-1 text-shadow-adaptive-sm">
                      {milestone.isLegend ? 'Achieved!' : `${milestone.remaining} to go`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return {
    props: {}
  };
}