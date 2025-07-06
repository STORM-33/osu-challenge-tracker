import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Trophy, Crown, Star, Target, Users, TrendingUp, Award, Medal, Zap, Sparkles, ChevronUp, ChevronDown, Flame, User, Loader2 } from 'lucide-react';

const SeasonLeaderboard = ({ currentUser, selectedSeason }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // 'full' or 'context'
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [pageSize] = useState(50); // Fixed page size for load more
  const [initialLoad, setInitialLoad] = useState(true);
  const router = useRouter();

  const fetchLeaderboard = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const params = new URLSearchParams();
      if (selectedSeason?.id) params.append('seasonId', selectedSeason.id);
      if (currentUser?.id) params.append('userId', currentUser.id);
      
      if (viewMode === 'context') {
        params.append('withUserContext', 'true');
        params.append('contextRange', '5');
      } else {
        // For initial load, get 100 records (first 2 pages)
        // For load more, get the next page
        if (isLoadMore) {
          params.append('limit', pageSize.toString());
          params.append('offset', currentOffset.toString());
        } else {
          params.append('limit', '100'); // Initial load gets 100 records
          params.append('offset', '0');
        }
      }

      const response = await fetch(`/api/seasons/leaderboard?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      if (isLoadMore) {
        // Append new records to existing leaderboard
        setLeaderboard(prev => [...prev, ...data.leaderboard]);
        setCurrentOffset(prev => prev + pageSize);
      } else {
        // Replace leaderboard for initial load or refresh
        setLeaderboard(data.leaderboard);
        // Set currentOffset to the actual number of records loaded (for proper pagination)
        setCurrentOffset(data.leaderboard.length);
        setInitialLoad(false);
      }

      setUserPosition(data.userPosition);
      setHasMore(data.hasMore || false);

    } catch (err) {
      console.error('Error fetching season leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    await fetchLeaderboard(true);
  };

  useEffect(() => {
    // Reset pagination state when season or view mode changes
    setCurrentOffset(0);
    setInitialLoad(true);
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
      <div className="space-y-6">
        {/* User Stats Loading Skeleton */}
        <div className="glass-card-enhanced rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200/60 rounded w-32 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200/60 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Leaderboard Loading Skeleton */}
        <div className="glass-card-enhanced rounded-2xl shadow-xl border border-gray-200 p-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200/60 rounded-lg w-1/3"></div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200/60 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200/60 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200/60 rounded w-1/6"></div>
                </div>
                <div className="h-6 bg-gray-200/60 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card-enhanced rounded-3xl shadow-xl border border-red-200 p-12 text-center">
        <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4 icon-glow" />
        <p className="text-red-600 mb-4">Error loading leaderboard: {error}</p>
        <button 
          onClick={() => fetchLeaderboard()}
          className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Performance Panel */}
      {userPosition && (
        <div className="glass-card-enhanced bg-gradient-to-br from-blue-100/50 to-indigo-100/50 rounded-2xl shadow-lg border-2 border-blue-200/60 p-6 backdrop-blur-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-600/90 rounded-lg backdrop-blur-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Your Performance</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4 border border-blue-100/60 text-center shadow-sm backdrop-blur-md">
              <p className="text-xs text-gray-600 font-medium mb-1 uppercase tracking-wide">Your Rank</p>
              <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                #{userPosition.user_position}
              </p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-blue-100/60 text-center shadow-sm backdrop-blur-md">
              <p className="text-xs text-gray-600 font-medium mb-1 uppercase tracking-wide">Total Score</p>
              <p className="text-3xl font-black text-gray-900">{formatNumber(userPosition.total_score)}</p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-blue-100/60 text-center shadow-sm backdrop-blur-md">
              <p className="text-xs text-gray-600 font-medium mb-1 uppercase tracking-wide">Challenges</p>
              <p className="text-3xl font-black text-gray-900">{userPosition.challenges_participated}</p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-blue-100/60 text-center shadow-sm backdrop-blur-md">
              <p className="text-xs text-gray-600 font-medium mb-1 uppercase tracking-wide">Top</p>
              <p className="text-3xl font-black text-gray-900">{Math.max(1, Math.round(100 - userPosition.percentile))}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Container */}
      <div>
        {/* Header Card */}
        <div className="glass-card bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-t-2xl border border-purple-200/60 p-8 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 
                className="text-3xl font-bold text-gray-900 flex items-center gap-3"
                data-text="Season Rankings"
              >
                <Trophy className="w-8 h-8 text-purple-600 icon-glow" />
                Season Rankings
              </h2>
              {selectedSeason && (
                <p className="text-gray-600 mt-1">
                  {selectedSeason.name} • {leaderboard.length} participants shown
                  {hasMore && ' (more available)'}
                </p>
              )}
            </div>
            
            {currentUser && (
              <div className="glass-card rounded-xl shadow-sm border border-purple-200/60 p-1 backdrop-blur-md">
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
        </div>

        <div className="glass-card-enhanced rounded-b-2xl shadow-xl border border-t-0 border-gray-200/60 overflow-hidden backdrop-blur-lg">
          {/* Podium Section for Top 3 */}
          {leaderboard.length > 0 && viewMode === 'full' && (
            <div className="glass-card-subtle bg-gradient-to-br from-gray-50/50 to-gray-100/50 p-8 border-b border-gray-200/60 backdrop-blur-md">
              <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
                {/* 2nd Place */}
                {leaderboard[1] && (
                  <div className="order-1 md:order-1">
                    <div className="glass-card bg-gradient-to-br from-purple-100/60 to-purple-200/60 rounded-2xl p-6 text-center transform hover:scale-105 transition-all backdrop-blur-md border border-purple-200/50">
                      <div className="w-20 h-20 mx-auto mb-3 relative">
                        <img
                          src={leaderboard[1].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[1].username}
                          className="w-full h-full rounded-full border-4 border-purple-300 shadow-lg cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[1].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                          2nd
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-900 truncate cursor-pointer hover:text-purple-600 transition-colors" onClick={() => router.push(`/profile/${leaderboard[1].user_id}`)}>{leaderboard[1].username}</h3>
                      <p className="text-2xl font-black text-purple-700 mt-2">{formatNumber(leaderboard[1].total_score)}</p>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {leaderboard[0] && (
                  <div className="order-2 md:order-2">
                    <div className="glass-card bg-gradient-to-br from-blue-100/60 to-blue-200/60 rounded-2xl p-6 text-center transform hover:scale-105 transition-all relative backdrop-blur-md border border-blue-200/50">
                      <Crown className="absolute top-2 right-2 w-6 h-6 text-blue-600 icon-glow-sm" />
                      <div className="w-24 h-24 mx-auto mb-3 relative">
                        <img
                          src={leaderboard[0].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[0].username}
                          className="w-full h-full rounded-full border-4 border-blue-400 shadow-xl cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[0].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg">
                          1st
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg truncate cursor-pointer hover:text-purple-600 transition-colors" onClick={() => router.push(`/profile/${leaderboard[0].user_id}`)}>{leaderboard[0].username}</h3>
                      <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mt-2">
                        {formatNumber(leaderboard[0].total_score)}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard[2] && (
                  <div className="order-3 md:order-3">
                    <div className="glass-card bg-gradient-to-br from-red-100/60 to-red-200/60 rounded-2xl p-6 text-center transform hover:scale-105 transition-all backdrop-blur-md border border-red-200/50">
                      <div className="w-20 h-20 mx-auto mb-3 relative">
                        <img
                          src={leaderboard[2].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[2].username}
                          className="w-full h-full rounded-full border-4 border-red-300 shadow-lg cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[2].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                          3rd
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-900 truncate cursor-pointer hover:text-purple-600 transition-colors" onClick={() => router.push(`/profile/${leaderboard[2].user_id}`)}>{leaderboard[2].username}</h3>
                      <p className="text-2xl font-black text-red-700 mt-2">{formatNumber(leaderboard[2].total_score)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Leaderboard */}
          <div className="divide-y divide-gray-100/60">
            {leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4 icon-glow" />
                <p className="text-gray-500">No participants found for this season.</p>
              </div>
            ) : (
              leaderboard.slice(viewMode === 'full' ? 3 : 0).map((user, index) => {
                // Always use user_position from database as it contains the correct rank
                const position = user.user_position || user.position;
                const isCurrentUser = currentUser && user.user_id === currentUser.id;
                const isTop10 = position <= 10;
                
                return (
                  <div
                    key={user.user_id}
                    className={`group px-6 py-4 transition-all backdrop-blur-sm ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-purple-50/60 to-pink-50/60 border-l-4 border-purple-500' 
                        : user.is_target_user
                        ? 'bg-yellow-50/60'
                        : 'hover:bg-gray-50/40'
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
                        <div className={`px-3 py-1.5 bg-gradient-to-r ${getAccuracyGradient(user.average_accuracy)} text-white rounded-full font-bold text-sm shadow-md`}>
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

          {/* Load More Button */}
          {viewMode === 'full' && hasMore && (
            <div className="p-6 text-center border-t border-gray-200/60 glass-card-subtle backdrop-blur-sm">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={`px-8 py-3 rounded-xl font-semibold transform transition-all border ${
                  loadingMore
                    ? 'bg-gray-200/60 text-gray-400 cursor-not-allowed'
                    : 'glass-card text-gray-700 hover:shadow-md hover:scale-105 border-gray-200/60'
                }`}
              >
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  `Load More Players (+${pageSize})`
                )}
              </button>
            </div>
          )}

          {/* End of results indicator */}
          {viewMode === 'full' && !hasMore && leaderboard.length > 50 && (
            <div className="p-6 text-center border-t border-gray-200/60 glass-card-subtle backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Trophy className="w-4 h-4 icon-glow-sm" />
                <span className="text-sm font-medium">You've reached the end of the leaderboard!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonLeaderboard;