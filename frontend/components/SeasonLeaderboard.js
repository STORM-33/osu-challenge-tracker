import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Trophy, Crown, Star, Target, Users, TrendingUp, Award, Medal, Zap, Sparkles, ChevronUp, ChevronDown, Flame, User, Loader2 } from 'lucide-react';

const SeasonLeaderboard = ({ currentUser, selectedSeason }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // 'full' or 'context'
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [pageSize] = useState(50); // Fixed page size for load more
  const router = useRouter();

  const fetchLeaderboard = async (isLoadMore = false, newViewMode = null) => {
    const mode = newViewMode || viewMode;
    
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLeaderboardLoading(true);
        setError(null);
      }

      const params = new URLSearchParams();
      if (selectedSeason?.id) params.append('seasonId', selectedSeason.id);
      if (currentUser?.id) params.append('userId', currentUser.id);
      
      if (mode === 'context') {
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
      }

      setUserPosition(data.userPosition);
      setHasMore(data.hasMore || false);

    } catch (err) {
      console.error('Error fetching season leaderboard:', err);
      setError(err.message);
    } finally {
      setInitialLoading(false);
      setLeaderboardLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    await fetchLeaderboard(true);
  };

  const handleViewModeChange = (newMode) => {
    if (newMode === viewMode) return;
    
    setViewMode(newMode);
    setCurrentOffset(0);
    fetchLeaderboard(false, newMode);
  };

  useEffect(() => {
    // Only fetch on season/user change, not viewMode change
    setCurrentOffset(0);
    fetchLeaderboard();
  }, [selectedSeason, currentUser]);

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

  const getAccuracyBorder = (accuracy) => {
    if (accuracy >= 98) return 'acc-badge-purple';
    if (accuracy >= 95) return 'acc-badge-green';
    if (accuracy >= 90) return 'acc-badge-blue';
    if (accuracy >= 85) return 'acc-badge-yellow';
    return 'acc-badge-red';
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        {/* User Stats Loading Skeleton */}
        <div className="glass-1 rounded-2xl p-6">
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
        <div className="glass-1 rounded-2xl p-12">
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
      <div className="glass-1 rounded-3xl p-12 text-center">
        <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4" />
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
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white text-shadow-adaptive mb-4 flex items-center gap-2">
            <User className="w-7 h-7 icon-shadow-adaptive-sm" />
            Your Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-1 rounded-xl p-4 text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all performance-card-purple">
              <p className="text-xs text-white/90 font-medium mb-2 uppercase tracking-wide text-shadow-adaptive">Your Rank</p>
              <p className="text-3xl font-black text-transparent bg-clip-text" style={{backgroundImage: 'linear-gradient(to right, #c084fc, #f0abfc)'}}>
                #{userPosition.user_position}
              </p>
            </div>
            <div className="glass-1 rounded-xl p-4 text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all performance-card-green">
              <p className="text-xs text-white/90 font-medium mb-2 uppercase tracking-wide text-shadow-adaptive">Total Score</p>
              <p className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent drop-shadow-lg tracking-tight text-glow-green">
                {formatNumber(userPosition.total_score)}
              </p>
            </div>
            <div className="glass-1 rounded-xl p-4 text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all performance-card-orange">
              <p className="text-xs text-white/90 font-medium mb-2 uppercase tracking-wide text-shadow-adaptive">Challenges</p>
              <p className="text-3xl font-black text-transparent bg-clip-text" style={{backgroundImage: 'linear-gradient(to right, #f3eba4, #f3eba4)'}}>
                {userPosition.challenges_participated}
              </p>
            </div>
            <div className="glass-1 rounded-xl p-4 text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all performance-card-blue">
              <p className="text-xs text-white/90 font-medium mb-2 uppercase tracking-wide text-shadow-adaptive">Top</p>
              <p className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg tracking-tight text-glow-blue">
                {Math.max(1, Math.round(100 - userPosition.percentile))}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Container */}
      <div>
        <div className="glass-1 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Card */}
          <div className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3 text-shadow-adaptive">
                  <Trophy className="w-8 h-8 text-white icon-shadow-adaptive" />
                  Season Rankings
                </h2>
                {selectedSeason && (
                  <p className="text-white/90 mt-1 text-shadow-adaptive-sm">
                    {selectedSeason.name} • {leaderboard.length} participants shown
                    {hasMore && ' (more available)'}
                  </p>
                )}
              </div>
              
              {/* View Mode Slider */}
              {currentUser && (
                <div className="view-mode-slider">
                  <div className="slider-track">
                    <div className={`slider-thumb ${viewMode === 'context' ? 'slider-thumb-right' : ''}`} />
                    <button
                      onClick={() => handleViewModeChange('full')}
                      className={`slider-option ${viewMode === 'full' ? 'slider-option-active' : ''}`}
                    >
                      Full Rankings
                    </button>
                    <button
                      onClick={() => handleViewModeChange('context')}
                      className={`slider-option ${viewMode === 'context' ? 'slider-option-active' : ''}`}
                    >
                      Around Me
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Podium Section for Top 3 */}
          {leaderboard.length >= 3 && viewMode === 'full' && !leaderboardLoading && (
            <div className="podium-glass-2-bg p-8 border-t border-white/10">
              <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
                {/* 2nd Place */}
                {leaderboard[1] && (
                  <div className="order-1 md:order-1">
                    <div className="podium-bg-purple rounded-2xl p-6 text-center transform hover:scale-105 transition-all shadow-lg podium-border-purple">
                      <div className="w-20 h-20 mx-auto mb-3 relative">
                        <img
                          src={leaderboard[1].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[1].username}
                          className="w-full h-full rounded-full border-4 border-white shadow-lg cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[1].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-purple-700 text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                          2nd
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-shadow-adaptive truncate cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push(`/profile/${leaderboard[1].user_id}`)}>{leaderboard[1].username}</h3>
                      <p className="text-2xl font-black text-white text-shadow-adaptive mt-2">{formatNumber(leaderboard[1].total_score)}</p>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {leaderboard[0] && (
                  <div className="order-2 md:order-2">
                    <div className="podium-bg-blue rounded-2xl p-6 text-center transform hover:scale-105 transition-all relative shadow-xl podium-border-blue">
                      <Crown className="absolute top-2 right-2 w-6 h-6 text-white icon-shadow-adaptive" />
                      <div className="w-24 h-24 mx-auto mb-3 relative">
                        <img
                          src={leaderboard[0].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[0].username}
                          className="w-full h-full rounded-full border-4 border-white shadow-xl cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[0].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-blue-700 text-sm px-3 py-1 rounded-full font-bold shadow-lg">
                          1st
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-shadow-adaptive text-lg truncate cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push(`/profile/${leaderboard[0].user_id}`)}>{leaderboard[0].username}</h3>
                      <p className="text-3xl font-black text-white text-shadow-adaptive mt-2">
                        {formatNumber(leaderboard[0].total_score)}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard[2] && (
                  <div className="order-3 md:order-3">
                    <div className="podium-bg-red rounded-2xl p-6 text-center transform hover:scale-105 transition-all shadow-lg podium-border-red">
                      <div className="w-20 h-20 mx-auto mb-3 relative">
                        <img
                          src={leaderboard[2].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[2].username}
                          className="w-full h-full rounded-full border-4 border-white shadow-lg cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[2].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-red-700 text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                          3rd
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-shadow-adaptive truncate cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push(`/profile/${leaderboard[2].user_id}`)}>{leaderboard[2].username}</h3>
                      <p className="text-2xl font-black text-white text-shadow-adaptive mt-2">{formatNumber(leaderboard[2].total_score)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Main Leaderboard */}
          <div className="shadow-xl overflow-hidden">
            {leaderboardLoading ? (
              <div className="p-8">
                <div className="animate-pulse space-y-4">
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
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-white/70 text-shadow-adaptive-sm">No participants found for this season.</p>
              </div>
            ) : (
              leaderboard.slice(viewMode === 'full' ? 3 : 0).map((user, index) => {
                const position = user.user_position || user.position;
                const isCurrentUser = currentUser && user.user_id === currentUser.id;
                const isTop10 = position <= 10;
                
                return (
                  <div
                    key={user.user_id}
                    className={`group px-6 py-4 transition-all border-b border-white/10 last:border-b-0 ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-l-4 border-purple-400 -ml-1' 
                        : user.is_target_user
                        ? 'bg-yellow-500/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`text-center min-w-[3rem] ${isTop10 ? 'font-black text-2xl' : 'font-bold text-lg'} text-white text-shadow-adaptive`}>
                        {position}
                      </div>

                      {/* Player Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <img
                            src={user.avatar_url || '/default-avatar.png'}
                            alt={user.username}
                            className={`${isTop10 ? 'w-12 h-12' : 'w-10 h-10'} rounded-full avatar-border shadow-md group-hover:shadow-lg transition-shadow`}
                            onError={(e) => { e.target.src = '/default-avatar.png'; }}
                          />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/profile/${user.user_id}`)}
                              className="font-semibold text-white text-shadow-adaptive hover:text-purple-300 transition-colors truncate"
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
                              <span className="px-2 py-0.5 bg-purple-600/80 text-white text-xs rounded-full font-medium">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-white/90 mt-0.5 text-shadow-adaptive-sm">
                            <span>{user.challenges_participated} challenges</span>
                            {user.percentile >= 95 && (
                              <span className="text-purple-300 font-medium">Top {Math.max(1, Math.round(100 - Math.floor(user.percentile)))}%</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6">
                        {/* Accuracy Badge */}
                        <div className={`w-[72px] py-1.5 bg-gradient-to-r ${getAccuracyGradient(user.average_accuracy)} ${getAccuracyBorder(user.average_accuracy)} text-white rounded-full font-bold text-sm shadow-md flex items-center justify-center`}>
                          {user.average_accuracy?.toFixed(1)}%
                        </div>

                        {/* Score */}
                        <div className="text-right min-w-[100px]">
                          <p className={`${isTop10 ? 'text-2xl' : 'text-xl'} font-black text-white text-shadow-adaptive`}>
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
          {viewMode === 'full' && hasMore && !leaderboardLoading && (
            <div className="p-6 text-center border-t border-white/20">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={`px-8 py-3 rounded-xl font-semibold transform transition-all ${
                  loadingMore
                    ? 'glass-2 text-white/50 cursor-not-allowed'
                    : 'btn-secondary hover:scale-105'
                }`}
              >
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-shadow-adaptive-sm">Loading...</span>
                  </div>
                ) : (
                  <span className="text-shadow-adaptive-sm">Load More Players (+{pageSize})</span>
                )}
              </button>
            </div>
          )}

          {/* End of results indicator */}
          {viewMode === 'full' && !hasMore && leaderboard.length > 50 && !leaderboardLoading && (
            <div className="p-6 text-center border-t border-white/20">
              <div className="flex items-center justify-center gap-2 text-white/90">
                <Trophy className="w-4 h-4 icon-shadow-adaptive-sm" />
                <span className="text-sm font-medium text-shadow-adaptive-sm">You've reached the end of the leaderboard!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonLeaderboard;