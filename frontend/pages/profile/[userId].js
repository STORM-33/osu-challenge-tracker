import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { 
  Loader2, Trophy, Target, Calendar, User, Award, BarChart3, 
  Sparkles, Flame, Zap, ArrowLeft, ExternalLink, TrendingUp,
  Star, Clock, MapPin, Music, ChevronRight, Activity
} from 'lucide-react';

export default function UserProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [bestPerformances, setBestPerformances] = useState([]);
  const [stats, setStats] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('recent');
  const router = useRouter();
  const { userId } = router.query;

  useEffect(() => {
    if (!userId) return;
    loadUserData();
  }, [userId, activeTab]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current authenticated user
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      
      if (authData.authenticated) {
        setCurrentUser(authData.user);
      }

      // Get profile user data with tab-specific parameters
      const profileResponse = await fetch(`/api/user/profile/${userId}?tab=${activeTab}`);
      
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
      setScores(profileData.scores || []);
      setBestPerformances(profileData.bestPerformances || []);
      setStats(profileData.stats || null);
      setStreaks(profileData.streaks || null);

    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getCountryFlagUrl = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return null;
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 98) return 'text-pink-500';
    if (accuracy >= 95) return 'text-purple-500';
    if (accuracy >= 90) return 'text-blue-500';
    if (accuracy >= 80) return 'text-green-500';
    return 'text-orange-500';
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

  const isOwnProfile = currentUser && profileUser && currentUser.id === profileUser.id;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-ping opacity-75"></div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-600">Loading profile...</p>
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
            <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-8">
              <User className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              {error || 'User Not Found'}
            </h2>
            <p className="text-gray-600 mb-8">
              The user profile you're looking for doesn't exist or has been removed.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-full transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
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

  // Group scores by month for better visualization
  const scoresByMonth = scores.reduce((acc, score) => {
    const month = new Date(score.submitted_at).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
    if (!acc[month]) acc[month] = [];
    acc[month].push(score);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          
          {/* Compact Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-all"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
          </div>

          {/* Profile Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-3xl p-8 mb-8 text-white shadow-2xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-4 -right-4 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute -bottom-4 -left-4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                {/* Avatar and Basic Info */}
                <div className="flex items-center gap-6 flex-1">
                  <div className="relative group">
                    {profileUser.avatar_url ? (
                      <img 
                        src={profileUser.avatar_url} 
                        alt={profileUser.username}
                        className="w-32 h-32 rounded-2xl border-4 border-white/20 shadow-2xl group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-4 border-white/20 shadow-2xl">
                        <span className="text-5xl font-bold">{profileUser.username[0]}</span>
                      </div>
                    )}
                    {/* Status indicator */}
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 rounded-full border-4 border-white flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h1 className="text-4xl font-black">
                        {profileUser.osu_id ? (
                          <a
                            href={`https://osu.ppy.sh/users/${profileUser.osu_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white/80 transition-colors flex items-center gap-3 group"
                          >
                            {profileUser.username}
                            <ExternalLink className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          profileUser.username
                        )}
                      </h1>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {profileUser.country && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                          {getCountryFlagUrl(profileUser.country) && (
                            <img 
                              src={getCountryFlagUrl(profileUser.country)} 
                              alt={`${profileUser.country} flag`}
                              className="w-6 h-4 object-cover rounded"
                            />
                          )}
                          <span className="font-medium">{profileUser.country.toUpperCase()}</span>
                        </div>
                      )}
                      
                      <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Joined {new Date(profileUser.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Streak Display */}
                {streaks && (
                  <div className="flex gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 min-w-[160px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-5 h-5" />
                        <span className="text-sm font-medium opacity-90">Current Streak</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black">{streaks.currentStreak}</span>
                        <span className="text-2xl">{getStreakEmoji(streaks.currentStreak)}</span>
                      </div>
                    </div>
                    
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 min-w-[160px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5" />
                        <span className="text-sm font-medium opacity-90">Best Streak</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black">{streaks.longestStreak}</span>
                        <Sparkles className="w-6 h-6 text-yellow-300" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all group">
              <div className="flex items-center justify-between mb-3">
                <Target className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />
                <span className={`text-3xl font-black ${getAccuracyColor(parseFloat(stats?.avgAccuracy || 0))}`}>
                  {stats?.avgAccuracy ? `${stats.avgAccuracy}%` : '--.--%'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Average Accuracy</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all group">
              <div className="flex items-center justify-between mb-3">
                <Trophy className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform" />
                <span className="text-3xl font-black text-gray-800">
                  #{stats?.avgRank || '--'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Average Rank</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all group">
              <div className="flex items-center justify-between mb-3">
                <BarChart3 className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="text-3xl font-black text-gray-800">
                  {stats?.totalScores || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Total Plays</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all group">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
                <span className="text-3xl font-black text-gray-800">
                  {stats?.firstPlaceCount || 0}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">First Places</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                activeTab === 'recent'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Recent Scores
            </button>
            <button
              onClick={() => setActiveTab('best')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                activeTab === 'best'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Best Performances
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Statistics
            </button>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'recent' && (
            <div>
              {scores.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center shadow-lg">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-12 h-12 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">No Scores Yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
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
                <div className="space-y-8">
                  {Object.entries(scoresByMonth).map(([month, monthScores]) => (
                    <div key={month}>
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        {month}
                      </h3>
                      <div className="grid gap-4">
                        {monthScores.map((score) => (
                          <div 
                            key={score.id}
                            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-start gap-4">
                                  {/* Rank Badge */}
                                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getRankGradient(score.calculated_rank || score.rank_position)} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                    <span className="text-white font-black text-xl">
                                      #{score.calculated_rank || score.rank_position}
                                    </span>
                                  </div>
                                  
                                  <div className="flex-1">
                                    <h4 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-purple-600 transition-colors">
                                      {score.playlists?.beatmap_title || 'Unknown Beatmap'}
                                    </h4>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                                      <span className="flex items-center gap-1">
                                        <Music className="w-4 h-4" />
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
                                    
                                    {/* Score Details */}
                                    <div className="flex items-center gap-6">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Score:</span>
                                        <span className="font-mono font-bold text-gray-800">
                                          {formatNumber(score.score)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Accuracy:</span>
                                        <span className={`font-bold ${getAccuracyColor(score.accuracy)}`}>
                                          {score.accuracy.toFixed(2)}%
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Combo:</span>
                                        <span className="font-bold text-gray-800">{score.max_combo}x</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {score.playlists?.challenges?.room_id && (
                                <Link 
                                  href={`/challenges/${score.playlists.challenges.room_id}`}
                                  className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-full transition-all flex items-center gap-2 group-hover:shadow-md"
                                >
                                  View
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'best' && (
            <div className="grid gap-4">
              {/* Debug info - remove this after fixing */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    Debug: bestPerformances.length = {bestPerformances.length}, 
                    scores.length = {scores.length},
                    top10Count from stats = {stats?.top10Count}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Active tab: {activeTab}
                  </p>
                </div>
              )}
              
              {(bestPerformances.length === 0 && scores.length === 0) ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Star className="w-12 h-12 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Scores Yet</h3>
                  <p className="text-gray-600">Start playing challenges to see your best performances!</p>
                </div>
              ) : bestPerformances.length === 0 ? (
                // Fall back to filtering scores if bestPerformances is empty but we have scores
                (() => {
                  const fallbackBestScores = scores
                    .filter(score => (score.calculated_rank || score.rank_position) <= 10)
                    .sort((a, b) => {
                      const rankA = a.calculated_rank || a.rank_position;
                      const rankB = b.calculated_rank || b.rank_position;
                      return rankA - rankB;
                    });
                  
                  return fallbackBestScores.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Star className="w-12 h-12 text-purple-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">No Top 10 Finishes Yet</h3>
                      <p className="text-gray-600">Keep playing to achieve top rankings!</p>
                      <p className="text-sm text-gray-500 mt-2">You have {scores.length} total scores</p>
                    </div>
                  ) : (
                    fallbackBestScores.map((score, index) => (
                      <div 
                        key={score.id}
                        className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Trophy for top 3 */}
                          {(score.calculated_rank || score.rank_position) <= 3 && (
                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${
                              (score.calculated_rank || score.rank_position) === 1 ? 'from-yellow-400 to-amber-600' :
                              (score.calculated_rank || score.rank_position) === 2 ? 'from-gray-300 to-gray-500' :
                              'from-orange-400 to-orange-600'
                            } flex items-center justify-center shadow-lg`}>
                              <Trophy className="w-10 h-10 text-white" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-2xl font-black ${
                                (score.calculated_rank || score.rank_position) === 1 ? 'text-yellow-600' :
                                (score.calculated_rank || score.rank_position) === 2 ? 'text-gray-600' :
                                (score.calculated_rank || score.rank_position) === 3 ? 'text-orange-600' :
                                'text-purple-600'
                              }`}>
                                #{score.calculated_rank || score.rank_position}
                              </span>
                              <h4 className="text-lg font-bold text-gray-800">
                                {score.playlists?.beatmap_title || 'Unknown Beatmap'}
                              </h4>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm">
                              <span className={`font-bold ${getAccuracyColor(score.accuracy)}`}>
                                {score.accuracy.toFixed(2)}% accuracy
                              </span>
                              <span className="text-gray-600">
                                {formatNumber(score.score)} points
                              </span>
                              <span className="text-gray-600">
                                {score.max_combo}x combo
                              </span>
                            </div>
                          </div>
                          
                          {score.playlists?.challenges?.room_id && (
                            <Link 
                              href={`/challenges/${score.playlists.challenges.room_id}`}
                              className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 font-medium rounded-full transition-all"
                            >
                              View Challenge
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                  );
                })()
              ) : (
                bestPerformances.map((score, index) => (
                  <div 
                    key={score.id}
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Trophy for top 3 */}
                      {(score.calculated_rank || score.rank_position) <= 3 && (
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${
                          (score.calculated_rank || score.rank_position) === 1 ? 'from-yellow-400 to-amber-600' :
                          (score.calculated_rank || score.rank_position) === 2 ? 'from-gray-300 to-gray-500' :
                          'from-orange-400 to-orange-600'
                        } flex items-center justify-center shadow-lg`}>
                          <Trophy className="w-10 h-10 text-white" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-2xl font-black ${
                            (score.calculated_rank || score.rank_position) === 1 ? 'text-yellow-600' :
                            (score.calculated_rank || score.rank_position) === 2 ? 'text-gray-600' :
                            (score.calculated_rank || score.rank_position) === 3 ? 'text-orange-600' :
                            'text-purple-600'
                          }`}>
                            #{score.calculated_rank || score.rank_position}
                          </span>
                          <h4 className="text-lg font-bold text-gray-800">
                            {score.playlists?.beatmap_title || 'Unknown Beatmap'}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <span className={`font-bold ${getAccuracyColor(score.accuracy)}`}>
                            {score.accuracy.toFixed(2)}% accuracy
                          </span>
                          <span className="text-gray-600">
                            {formatNumber(score.score)} points
                          </span>
                          <span className="text-gray-600">
                            {score.max_combo}x combo
                          </span>
                        </div>
                      </div>
                      
                      {score.playlists?.challenges?.room_id && (
                        <Link 
                          href={`/challenges/${score.playlists.challenges.room_id}`}
                          className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 font-medium rounded-full transition-all"
                        >
                          View Challenge
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-500" />
                Detailed Statistics
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Performance Distribution */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Performance Overview</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                      <span className="font-medium text-gray-700">Total Challenges Played</span>
                      <span className="text-xl font-bold text-purple-600">{stats?.totalScores || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                      <span className="font-medium text-gray-700">Average Score</span>
                      <span className="text-xl font-bold text-blue-600">
                        {stats?.avgScore ? formatNumber(stats.avgScore) : '0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                      <span className="font-medium text-gray-700">Perfect Scores (100%)</span>
                      <span className="text-xl font-bold text-green-600">
                        {stats?.perfectScoreCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Rank Distribution */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Rank Distribution</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-sm">2-3</span>
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-end pr-3"
                          style={{ width: `${Math.min((stats?.rankDistribution?.topThree || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                        >
                          <span className="text-white font-bold text-sm">
                            {stats?.rankDistribution?.topThree || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-sm">4-10</span>
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-end pr-3"
                          style={{ width: `${Math.min((stats?.rankDistribution?.topTen || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                        >
                          <span className="text-white font-bold text-sm">
                            {stats?.rankDistribution?.topTen || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-sm">11+</span>
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-end pr-3"
                          style={{ width: `${Math.min((stats?.rankDistribution?.other || 0) / (stats?.totalScores || 1) * 100, 100)}%` }}
                        >
                          <span className="text-white font-bold text-sm">
                            {stats?.rankDistribution?.other || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Monthly Activity */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Monthly Activity</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats?.monthlyActivity && Object.entries(stats.monthlyActivity).slice(-4).map(([month, count]) => (
                    <div key={month} className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">{month}</p>
                      <p className="text-2xl font-bold text-purple-600">{count}</p>
                      <p className="text-xs text-gray-500">plays</p>
                    </div>
                  ))}
                  {(!stats?.monthlyActivity || Object.keys(stats.monthlyActivity).length === 0) && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      No activity data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Achievement Showcase (if user has notable achievements) */}
          {stats?.firstPlaceCount > 0 && (
            <div className="mt-8 bg-gradient-to-r from-yellow-100 via-amber-100 to-orange-100 rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-600" />
                Trophy Cabinet
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-3xl font-black text-yellow-600 mb-1">
                    {stats?.firstPlaceCount || 0}
                  </p>
                  <p className="text-sm font-medium text-gray-700">First Places</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-3xl font-black text-gray-600 mb-1">
                    {stats?.podiumCount || 0}
                  </p>
                  <p className="text-sm font-medium text-gray-700">Podium Finishes</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-3xl font-black text-purple-600 mb-1">
                    {stats?.top10Count || 0}
                  </p>
                  <p className="text-sm font-medium text-gray-700">Top 10 Finishes</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-3xl font-black text-green-600 mb-1">
                    {stats?.highAccuracyCount || 0}
                  </p>
                  <p className="text-sm font-medium text-gray-700">98%+ Accuracy</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress & Milestones Section */}
          {scores.length > 0 && (
            <div className="mt-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                Progress & Insights
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">Most Active Month</p>
                  <p className="text-lg font-bold text-purple-600">
                    {stats?.monthlyActivity && Object.keys(stats.monthlyActivity).length > 0 
                      ? Object.entries(stats.monthlyActivity).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                      : 'N/A'
                    }
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats?.monthlyActivity && Object.keys(stats.monthlyActivity).length > 0
                      ? `${Object.entries(stats.monthlyActivity).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} plays`
                      : '0 plays'
                    }
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Score Points</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatNumber(stats?.totalScorePoints || 0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Lifetime total</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">Next Milestone</p>
                  <p className="text-lg font-bold text-purple-600">
                    {(stats?.totalScores || 0) < 10 ? '10 Plays' :
                     (stats?.totalScores || 0) < 25 ? '25 Plays' :
                     (stats?.totalScores || 0) < 50 ? '50 Plays' :
                     (stats?.totalScores || 0) < 100 ? '100 Plays' :
                     '🎉 Legend!'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(stats?.totalScores || 0) < 100 ? `${100 - (stats?.totalScores || 0)} to go` : 'Achieved!'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-16 text-center pb-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm font-medium text-gray-600">
                Profile syncs with osu! automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}