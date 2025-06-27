// frontend/components/SeasonLeaderboard.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Trophy, Crown, Star, Target, Users, TrendingUp, Award, Medal, Zap, Sparkles } from 'lucide-react';

const SeasonLeaderboard = ({ currentUser, selectedSeason }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // 'full' or 'context'
  const router = useRouter();

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedSeason?.id) params.append('seasonId', selectedSeason.id);
      if (currentUser?.id) params.append('userId', currentUser.id);
      if (viewMode === 'context') {
        params.append('withUserContext', 'true');
        params.append('contextRange', '5');
      } else {
        params.append('limit', '100');
      }

      const response = await fetch(`/api/seasons/leaderboard?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      setLeaderboard(data.leaderboard);
      setUserPosition(data.userPosition);
    } catch (err) {
      console.error('Error fetching season leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedSeason, currentUser, viewMode]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const getRankBadge = (position) => {
    if (position === 1) return { icon: Crown, color: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/50' };
    if (position === 2) return { icon: Medal, color: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/50' };
    if (position === 3) return { icon: Award, color: 'from-red-500 to-red-600', glow: 'shadow-red-500/50' };
    return { icon: Star, color: 'from-gray-400 to-gray-600', glow: 'shadow-gray-400/50' };
  };

  const getAccuracyGradient = (accuracy) => {
    if (accuracy >= 98) return 'from-purple-500 to-pink-500';
    if (accuracy >= 95) return 'from-emerald-500 to-green-500';
    if (accuracy >= 90) return 'from-blue-500 to-cyan-500';
    if (accuracy >= 85) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getPercentileBadge = (percentile) => {
    if (percentile >= 99) return { text: 'Top 1%', color: 'from-purple-600 to-pink-600' };
    if (percentile >= 95) return { text: 'Top 5%', color: 'from-blue-600 to-purple-600' };
    if (percentile >= 90) return { text: 'Top 10%', color: 'from-green-600 to-blue-600' };
    if (percentile >= 75) return { text: 'Top 25%', color: 'from-yellow-600 to-green-600' };
    return { text: `Top ${100 - Math.floor(percentile)}%`, color: 'from-gray-600 to-gray-700' };
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-red-600 mb-4 font-medium">Error loading leaderboard: {error}</p>
        <button 
          onClick={fetchLeaderboard}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-bold hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="glass-card rounded-t-2xl p-8 border-b border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-purple-600" />
              <h2 className="text-3xl font-bold text-gray-900">
                Season Rankings
              </h2>
            </div>
            {selectedSeason && (
              <p className="text-gray-600">
                {selectedSeason.name} • Top {leaderboard.length} Players
              </p>
            )}
          </div>
          
          {currentUser && (
            <div className="backdrop-blur-md bg-white/60 rounded-full p-1 shadow-lg border border-white/50">
              <button
                onClick={() => setViewMode('full')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  viewMode === 'full' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Full Leaderboard
              </button>
              <button
                onClick={() => setViewMode('context')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  viewMode === 'context' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Around Me
              </button>
            </div>
          )}
        </div>

        {/* User Position Summary */}
        {userPosition && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600 font-medium">Your Position</span>
                </div>
                <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  #{userPosition.user_position}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600 font-medium">Total Score</span>
                </div>
                <div className="text-3xl font-black text-gray-900">
                  {formatNumber(userPosition.total_score)}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600 font-medium">Challenges</span>
                </div>
                <div className="text-3xl font-black text-gray-900">
                  {userPosition.challenges_participated}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm text-gray-600 font-medium">Percentile</span>
                </div>
                <div className="text-3xl font-black text-gray-900">
                  {userPosition.percentile}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="glass-card rounded-b-2xl p-8 pt-0">
        {leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No participants found for this season.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((user, index) => {
              const position = user.position || index + 1;
              const isCurrentUser = currentUser && user.user_id === currentUser.id;
              const rankBadge = getRankBadge(position);
              const RankIcon = rankBadge.icon;
              const percentileBadge = user.percentile ? getPercentileBadge(user.percentile) : null;
              
              return (
                <div
                  key={user.user_id}
                  className={`group relative backdrop-blur-md rounded-2xl border transition-all duration-300 ${
                    isCurrentUser 
                      ? 'bg-gradient-to-r from-purple-100/90 to-pink-100/90 border-purple-300 shadow-xl transform scale-[1.02]' 
                      : user.is_target_user
                      ? 'bg-gradient-to-r from-yellow-50/90 to-amber-50/90 border-yellow-300'
                      : 'bg-white/70 border-white/50 hover:bg-white/80 hover:shadow-xl hover:scale-[1.01]'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className={`absolute -left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br ${rankBadge.color} rounded-full flex items-center justify-center shadow-lg ${rankBadge.glow} transform group-hover:scale-110 transition-all`}>
                    <RankIcon className="w-8 h-8 text-white" />
                    <span className="absolute -bottom-1 text-xs font-bold text-white">#{position}</span>
                  </div>

                  <div className="p-6 pl-16">
                    <div className="flex items-center justify-between">
                      {/* User Info */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative">
                          <img
                            src={user.avatar_url || '/default-avatar.png'}
                            alt={user.username}
                            className="w-16 h-16 rounded-full border-4 border-white shadow-lg transform group-hover:scale-110 transition-all"
                            onError={(e) => {
                              e.target.src = '/default-avatar.png';
                            }}
                          />
                          {isCurrentUser && (
                            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                              YOU
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <button
                              onClick={() => router.push(`/profile?user=${user.username}`)}
                              className="text-xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
                            >
                              {user.username}
                            </button>
                            {user.country && (
                              <img 
                                src={`https://flagcdn.com/w40/${user.country.toLowerCase()}.png`}
                                alt={user.country}
                                className="w-6 h-4 rounded shadow-sm"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            {percentileBadge && (
                              <span className={`px-3 py-1 bg-gradient-to-r ${percentileBadge.color} text-white text-xs rounded-full font-bold shadow-lg`}>
                                {percentileBadge.text}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4 text-purple-500" />
                              <span className="font-medium">{user.challenges_participated} challenges</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{user.total_maps_played} maps</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6">
                        {/* Accuracy */}
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Accuracy</p>
                          <div className={`px-4 py-2 bg-gradient-to-r ${getAccuracyGradient(user.average_accuracy)} text-white rounded-xl font-bold shadow-lg`}>
                            {user.average_accuracy?.toFixed(1)}%
                          </div>
                        </div>

                        {/* Total Score */}
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Total Score</p>
                          <div className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl">
                            <p className="text-2xl font-black">{formatNumber(user.total_score)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect Line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${rankBadge.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-2xl`}></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More for Full View */}
        {viewMode === 'full' && leaderboard.length >= 100 && (
          <div className="text-center mt-8">
            <button
              onClick={() => {
                // Implement pagination if needed
                console.log('Load more clicked');
              }}
              className="px-8 py-3 backdrop-blur-md bg-white/60 text-gray-700 rounded-full font-semibold hover:bg-white/80 hover:shadow-lg transform hover:scale-105 transition-all border border-white/50"
            >
              Load More Players
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeasonLeaderboard;