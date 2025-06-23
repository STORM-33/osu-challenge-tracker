import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { auth, challengeQueries, supabase } from '../lib/supabase';
import { Loader2, Trophy, Target, Calendar, User, Award, BarChart3, Sparkles, Flame, Zap } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get current user
      const currentUser = await auth.getCurrentUser();
      if (!currentUser) {
        router.push('/');
        return;
      }
      
      setUser(currentUser);

      // Load user scores, stats, and streaks
      const [userScores, userStats, userStreaks] = await Promise.all([
        challengeQueries.getUserScores(currentUser.id),
        challengeQueries.getUserStats(currentUser.id),
        challengeQueries.getUserStreaks(currentUser.id)
      ]);

      // 🚀 FIXED: Use batch function instead of N+1 queries
      let scoresWithCalculatedRanks = userScores;
      
      if (userScores && userScores.length > 0) {
        try {
          // Extract playlist IDs for batch ranking
          const playlistIds = userScores.map(score => score.playlist_id);
          
          // Single database call to get all ranks
          const { data: rankData, error: rankError } = await supabase
            .rpc('get_user_ranks_batch', {
              p_user_id: currentUser.id,
              p_playlist_ids: playlistIds
            });

          if (!rankError && rankData) {
            // Create a map for quick lookup
            const rankMap = new Map();
            rankData.forEach(rank => {
              rankMap.set(rank.playlist_id, {
                calculated_rank: rank.user_rank,
                total_players: rank.total_players
              });
            });

            // Apply ranks to scores
            scoresWithCalculatedRanks = userScores.map(score => {
              const rankInfo = rankMap.get(score.playlist_id);
              return {
                ...score,
                calculated_rank: rankInfo?.calculated_rank || score.rank_position,
                total_players: rankInfo?.total_players || null
              };
            });
          } else {
            console.warn('Batch rank calculation failed, using fallback ranks:', rankError);
            // Fallback to original ranks
            scoresWithCalculatedRanks = userScores.map(score => ({
              ...score,
              calculated_rank: score.rank_position
            }));
          }
        } catch (batchError) {
          console.error('Error in batch rank calculation:', batchError);
          // Fallback to original ranks
          scoresWithCalculatedRanks = userScores.map(score => ({
            ...score,
            calculated_rank: score.rank_position
          }));
        }
      }

      setScores(scoresWithCalculatedRanks.slice(0, 5));
      setStats(userStats);
      setStreaks(userStreaks);
    } catch (error) {
      console.error('Error loading user data:', error);
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

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-80 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl border border-neutral-200">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-neutral-600 font-medium">Loading your profile...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-3xl p-16 text-center border border-neutral-200">
            <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-700 mb-3">Login Required</h3>
            <p className="text-neutral-600 mb-8">Please login with your osu! account to view your profile</p>
            <Link 
              href="/api/auth/login"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
            >
              Login with osu!
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* User Profile Header */}
        <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-3xl p-8 mb-12 border border-primary-100 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1">
              <div className="relative">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-3xl font-bold text-white">{user.username[0]}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <h1 className="text-3xl font-bold text-neutral-800">{user.username}</h1>
                  <div className="flex items-center gap-3">
                    {user.country && (
                      <span className="px-3 py-1 bg-white/80 text-neutral-700 text-sm font-medium rounded-full border border-neutral-200 shadow-sm flex items-center gap-2">
                        {getCountryFlagUrl(user.country) ? (
                          <img 
                            src={getCountryFlagUrl(user.country)} 
                            alt={`${user.country} flag`}
                            className="w-4 h-3 object-cover border border-neutral-400"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'inline';
                            }}
                          />
                        ) : null}
                        <span style={{ display: getCountryFlagUrl(user.country) ? 'none' : 'inline' }}>
                          🌍
                        </span>
                        {user.country.toUpperCase()}
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

        {/* Average Performance Overview */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-8 mb-12 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-neutral-800">Performance Statistics</h2>
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
              <p className="text-neutral-600 mb-8">Start participating in challenges to see your scores here!</p>
              <Link 
                href="/"
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              >
                Browse Active Challenges
              </Link>
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