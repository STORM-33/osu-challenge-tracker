import { Trophy, Award, Target, Activity, Crown, Star, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// Utility function to sanitize user input
const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>&"']/g, (match) => {
    const escapeMap = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return escapeMap[match];
  });
};

// Helper function to get country flag URL from flagcdn.com
const getCountryFlagUrl = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return null;
  return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
};

export default function CombinedLeaderboard({ leaderboard = [], loading = false, totalMaps = 0 }) {
  const [sortBy, setSortBy] = useState('total_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showMobileView, setShowMobileView] = useState(false);
  const router = useRouter();

  // Check if mobile view should be used
  useEffect(() => {
    const checkMobile = () => {
      setShowMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-400 mx-auto mb-3 sm:mb-4"></div>
        <span className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">Loading combined leaderboard...</span>
      </div>
    );
  }

  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <Trophy className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-white/30 icon-shadow-adaptive" />
        <p className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">No combined scores available yet.</p>
      </div>
    );
  }

  const formatScore = (score) => {
    if (typeof score !== 'number' || isNaN(score)) return '0';
    if (score >= 1000000) return (score / 1000000).toFixed(1) + 'M';
    if (score >= 1000) return (score / 1000).toFixed(1) + 'K';
    return score.toLocaleString();
  };

  const formatAccuracy = (accuracy) => {
    if (typeof accuracy !== 'number' || isNaN(accuracy)) return '0.00';
    return Math.max(0, Math.min(100, accuracy)).toFixed(2);
  };

  const formatCombo = (combo) => {
    if (typeof combo !== 'number' || isNaN(combo)) return '0';
    return Math.max(0, combo);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'player' ? 'asc' : 'desc');
    }
  };

  // Handle clicking on a username to go to their profile
  const handleUsernameClick = (player) => {
    if (!player || !player.user_id) {
      console.warn('No user ID found for player:', player);
      return;
    }
    
    router.push(`/profile/${player.user_id}`);
  };

  // Sort leaderboard based on current sort settings
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'total_score':
        aVal = a.total_score || 0;
        bVal = b.total_score || 0;
        break;
      case 'average_accuracy':
        aVal = a.average_accuracy || 0;
        bVal = b.average_accuracy || 0;
        break;
      case 'best_combo':
        aVal = a.best_combo || 0;
        bVal = b.best_combo || 0;
        break;
      case 'maps_played':
        aVal = a.maps_played || 0;
        bVal = b.maps_played || 0;
        break;
      case 'player':
        aVal = (a.username || '').toLowerCase();
        bVal = (b.username || '').toLowerCase();
        break;
      default:
        aVal = a.total_score || 0;
        bVal = b.total_score || 0;
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const SortButton = ({ column, children, align = 'left' }) => (
    <button
      onClick={() => handleSort(column)}
      className={`flex items-center gap-1 hover:text-purple-300 transition-colors font-medium w-full text-shadow-adaptive-sm ${
        align === 'right' ? 'justify-end' : 
        align === 'center' ? 'justify-center' : 
        'justify-start'
      }`}
      aria-label={`Sort by ${column}`}
    >
      {children}
      {sortBy === column && (
        <span className="text-xs text-purple-300">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  const getAccuracyGradient = (accuracy) => {
    if (accuracy >= 98) return 'from-pink-500 to-purple-500';
    if (accuracy >= 95) return 'from-green-500 to-emerald-500';
    if (accuracy >= 90) return 'from-cyan-500 to-blue-500';
    if (accuracy >= 85) return 'from-yellow-500 to-orange-500';
    return 'from-pink-500 to-red-500';
  };

  const getAccuracyBorder = (accuracy) => {
    if (accuracy >= 98) return 'acc-badge-purple';
    if (accuracy >= 95) return 'acc-badge-green';
    if (accuracy >= 90) return 'acc-badge-blue';
    if (accuracy >= 85) return 'acc-badge-yellow';
    return 'acc-badge-red';
  };

  const getRankGradient = (rank) => {
    if (rank === 1) return 'from-blue-400 to-blue-600';      // 7★
    if (rank === 2) return 'from-purple-400 to-purple-600';  // 6★
    if (rank === 3) return 'from-red-400 to-red-600';        // 5★
    if (rank <= 10) return 'from-orange-400 to-red-500';
    return 'from-gray-400 to-gray-600';
  };

  const getParticipationGradient = (mapsPlayed) => {
    const percentage = (mapsPlayed / totalMaps) * 100;
    if (percentage === 100) return 'from-pink-500 to-purple-500';
    if (percentage >= 80) return 'from-green-500 to-emerald-500';
    if (percentage >= 60) return 'from-cyan-500 to-blue-500';
    if (percentage >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-pink-500 to-red-500';
  };

  const getParticipationBorder = (mapsPlayed) => {
    const percentage = (mapsPlayed / totalMaps) * 100;
    if (percentage === 100) return 'acc-badge-purple';
    if (percentage >= 80) return 'acc-badge-green';
    if (percentage >= 60) return 'acc-badge-blue';
    if (percentage >= 40) return 'acc-badge-yellow';
    return 'acc-badge-red';
  };

  // Mobile Card View
  if (showMobileView) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {/* Top 3 Podium Cards for Mobile */}
        {sortedLeaderboard.slice(0, 3).length >= 3 && (
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-white/90 mb-3 sm:mb-4 text-center text-shadow-adaptive flex items-center justify-center gap-2">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 icon-shadow-adaptive" />
              Top 3 Winners
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {sortedLeaderboard.slice(0, 3).map((player, index) => {
                const rank = index + 1;
                const username = sanitizeText(player.username || 'Unknown');
                const country = sanitizeText(player.country || '');
                const bgGradient = rank === 1 ? 'podium-bg-blue' : rank === 2 ? 'podium-bg-purple' : 'podium-bg-red';
                const borderClass = rank === 1 ? 'podium-border-blue' : rank === 2 ? 'podium-border-purple' : 'podium-border-red';
                
                return (
                  <div 
                    key={player.user_id || index}
                    className={`${bgGradient} ${borderClass} rounded-xl sm:rounded-2xl p-3 sm:p-4 transform hover:scale-[1.02] transition-all`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Rank Badge */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-b ${getRankGradient(rank)} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <span className="text-white font-black text-xs sm:text-sm text-shadow-adaptive">
                          #{rank}
                        </span>
                      </div>
                      
                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2">
                          {player.avatar_url && (
                            <img 
                              src={player.avatar_url} 
                              alt={`${username}'s avatar`}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full avatar-border flex-shrink-0"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <button 
                            className="font-bold text-white hover:text-white/80 transition-colors text-shadow-adaptive truncate text-left text-sm sm:text-base" 
                            onClick={() => handleUsernameClick(player)}
                          >
                            {username}
                          </button>
                          {country && getCountryFlagUrl(country) && (
                            <img 
                              src={getCountryFlagUrl(country)} 
                              alt={`${country} flag`}
                              className="w-4 h-3 sm:w-5 sm:h-3 object-cover rounded-sm shadow-sm flex-shrink-0"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          {rank === 1 && (
                            <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-300 icon-shadow-adaptive" />
                          )}
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div>
                            <span className="text-white/80 text-shadow-adaptive-sm">Total Score:</span>
                            <div className="font-mono font-bold text-white text-glow-blue text-shadow-adaptive">
                              {formatScore(player.total_score)}
                            </div>
                          </div>
                          <div>
                            <span className="text-white/80 text-shadow-adaptive-sm">Avg Accuracy:</span>
                            <div className={`inline-flex px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gradient-to-b ${getAccuracyGradient(player.average_accuracy)} ${getAccuracyBorder(player.average_accuracy)} text-white rounded-full font-bold text-xs shadow-md mt-0.5 sm:mt-1`}>
                              {formatAccuracy(player.average_accuracy)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-white/80 text-shadow-adaptive-sm">Best Combo:</span>
                            <div className="font-mono text-white font-bold text-glow-green text-shadow-adaptive">
                              {formatCombo(player.best_combo)}x
                            </div>
                          </div>
                          <div>
                            <span className="text-white/80 text-shadow-adaptive-sm">Maps Played:</span>
                            <div className={`inline-flex px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gradient-to-b ${getParticipationGradient(player.maps_played)} ${getParticipationBorder(player.maps_played)} text-white rounded-full font-bold text-xs shadow-md mt-0.5 sm:mt-1`}>
                              {player.maps_played}/{totalMaps}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Remaining Players */}
        <div className="space-y-2 sm:space-y-3">
          {sortedLeaderboard.slice(3).map((player, index) => {
            const rank = index + 4;
            const username = sanitizeText(player.username || 'Unknown');
            const country = sanitizeText(player.country || '');
            
            return (
              <div 
                key={player.user_id || index}
                className="p-3 sm:p-4 transition-all rounded-lg sm:rounded-xl border border-white/10 hover:bg-white/5"
              >
                <div className="flex items-start gap-3">
                  {/* Rank Badge */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl glass-2 flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white/90 font-bold text-xs sm:text-sm text-shadow-adaptive">
                      #{rank}
                    </span>
                  </div>
                  
                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      {player.avatar_url && (
                        <img 
                          src={player.avatar_url} 
                          alt={`${username}'s avatar`}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full avatar-border flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <button 
                        className="font-bold text-white hover:text-purple-300 transition-colors text-shadow-adaptive truncate text-left text-sm" 
                        onClick={() => handleUsernameClick(player)}
                      >
                        {username}
                      </button>
                      {country && getCountryFlagUrl(country) && (
                        <img 
                          src={getCountryFlagUrl(country)} 
                          alt={`${country} flag`}
                          className="w-4 h-3 sm:w-5 sm:h-3 object-cover rounded-sm shadow-sm flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs">
                      <div>
                        <span className="text-white/70 text-shadow-adaptive-sm">Score:</span>
                        <div className="font-mono font-bold text-white text-shadow-adaptive">
                          {formatScore(player.total_score)}
                        </div>
                      </div>
                      <div>
                        <span className="text-white/70 text-shadow-adaptive-sm">Accuracy:</span>
                        <div className={`inline-flex px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gradient-to-b ${getAccuracyGradient(player.average_accuracy)} ${getAccuracyBorder(player.average_accuracy)} text-white rounded-full font-bold text-xs shadow-md mt-0.5`}>
                          {formatAccuracy(player.average_accuracy)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-white/70 text-shadow-adaptive-sm">Combo:</span>
                        <div className="font-mono text-white font-bold text-shadow-adaptive">
                          {formatCombo(player.best_combo)}x
                        </div>
                      </div>
                      <div>
                        <span className="text-white/70 text-shadow-adaptive-sm">Maps:</span>
                        <div className="text-white/90 font-medium text-shadow-adaptive">
                          {player.maps_played}/{totalMaps}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Table View - No glass wrapping, integrated into parent
  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table" aria-label="Combined score leaderboard">
        <thead>
          <tr className="border-b border-white/20">
            <th className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white/90 text-left text-shadow-adaptive-sm">
              Rank
            </th>
            <th className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white/90 text-left text-shadow-adaptive-sm">
              <SortButton column="player" align="left">Player</SortButton>
            </th>
            <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white/90 text-center text-shadow-adaptive-sm">
              <SortButton column="total_score" align="center">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 icon-shadow-adaptive-sm" />
                Total Score
              </SortButton>
            </th>
            <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white/90 text-center text-shadow-adaptive-sm">
              <SortButton column="average_accuracy" align="center">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 icon-shadow-adaptive-sm" />
                Avg Accuracy
              </SortButton>
            </th>
            <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white/90 text-center text-shadow-adaptive-sm">
              <SortButton column="best_combo" align="center">
                <Award className="w-3 h-3 sm:w-4 sm:h-4 icon-shadow-adaptive-sm" />
                Best Combo
              </SortButton>
            </th>
            <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white/90 text-center text-shadow-adaptive-sm">
              <SortButton column="maps_played" align="center">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 icon-shadow-adaptive-sm" />
                Maps
              </SortButton>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedLeaderboard.map((player, index) => {
            const rank = index + 1;
            const username = sanitizeText(player.username || 'Unknown');
            const country = sanitizeText(player.country || '');
            const isTop3 = rank <= 3;
            
            return (
              <tr 
                key={player.user_id || index}
                className={`transition-all border-b border-white/10 last:border-b-0 hover:bg-white/5 ${
                  isTop3 ? 'bg-white/5' : ''
                }`}
                role="row"
              >
                <td className="py-3 sm:py-4 px-3 sm:px-4" role="cell">
                  <div className="flex items-center justify-start gap-1">
                    {isTop3 ? (
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-b ${getRankGradient(rank)} flex items-center justify-center shadow-lg`}>
                        <span className="text-white font-black text-xs sm:text-sm text-shadow-adaptive">
                          #{rank}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-lg font-bold text-white/90 text-shadow-adaptive">
                        #{rank}
                      </span>
                    )}
                    {rank === 1 && (
                      <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 ml-2 icon-shadow-adaptive" />
                    )}
                  </div>
                </td>
                <td className="py-3 sm:py-4 px-3 sm:px-4" role="cell">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {player.avatar_url && (
                      <img 
                        src={player.avatar_url} 
                        alt={`${username}'s avatar`}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full avatar-border flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <button 
                        className="font-bold text-white hover:text-purple-300 transition-colors text-shadow-adaptive truncate text-sm sm:text-lg text-left" 
                        onClick={() => handleUsernameClick(player)}
                      >
                        {username}
                      </button>
                      {country && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {getCountryFlagUrl(country) && (
                            <img 
                              src={getCountryFlagUrl(country)} 
                              alt={`${country} flag`}
                              className="w-4 h-3 sm:w-5 sm:h-3.5 object-cover rounded-sm shadow-sm"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <span className="text-xs text-white/70 font-medium text-shadow-adaptive-sm">
                            {country.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 sm:py-4 px-4 sm:px-6 text-center" role="cell">
                  <span className="font-mono font-black text-white text-base sm:text-xl text-glow-blue text-shadow-adaptive">
                    {formatScore(player.total_score)}
                  </span>
                </td>
                <td className="py-3 sm:py-4 px-4 sm:px-6 text-center" role="cell">
                  <div className={`inline-flex px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-b ${getAccuracyGradient(player.average_accuracy)} ${getAccuracyBorder(player.average_accuracy)} text-white rounded-full font-bold text-xs sm:text-sm shadow-md`}>
                    {formatAccuracy(player.average_accuracy)}%
                  </div>
                </td>
                <td className="py-3 sm:py-4 px-4 sm:px-6 text-center" role="cell">
                  <span className="font-mono text-white font-bold text-base sm:text-lg text-glow-green text-shadow-adaptive">
                    {formatCombo(player.best_combo)}x
                  </span>
                </td>
                <td className="py-3 sm:py-4 px-4 sm:px-6 text-center" role="cell">
                  <div className={`inline-flex px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-b ${getParticipationGradient(player.maps_played)} ${getParticipationBorder(player.maps_played)} text-white rounded-full font-bold text-xs sm:text-sm shadow-md`}>
                    {player.maps_played}/{totalMaps}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}