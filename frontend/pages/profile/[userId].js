import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { Loader2, Trophy, Target, Calendar, User, Award, BarChart3, Sparkles, Flame, Zap, ArrowLeft, ExternalLink } from 'lucide-react';

export default function UserProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

      // Get current authenticated user
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      
      if (authData.authenticated) {
        setCurrentUser(authData.user);
      }

      // Get profile user data
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
      setScores(profileData.scores || []);
      setStats(profileData.stats || null);
      setStreaks(profileData.streaks || null);

    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get country flag URL from flagcdn.com
  const getCountryFlagUrl = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return null;
    return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 95) return 'text-emerald-500';
    if (accuracy >= 90) return 'text-green-500';
    if (accuracy >= 80) return 'text-sky-500';
    if (accuracy >= 70) return 'text-orange-500';
    return 'text-red-600';
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-600 font-bold';
    return 'text-neutral-800 font-medium';
  };

  const getStreakColor = (streak) => {
    if (streak >= 10) return 'text-purple-600';
    if (streak >= 5) return 'text-orange-600';
    if (streak >= 3) return 'text-blue-600';
    return 'text-neutral-600';
  };

  const isOwnProfile = currentUser && profileUser && currentUser.id === profileUser.id;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-80 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl border border-neutral-200">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-neutral-600 font-medium">Loading profile...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl p-16 text-center border border-neutral-200">
            <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-700 mb-3">{error}</h3>
            <p className="text-neutral-600 mb-8">The user you're looking for could not be found or their profile is unavailable.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-semibold px-6 py-3 rounded-full transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              <Link 
                href="/"
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              >
                Browse Challenges
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profileUser) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl p-16 text-center border border-neutral-200">
            <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-700 mb-3">User Not Found</h3>
            <p className="text-neutral-600 mb-8">This user profile does not exist or has been removed.</p>
            <Link 
              href="/"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
            >
              Browse Challenges
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* User Profile Header */}
        <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-3xl p-8 mb-12 border border-primary-100 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1">
              <div className="relative">
                {profileUser.avatar_url ? (
                  <img 
                    src={profileUser.avatar_url} 
                    alt={profileUser.username}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-3xl font-bold text-white">{profileUser.username[0]}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-neutral-800">
                      {profileUser.osu_id ? (
                        <a
                          href={`https://osu.ppy.sh/users/${profileUser.osu_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary-600 transition-colors flex items-center gap-2 group"
                        >
                          {profileUser.username}
                          <ExternalLink className="w-5 h-5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
                        </a>
                      ) : (
                        profileUser.username
                      )}
                    </h1>
                  </div>
                  <div className="flex items-center gap-3">
                    {profileUser.country && (
                      <span className="px-3 py-1 bg-white/80 text-neutral-700 text-sm font-medium rounded-full border border-neutral-200 shadow-sm flex items-center gap-2">
                        {getCountryFlagUrl(profileUser.country) ? (
                          <img 
                            src={getCountryFlagUrl(profileUser.country)} 
                            alt={`${profileUser.country} flag`}
                            className="w-4 h-3 object-cover border border-neutral-400"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'inline';
                            }}
                          />
                        ) : null}
                        <span style={{ display: getCountryFlagUrl(profileUser.country) ? 'none' : 'inline' }}>
                          🌍
                        </span>
                        {profileUser.country.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Current Streak Display */}
                {streaks && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-100 to-red-100 rounded-full border border-orange-200">
                      {streaks.currentStreak > 0 ? (
                        <>
                          <Flame className={`w-4 h-4 ${getStreakColor(streaks.currentStreak)}`} />
                          <span className={`text-sm font-bold ${getStreakColor(streaks.currentStreak)}`}>
                            {streaks.currentStreak} Challenge Streak
                          </span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm font-medium text-neutral-600">
                            No Active Streak
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Longest Streak Display - Right Side */}
            {streaks && (
              <div className="bg-white/80 rounded-2xl p-6 border border-purple-200 shadow-sm min-w-[180px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <Trophy className="w-6 h-6 text-purple-600" />
                    <Sparkles className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1" />
                  </div>
                  <span className="text-sm font-medium text-purple-900">Longest Streak</span>
                </div>
                <p className={`text-3xl font-bold mb-1 ${getStreakColor(streaks.longestStreak)}`}>
                  {streaks.longestStreak}
                </p>
                <p className="text-sm text-purple-600">
                  {streaks.longestStreak === 1 ? 'Challenge' : 'Challenges'}
                </p>
                {streaks.lastParticipatedDate && (
                  <p className="text-xs text-purple-500 mt-2">
                    Last: {new Date(streaks.lastParticipatedDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Performance Statistics */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-8 mb-12 border border-indigo-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold text-neutral-800">Performance Statistics</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full border border-indigo-200">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">Past 3 Months</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/80 rounded-2xl p-6 border border-indigo-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">Avg. Accuracy</span>
              </div>
              <p className={`text-3xl font-bold mb-1 ${getAccuracyColor(parseFloat(stats?.avgAccuracy || 0))}`}>
                {stats?.avgAccuracy ? `${stats.avgAccuracy}%` : '--.--%'}
              </p>
              <p className="text-sm text-indigo-600">Across all challenges</p>
            </div>
            
            <div className="bg-white/80 rounded-2xl p-6 border border-indigo-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">Avg. Rank</span>
              </div>
              <p className="text-3xl font-bold text-neutral-800 mb-1">
                {stats?.avgRank ? `#${stats.avgRank}` : '#--'}
              </p>
              <p className="text-sm text-indigo-600">Average position</p>
            </div>
            
            <div className="bg-white/80 rounded-2xl p-6 border border-indigo-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">Avg. Score</span>
              </div>
              <p className="text-3xl font-bold text-neutral-800 mb-1">
                {stats?.avgScore ? stats.avgScore.toLocaleString() : '---,---'}
              </p>
              <p className="text-sm text-indigo-600">Per challenge</p>
            </div>
            
            <div className="bg-white/80 rounded-2xl p-6 border border-indigo-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">Participation</span>
              </div>
              <p className="text-3xl font-bold text-indigo-900 mb-1">{stats?.totalScores || 0}</p>
              <p className="text-sm text-indigo-600">Scores submitted</p>
            </div>
          </div>
        </div>

        {/* Recent Scores */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="relative">
              <Award className="w-8 h-8 text-primary-600" />
              <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-800">Recent Challenge Scores</h2>
            {scores.length > 0 && (
              <span className="px-4 py-2 bg-gradient-to-r from-primary-100 to-purple-100 text-primary-700 text-sm font-semibold rounded-full border border-primary-200 shadow-sm">
                {scores.length} Score{scores.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {scores.length === 0 ? (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl p-16 text-center border border-neutral-200">
              <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-neutral-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-700 mb-3">No Challenge Scores Yet</h3>
              <p className="text-neutral-600 mb-8">
                {isOwnProfile 
                  ? "Start participating in challenges to see your scores here!" 
                  : `${profileUser.username} hasn't participated in any challenges yet.`
                }
              </p>
              {isOwnProfile && (
                <Link 
                  href="/"
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
                >
                  Browse Active Challenges
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {scores.map((score) => (
                <div 
                  key={score.id}
                  className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-all hover:border-primary-300"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-neutral-800 mb-2">
                        {score.playlists?.beatmap_title || 'Unknown Beatmap'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full border border-primary-200">
                          {score.playlists?.challenges?.name || 'Unknown Challenge'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="flex items-center gap-2 justify-center sm:justify-end mb-1">
                        <Trophy className="w-5 h-5 text-yellow-600" />
                        <p className={`text-2xl font-bold ${getRankColor(score.calculated_rank || score.rank_position)}`}>
                          #{score.calculated_rank || score.rank_position}
                        </p>
                      </div>
                      <p className="text-sm text-neutral-500 font-medium">
                        {score.total_players ? `of ${score.total_players}` : 'Rank Position'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 text-center border border-neutral-200">
                      <p className="text-sm font-medium text-neutral-600 mb-1">Score</p>
                      <p className="text-lg font-bold text-neutral-800 font-mono">
                        {score.score.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 text-center border border-neutral-200">
                      <p className="text-sm font-medium text-neutral-600 mb-1">Accuracy</p>
                      <p className={`text-lg font-bold ${getAccuracyColor(score.accuracy)}`}>
                        {score.accuracy.toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 text-center border border-neutral-200">
                      <p className="text-sm font-medium text-neutral-600 mb-1">Max Combo</p>
                      <p className="text-lg font-bold text-neutral-800">{score.max_combo}x</p>
                    </div>
                    <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 text-center border border-neutral-200">
                      <p className="text-sm font-medium text-neutral-600 mb-1">Date</p>
                      <p className="text-lg font-bold text-neutral-800">
                        {new Date(score.submitted_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {score.playlists?.challenges?.room_id && (
                    <div className="flex justify-end">
                      <Link 
                        href={`/challenges/${score.playlists.challenges.room_id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors flex items-center gap-1"
                      >
                        View Challenge 
                        <span className="ml-1">→</span>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full border border-neutral-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-neutral-600 font-medium">
              Profile data syncs with osu! automatically
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}