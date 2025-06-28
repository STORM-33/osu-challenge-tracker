import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Trophy, Crown, Star, Target, Users, TrendingUp, Award, Medal, Zap, Sparkles, ChevronUp, ChevronDown, Flame } from 'lucide-react';

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

  const getAccuracyGradient = (accuracy) => {
    if (accuracy >= 98) return 'from-purple-500 to-pink-500';
    if (accuracy >= 95) return 'from-emerald-500 to-green-500';
    if (accuracy >= 90) return 'from-blue-500 to-cyan-500';
    if (accuracy >= 85) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3"></div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-red-200 p-12 text-center">
        <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">Error loading leaderboard: {error}</p>
        <button 
          onClick={fetchLeaderboard}
          className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header Card */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-t-3xl border border-purple-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-purple-600" />
              Season Rankings
            </h2>
            {selectedSeason && (
              <p className="text-gray-600 mt-1">
                {selectedSeason.name} • {leaderboard.length} participants
              </p>
            )}
          </div>
          
          {currentUser && (
            <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-1">
              <button
                onClick={() => setViewMode('full')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === 'full' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Full Rankings
              </button>
              <button
                onClick={() => setViewMode('context')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === 'context' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-purple-100 text-center">
              <p className="text-xs text-gray-600 font-medium mb-1">Your Rank</p>
              <p className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                #{userPosition.user_position}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-purple-100 text-center">
              <p className="text-xs text-gray-600 font-medium mb-1">Total Score</p>
              <p className="text-3xl font-black text-gray-900">{formatNumber(userPosition.total_score)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-purple-100 text-center">
              <p className="text-xs text-gray-600 font-medium mb-1">Challenges</p>
              <p className="text-3xl font-black text-gray-900">{userPosition.challenges_participated}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-purple-100 text-center">
              <p className="text-xs text-gray-600 font-medium mb-1">Top</p>
              <p className="text-3xl font-black text-gray-900">{Math.max(1, Math.round(100 - userPosition.percentile))}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Container */}
      <div className="bg-white rounded-b-3xl shadow-xl border border-t-0 border-gray-200 overflow-hidden">
        {/* Podium Section for Top 3 */}
        {leaderboard.length > 0 && viewMode === 'full' && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
              {/* 2nd Place */}
              {leaderboard[1] && (
                <div className="order-1 md:order-1">
                  <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-6 text-center transform hover:scale-105 transition-all">
                    <div className="w-20 h-20 mx-auto mb-3 relative">
                      <img
                        src={leaderboard[1].avatar_url || '/default-avatar.png'}
                        alt={leaderboard[1].username}
                        className="w-full h-full rounded-full border-4 border-purple-300 shadow-lg"
                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                      />
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                        2nd
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 truncate">{leaderboard[1].username}</h3>
                    <p className="text-2xl font-black text-purple-700 mt-2">{formatNumber(leaderboard[1].total_score)}</p>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {leaderboard[0] && (
                <div className="order-2 md:order-2">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6 text-center transform hover:scale-105 transition-all relative">
                    <Crown className="absolute top-2 right-2 w-6 h-6 text-blue-600" />
                    <div className="w-24 h-24 mx-auto mb-3 relative">
                      <img
                        src={leaderboard[0].avatar_url || '/default-avatar.png'}
                        alt={leaderboard[0].username}
                        className="w-full h-full rounded-full border-4 border-blue-400 shadow-xl"
                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                      />
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg">
                        1st
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg truncate">{leaderboard[0].username}</h3>
                    <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mt-2">
                      {formatNumber(leaderboard[0].total_score)}
                    </p>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {leaderboard[2] && (
                <div className="order-3 md:order-3">
                  <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-2xl p-6 text-center transform hover:scale-105 transition-all">
                    <div className="w-20 h-20 mx-auto mb-3 relative">
                      <img
                        src={leaderboard[2].avatar_url || '/default-avatar.png'}
                        alt={leaderboard[2].username}
                        className="w-full h-full rounded-full border-4 border-red-300 shadow-lg"
                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                      />
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                        3rd
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 truncate">{leaderboard[2].username}</h3>
                    <p className="text-2xl font-black text-red-700 mt-2">{formatNumber(leaderboard[2].total_score)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Leaderboard */}
        <div className="divide-y divide-gray-100">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No participants found for this season.</p>
            </div>
          ) : (
            leaderboard.slice(viewMode === 'full' ? 3 : 0).map((user, index) => {
              const position = user.position || (viewMode === 'full' ? index + 4 : index + 1);
              const isCurrentUser = currentUser && user.user_id === currentUser.id;
              const isTop10 = position <= 10;
              
              return (
                <div
                  key={user.user_id}
                  className={`group px-6 py-4 transition-all ${
                    isCurrentUser 
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500' 
                      : user.is_target_user
                      ? 'bg-yellow-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`text-center min-w-[3rem] ${isTop10 ? 'font-black text-2xl' : 'font-bold text-lg'} text-gray-700`}>
                      {position}
                    </div>

                    {/* Player Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative">
                        <img
                          src={user.avatar_url || '/default-avatar.png'}
                          alt={user.username}
                          className={`${isTop10 ? 'w-12 h-12' : 'w-10 h-10'} rounded-full border-2 border-white shadow-md group-hover:shadow-lg transition-shadow`}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/profile/${user.user_id}`)}
                            className="font-semibold text-gray-900 hover:text-purple-600 transition-colors truncate"
                          >
                            {user.username}
                          </button>
                          {user.country && (
                            <img 
                              src={`https://flagcdn.com/w20/${user.country.toLowerCase()}.png`}
                              alt={user.country}
                              className="w-5 h-3 rounded-sm shadow-sm"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-medium">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-0.5">
                          <span>{user.challenges_participated} challenges</span>
                          {user.percentile >= 95 && (
                            <span className="text-purple-600 font-medium">Top {Math.max(1, Math.round(100 - Math.floor(user.percentile)))}%</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6">
                      {/* Accuracy Badge */}
                      <div className={`px-3 py-1.5 bg-gradient-to-r ${getAccuracyGradient(user.average_accuracy)} text-white rounded-lg font-bold text-sm shadow-md`}>
                        {user.average_accuracy?.toFixed(1)}%
                      </div>

                      {/* Score */}
                      <div className="text-right min-w-[100px]">
                        <p className={`${isTop10 ? 'text-2xl' : 'text-xl'} font-black text-gray-900`}>
                          {formatNumber(user.total_score)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {viewMode === 'full' && leaderboard.length >= 100 && (
          <div className="p-6 text-center border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => console.log('Load more clicked')}
              className="px-8 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:shadow-md transform hover:scale-105 transition-all border border-gray-200"
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