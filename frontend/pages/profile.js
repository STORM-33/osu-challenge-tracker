import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import UserStats from '../components/UserStats';
import { auth, challengeQueries, supabase } from '../lib/supabase';
import { Loader2, Trophy, TrendingUp, Target, Calendar, User, Award, BarChart3, Sparkles, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState(null);
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

      // Load user scores and stats
      const [userScores, userStats] = await Promise.all([
        challengeQueries.getUserScores(currentUser.id),
        challengeQueries.getUserStats(currentUser.id)
      ]);

      // Calculate actual ranks for each score by fetching all scores for each playlist
      const scoresWithCalculatedRanks = await Promise.all(
        userScores.map(async (score) => {
          try {
            // Get all scores for this playlist, sorted by score descending
            const { data: allPlaylistScores, error } = await supabase
              .from('scores')
              .select('score, user_id')
              .eq('playlist_id', score.playlist_id)
              .order('score', { ascending: false });

            if (!error && allPlaylistScores) {
              // Find user's rank in this playlist
              const userRank = allPlaylistScores.findIndex(s => s.user_id === currentUser.id) + 1;
              return {
                ...score,
                calculated_rank: userRank > 0 ? userRank : score.rank_position
              };
            }
          } catch (error) {
            console.error('Error calculating rank for score:', error);
          }
          
          // Fallback to original rank_position
          return {
            ...score,
            calculated_rank: score.rank_position
          };
        })
      );

      setScores(scoresWithCalculatedRanks);
      setStats(userStats);
      
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
    if (accuracy >= 98) return 'text-green-600';
    if (accuracy >= 95) return 'text-yellow-600';
    return 'text-neutral-600';
  };

  const getRankColor = (rank) => {
    if (rank <= 3) return 'text-yellow-600 font-bold';
    if (rank <= 10) return 'text-primary-600 font-semibold';
    return 'text-neutral-600 font-medium';
  };

  const getImprovementIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-neutral-600" />;
      default:
        return null;
    }
  };

  const getImprovementText = (trend) => {
    switch (trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Declining';
      case 'stable':
        return 'Stable';
      default:
        return 'N/A';
    }
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
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
                  {stats?.improvementTrend && (
                    <span className="px-3 py-1 bg-white/80 text-neutral-700 text-sm font-medium rounded-full border border-neutral-200 shadow-sm flex items-center gap-2">
                      {getImprovementIcon(stats.improvementTrend)}
                      {getImprovementText(stats.improvementTrend)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Average Performance Overview */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-8 mb-12 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
            </div>
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
              <p className={`text-3xl font-bold mb-1 ${getRankColor(stats?.avgRank || 0)}`}>
                {stats?.avgRank ? `#${stats.avgRank}` : '#--'}
              </p>
              <p className="text-sm text-indigo-600">Average position</p>
            </div>
            
            <div className="bg-white/80 rounded-2xl p-6 border border-indigo-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">Avg. Score</span>
              </div>
              <p className="text-3xl font-bold text-indigo-900 mb-1">
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

          {/* Additional comprehensive stats */}
          {stats && (
            <div className="mt-6 pt-6 border-t border-indigo-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-indigo-900 mb-1">Best Rank</p>
                  <p className={`text-2xl font-bold ${getRankColor(stats.bestRank)}`}>
                    {stats.bestRank ? `#${stats.bestRank}` : 'N/A'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-indigo-900 mb-1">Best Accuracy</p>
                  <p className={`text-2xl font-bold ${getAccuracyColor(parseFloat(stats.bestAccuracy || 0))}`}>
                    {stats.bestAccuracy ? `${stats.bestAccuracy}%` : 'N/A'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-indigo-900 mb-1">Highest Score</p>
                  <p className="text-2xl font-bold text-indigo-800">
                    {stats.highestScore ? stats.highestScore.toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-indigo-900 mb-1">Participation Rate</p>
                  <p className="text-2xl font-bold text-indigo-800">
                    {stats.participationRate ? `${stats.participationRate}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
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
                      <p className="text-sm text-neutral-500 font-medium">Rank Position</p>
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