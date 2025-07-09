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
  const [viewMode, setViewMode] = useState('full');
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [pageSize] = useState(50);
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
        if (isLoadMore) {
          params.append('limit', pageSize.toString());
          params.append('offset', currentOffset.toString());
        } else {
          params.append('limit', '100');
          params.append('offset', '0');
        }
      }

      const response = await fetch(`/api/seasons/leaderboard?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      if (isLoadMore) {
        setLeaderboard(prev => [...prev, ...data.leaderboard]);
        setCurrentOffset(prev => prev + pageSize);
      } else {
        setLeaderboard(data.leaderboard);
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
      <div className="space-y-4 sm:space-y-6">
        {/* User Stats Loading Skeleton - Mobile Compact */}
        <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="animate-pulse">
            <div className="h-4 sm:h-6 bg-gray-200/60 rounded w-24 sm:w-32 mb-3 sm:mb-4"></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 sm:h-20 bg-gray-200/60 rounded-lg sm:rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Leaderboard Loading Skeleton - Mobile Compact */}
        <div className="glass-1 rounded-xl sm:rounded-2xl p-4 sm:p-12">
          <div className="animate-pulse space-y-3 sm:space-y-4">
            <div className="h-6 sm:h-8 bg-gray-200/60 rounded-lg w-1/2 sm:w-1/3"></div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200/60 rounded-full"></div>
                <div className="flex-1 space-y-1 sm:space-y-2">
                  <div className="h-3 sm:h-4 bg-gray-200/60 rounded w-1/3 sm:w-1/4"></div>
                  <div className="h-2 sm:h-3 bg-gray-200/60 rounded w-1/4 sm:w-1/6"></div>
                </div>
                <div className="h-4 sm:h-6 bg-gray-200/60 rounded w-16 sm:w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-1 rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center">
        <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
        <p className="text-red-600 mb-3 sm:mb-4 text-sm sm:text-base">Error loading leaderboard: {error}</p>
        <button 
          onClick={() => fetchLeaderboard()}
          className="px-4 py-2 sm:px-6 sm:py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm sm:text-base"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* User Performance Panel - Mobile Compact */}
      {userPosition && (
        <div className="mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-2xl font-bold text-white text-shadow-adaptive mb-3 sm:mb-4 flex items-center gap-2">
            <User className="w-5 h-5 sm:w-7 sm:h-7 icon-shadow-adaptive-sm" />
            Your Performance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all performance-card-purple">
              <p className="text-xs text-white/90 font-medium mb-1 sm:mb-2 uppercase tracking-wide text-shadow-adaptive">Your Rank</p>
              <p className="text-xl sm:text-3xl font-black bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent drop-shadow-lg tracking-tight text-glow-purple">
                #{userPosition.user_position}
              </p>
            </div>
            <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all performance-card-green">
              <p className="text-xs text-white/90 font-medium mb-1 sm:mb-2 uppercase tracking-wide text-shadow-adaptive">Total Score</p>
              <p className="text-xl sm:text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent drop-shadow-lg tracking-tight text-glow-green">
                {formatNumber(userPosition.total_score)}
              </p>
            </div>
            <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all performance-card-orange">
              <p className="text-xs text-white/90 font-medium mb-1 sm:mb-2 uppercase tracking-wide text-shadow-adaptive">Challenges</p>
              <p className="text-xl sm:text-3xl font-black bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg tracking-tight text-glow-orange">
                {userPosition.challenges_participated}
              </p>
            </div>
            <div className="glass-1 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all performance-card-blue">
              <p className="text-xs text-white/90 font-medium mb-1 sm:mb-2 uppercase tracking-wide text-shadow-adaptive">Top</p>
              <p className="text-xl sm:text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg tracking-tight text-glow-blue">
                {Math.max(1, Math.round(100 - userPosition.percentile))}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Container - Mobile Optimized */}
      <div>
        <div className="glass-1 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
          {/* Header Card - Mobile Compact */}
          <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3 text-shadow-adaptive">
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white icon-shadow-adaptive" />
                  Season Rankings
                </h2>
                {selectedSeason && (
                  <p className="text-white/90 mt-1 text-shadow-adaptive-sm text-sm sm:text-base">
                    {selectedSeason.name} • {leaderboard.length} participants shown
                    {hasMore && ' (more available)'}
                  </p>
                )}
              </div>
              
              {/* View Mode Slider - Mobile Adapted */}
              {currentUser && (
                <div className="view-mode-slider text-sm sm:text-base">
                  <div className="slider-track">
                    <div className={`slider-thumb ${viewMode === 'context' ? 'slider-thumb-right' : ''}`} />
                    <button
                      onClick={() => handleViewModeChange('full')}
                      className={`slider-option ${viewMode === 'full' ? 'slider-option-active' : ''}`}
                    >
                      <span className="hidden sm:inline">Full Rankings</span>
                      <span className="sm:hidden">Full</span>
                    </button>
                    <button
                      onClick={() => handleViewModeChange('context')}
                      className={`slider-option ${viewMode === 'context' ? 'slider-option-active' : ''}`}
                    >
                      <span className="hidden sm:inline">Around Me</span>
                      <span className="sm:hidden">Around Me</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Podium Section for Top 3 - Mobile Optimized */}
          {leaderboard.length >= 3 && viewMode === 'full' && !leaderboardLoading && (
            <div className="podium-glass-2-bg p-4 sm:p-8 border-t border-white/10">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto">
                {/* 2nd Place */}
                {leaderboard[1] && (
                  <div className="order-1 md:order-1">
                    <div className="podium-bg-purple rounded-lg sm:rounded-2xl p-3 sm:p-6 text-center transform hover:scale-105 transition-all shadow-lg podium-border-purple">
                      <div className="w-12 h-12 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-3 relative">
                        <img
                          src={leaderboard[1].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[1].username}
                          className="w-full h-full rounded-full border-2 sm:border-4 border-white shadow-lg cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[1].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-purple-700 text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold shadow-lg">
                          2nd
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-shadow-adaptive text-xs sm:text-base truncate cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push(`/profile/${leaderboard[1].user_id}`)}>{leaderboard[1].username}</h3>
                      <p className="text-sm sm:text-2xl font-black text-white text-shadow-adaptive mt-1 sm:mt-2">{formatNumber(leaderboard[1].total_score)}</p>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {leaderboard[0] && (
                  <div className="order-2 md:order-2">
                    <div className="podium-bg-blue rounded-lg sm:rounded-2xl p-3 sm:p-6 text-center transform hover:scale-105 transition-all relative shadow-xl podium-border-blue">
                      <Crown className="absolute top-1 right-1 sm:top-2 sm:right-2 w-4 h-4 sm:w-6 sm:h-6 text-white icon-shadow-adaptive" />
                      <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 relative">
                        <img
                          src={leaderboard[0].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[0].username}
                          className="w-full h-full rounded-full border-2 sm:border-4 border-white shadow-xl cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[0].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-blue-700 text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold shadow-lg">
                          1st
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-shadow-adaptive text-sm sm:text-lg truncate cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push(`/profile/${leaderboard[0].user_id}`)}>{leaderboard[0].username}</h3>
                      <p className="text-lg sm:text-3xl font-black text-white text-shadow-adaptive mt-1 sm:mt-2">
                        {formatNumber(leaderboard[0].total_score)}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard[2] && (
                  <div className="order-3 md:order-3">
                    <div className="podium-bg-red rounded-lg sm:rounded-2xl p-3 sm:p-6 text-center transform hover:scale-105 transition-all shadow-lg podium-border-red">
                      <div className="w-12 h-12 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-3 relative">
                        <img
                          src={leaderboard[2].avatar_url || '/default-avatar.png'}
                          alt={leaderboard[2].username}
                          className="w-full h-full rounded-full border-2 sm:border-4 border-white shadow-lg cursor-pointer"
                          onClick={() => router.push(`/profile/${leaderboard[2].user_id}`)}
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-red-700 text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold shadow-lg">
                          3rd
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-shadow-adaptive text-xs sm:text-base truncate cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push(`/profile/${leaderboard[2].user_id}`)}>{leaderboard[2].username}</h3>
                      <p className="text-sm sm:text-2xl font-black text-white text-shadow-adaptive mt-1 sm:mt-2">{formatNumber(leaderboard[2].total_score)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Main Leaderboard - Mobile Optimized */}
          <div className="shadow-xl overflow-hidden">
            {leaderboardLoading ? (
              <div className="p-4 sm:p-8">
                <div className="animate-pulse space-y-3 sm:space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200/60 rounded-full"></div>
                      <div className="flex-1 space-y-1 sm:space-y-2">
                        <div className="h-3 sm:h-4 bg-gray-200/60 rounded w-1/3 sm:w-1/4"></div>
                        <div className="h-2 sm:h-3 bg-gray-200/60 rounded w-1/4 sm:w-1/6"></div>
                      </div>
                      <div className="h-4 sm:h-6 bg-gray-200/60 rounded w-16 sm:w-24"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white/50 mx-auto mb-3 sm:mb-4" />
                <p className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">No participants found for this season.</p>
              </div>
            ) : (
              leaderboard.slice(viewMode === 'full' ? 3 : 0).map((user, index) => {
                const position = user.user_position || user.position;
                const isCurrentUser = currentUser && user.user_id === currentUser.id;
                const isTop10 = position <= 10;
                
                return (
                  <div
                    key={user.user_id}
                    className={`group px-3 sm:px-6 py-3 sm:py-4 transition-all border-b border-white/10 last:border-b-0 ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-l-4 border-purple-400 -ml-1' 
                        : user.is_target_user
                        ? 'bg-yellow-500/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-4">
                      {/* Rank - Mobile Compact */}
                      <div className={`text-center min-w-[2rem] sm:min-w-[3rem] ${isTop10 ? 'font-black text-lg sm:text-2xl' : 'font-bold text-base sm:text-lg'} text-white text-shadow-adaptive`}>
                        {position}
                      </div>

                      {/* Player Info - Mobile Optimized */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <img
                            src={user.avatar_url || '/default-avatar.png'}
                            alt={user.username}
                            className={`${isTop10 ? 'w-8 h-8 sm:w-12 sm:h-12' : 'w-7 h-7 sm:w-10 sm:h-10'} rounded-full avatar-border shadow-md group-hover:shadow-lg transition-shadow`}
                            onError={(e) => { e.target.src = '/default-avatar.png'; }}
                          />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              onClick={() => router.push(`/profile/${user.user_id}`)}
                              className="font-semibold text-white text-shadow-adaptive hover:text-purple-300 transition-colors truncate text-sm sm:text-base"
                            >
                              {user.username}
                            </button>
                            {user.country && (
                              <img 
                                src={`https://flagcdn.com/w20/${user.country.toLowerCase()}.png`}
                                alt={user.country}
                                className="w-4 h-3 sm:w-5 sm:h-3 rounded-sm shadow-sm"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.5 sm:px-2 bg-purple-600/80 text-white text-xs rounded-full font-medium">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-white/90 mt-0.5 text-shadow-adaptive-sm">
                            <span>{user.challenges_participated} challenges</span>
                            {user.percentile >= 95 && (
                              <span className="text-purple-300 font-medium hidden sm:inline">Top {Math.max(1, Math.round(100 - Math.floor(user.percentile)))}%</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats - Mobile Compact */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-6">
                        {/* Accuracy Badge - Hidden on very small screens, shown on sm+ */}
                        <div className={`hidden sm:flex w-[60px] sm:w-[72px] py-1 sm:py-1.5 bg-gradient-to-r ${getAccuracyGradient(user.average_accuracy)} ${getAccuracyBorder(user.average_accuracy)} text-white rounded-full font-bold text-xs sm:text-sm shadow-md items-center justify-center`}>
                          {user.average_accuracy?.toFixed(1)}%
                        </div>

                        {/* Score */}
                        <div className="text-right min-w-[60px] sm:min-w-[100px]">
                          <p className={`${isTop10 ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl'} font-black text-white text-shadow-adaptive`}>
                            {formatNumber(user.total_score)}
                          </p>
                          {/* Show accuracy on mobile below score */}
                          <p className="text-xs text-white/70 sm:hidden">
                            {user.average_accuracy?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Load More Button - Mobile Optimized */}
          {viewMode === 'full' && hasMore && !leaderboardLoading && (
            <div className="p-4 sm:p-6 text-center border-t border-white/20">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold transform transition-all text-sm sm:text-base ${
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
                  <span className="text-shadow-adaptive-sm">
                    <span className="hidden sm:inline">Load More Players (+{pageSize})</span>
                    <span className="sm:hidden">Load More (+{pageSize})</span>
                  </span>
                )}
              </button>
            </div>
          )}

          {/* End of results indicator - Mobile Optimized */}
          {viewMode === 'full' && !hasMore && leaderboard.length > 50 && !leaderboardLoading && (
            <div className="p-4 sm:p-6 text-center border-t border-white/20">
              <div className="flex items-center justify-center gap-2 text-white/90">
                <Trophy className="w-4 h-4 icon-shadow-adaptive-sm" />
                <span className="text-xs sm:text-sm font-medium text-shadow-adaptive-sm">You've reached the end!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonLeaderboard;