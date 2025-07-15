import { Trophy, Target, ChevronDown, Users } from 'lucide-react';
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

export default function ScoreTable({ scores = [], loading = false, challenge = null }) {
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');
  const [winnerInfo, setWinnerInfo] = useState(null);
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

  // Load winner information for this challenge
  useEffect(() => {
    if (challenge?.has_ruleset && challenge?.id) {
      loadWinnerInfo();
    }
  }, [challenge?.id, challenge?.has_ruleset]);

  const loadWinnerInfo = async () => {
    if (!challenge?.id) return;
    
    try {
      const response = await fetch(`/api/admin/rulesets/${challenge.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setWinnerInfo(data.winner);
      }
    } catch (error) {
      console.warn('Failed to load winner info:', error);
    }
  };

  // Check if a score is the ruleset winner
  const isRulesetWinner = (score) => {
    return winnerInfo && winnerInfo.score_id === score.id;
  };

  if (loading) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-400 mx-auto mb-3 sm:mb-4"></div>
        <span className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">Loading scores...</span>
      </div>
    );
  }

  if (!Array.isArray(scores) || scores.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <Trophy className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-white/30 icon-shadow-adaptive" />
        <p className="text-white/70 text-shadow-adaptive-sm text-sm sm:text-base">No scores available yet.</p>
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
      setSortOrder('asc');
    }
  };

  // Handle clicking on a username to go to their profile
  const handleUsernameClick = (user) => {
    if (!user) return;
    
    const userId = user.id || user.user_id;
    
    if (userId) {
      router.push(`/profile/${userId}`);
    } else {
      console.warn('No user ID found for user:', user);
    }
  };

  // Add original rank based on score to each score object
  const scoresWithRank = scores.map((score, index) => ({
    ...score,
    originalRank: index + 1
  }));

  // Sort scores based on current sort settings
  const sortedScores = [...scoresWithRank].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'score':
        aVal = a.score || 0;
        bVal = b.score || 0;
        break;
      case 'accuracy':
        aVal = a.accuracy || 0;
        bVal = b.accuracy || 0;
        break;
      case 'combo':
        aVal = a.max_combo || 0;
        bVal = b.max_combo || 0;
        break;
      case 'player':
        aVal = (a.users?.username || '').toLowerCase();
        bVal = (b.users?.username || '').toLowerCase();
        break;
      default: // rank
        return a.originalRank - b.originalRank;
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

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

  const getRankGradient = (rank) => {
    if (rank === 1) return 'from-blue-400 to-blue-600';      // 7★
    if (rank === 2) return 'from-purple-400 to-purple-600';  // 6★  
    if (rank === 3) return 'from-red-400 to-red-600';        // 5★
    if (rank <= 10) return 'from-orange-400 to-red-500';
    return 'from-gray-400 to-gray-600';
  };

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

  // Mobile Card View
  if (showMobileView) {
    return (
      <div className="space-y-2 sm:space-y-3">
        {sortedScores.map((score, index) => {
          const rank = score.originalRank;
          const username = sanitizeText(score.users?.username || 'Unknown');
          const country = sanitizeText(score.users?.country || '');
          const mods = sanitizeText(score.mods || 'None');
          const isWinner = isRulesetWinner(score);
          const isTop3 = rank <= 3;
          
          return (
            <div 
              key={score.id || index}
              className={`p-3 sm:p-4 transition-all rounded-lg sm:rounded-xl ${
                isTop3 ? 'glass-2 border border-white/20' : 'border border-white/10'
              } ${isTop3 ? `performance-card-${rank === 1 ? 'blue' : rank === 2 ? 'purple' : 'orange'}` : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Rank Badge */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-b ${getRankGradient(rank)} flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <span className="text-white font-black text-xs sm:text-sm text-shadow-adaptive">
                    #{rank}
                  </span>
                </div>
                
                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    {score.users?.avatar_url && (
                      <img 
                        src={score.users.avatar_url} 
                        alt={`${username}'s avatar`}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full avatar-border flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <button 
                      className="font-bold text-white hover:text-purple-300 transition-colors text-shadow-adaptive truncate text-left text-sm sm:text-base" 
                      onClick={() => handleUsernameClick(score.users)}
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
                  
                  {/* Badges */}
                  {isWinner && (
                    <div className="mb-1.5 sm:mb-2">
                      <span className="inline-flex items-center gap-1 glass-2 text-yellow-300 text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full performance-card-orange">
                        <Target className="w-3 h-3 icon-shadow-adaptive-sm" />
                        Ruleset Winner
                      </span>
                    </div>
                  )}
                  
                  {/* Score Details */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-white/70 text-shadow-adaptive-sm">Score:</span>
                      <div className="font-mono font-bold text-white text-shadow-adaptive">
                        {formatScore(score.score)}
                      </div>
                    </div>
                    <div>
                      <span className="text-white/70 text-shadow-adaptive-sm">Accuracy:</span>
                      <div className={`inline-flex px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gradient-to-b ${getAccuracyGradient(score.accuracy)} ${getAccuracyBorder(score.accuracy)} text-white rounded-full font-bold text-xs shadow-md mt-0.5 sm:mt-1`}>
                        {formatAccuracy(score.accuracy)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-white/70 text-shadow-adaptive-sm">Combo:</span>
                      <div className="font-mono text-white font-bold text-shadow-adaptive">
                        {formatCombo(score.max_combo)}x
                      </div>
                    </div>
                    <div>
                      <span className="text-white/70 text-shadow-adaptive-sm">Mods:</span>
                      <div className="mt-0.5 sm:mt-1">
                        {mods !== 'None' ? (
                          <span className="text-xs glass-2 text-purple-300 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-medium">
                            {mods}
                          </span>
                        ) : (
                          <span className="text-xs text-white/60 text-shadow-adaptive-sm">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop Table View - No glass wrapping, integrated into parent
  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table" aria-label="Score leaderboard">
        <thead>
          <tr className="border-b border-white/20">
            <th className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white/90 text-left text-shadow-adaptive-sm">
              Rank
            </th>
            <th className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white/90 text-left text-shadow-adaptive-sm">
              <SortButton column="player" align="left">Player</SortButton>
            </th>
            <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white/90 text-center text-shadow-adaptive-sm">
              <SortButton column="score" align="center">Score</SortButton>
            </th>
            <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white/90 text-center text-shadow-adaptive-sm">
              <SortButton column="accuracy" align="center">Accuracy</SortButton>
            </th>
            <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white/90 text-center text-shadow-adaptive-sm">
              <SortButton column="combo" align="center">Combo</SortButton>
            </th>
            <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white/90 text-center text-shadow-adaptive-sm">
              Mods
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedScores.map((score, index) => {
            const rank = score.originalRank;
            const username = sanitizeText(score.users?.username || 'Unknown');
            const country = sanitizeText(score.users?.country || '');
            const mods = sanitizeText(score.mods || 'None');
            const isWinner = isRulesetWinner(score);
            const isTop3 = rank <= 3;
            
            return (
              <tr 
                key={score.id || index}
                className={`transition-all border-b border-white/10 last:border-b-0 hover:bg-white/5 ${
                  isTop3 ? 'bg-white/5' : ''
                }`}
                role="row"
              >
                <td className="py-3 sm:py-4 px-3 sm:px-4" role="cell">
                  <div className="flex items-center justify-start">
                    {isTop3 ? (
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-b ${getRankGradient(rank)} flex items-center justify-center shadow-lg`}>
                        <span className="text-white font-black text-xs sm:text-sm text-shadow-adaptive">
                          #{rank}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-lg font-bold text-white/90 text-shadow-adaptive">
                        #{rank}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 sm:py-4 px-3 sm:px-4" role="cell">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {score.users?.avatar_url && (
                      <img 
                        src={score.users.avatar_url} 
                        alt={`${username}'s avatar`}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full avatar-border flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button 
                          className="font-bold text-white hover:text-purple-300 transition-colors text-shadow-adaptive truncate text-left text-sm sm:text-base" 
                          onClick={() => handleUsernameClick(score.users)}
                        >
                          {username}
                        </button>
                        {isWinner && (
                          <span className="inline-flex items-center gap-1 glass-2 text-yellow-300 text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full performance-card-orange">
                            <Target className="w-3 h-3 icon-shadow-adaptive-sm" />
                            Ruleset Winner
                          </span>
                        )}
                      </div>
                      {country && (
                        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                          {getCountryFlagUrl(country) && (
                            <img 
                              src={getCountryFlagUrl(country)} 
                              alt={`${country} flag`}
                              className="w-4 h-3 object-cover rounded-sm shadow-sm"
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
                  <span className="font-mono font-bold text-white text-sm sm:text-lg text-glow-blue text-shadow-adaptive">
                    {formatScore(score.score)}
                  </span>
                </td>
                <td className="py-3 sm:py-4 px-4 sm:px-6 text-center" role="cell">
                  <div className={`inline-flex px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-b ${getAccuracyGradient(score.accuracy)} ${getAccuracyBorder(score.accuracy)} text-white rounded-full font-bold text-xs sm:text-sm shadow-md`}>
                    {formatAccuracy(score.accuracy)}%
                  </div>
                </td>
                <td className="py-3 sm:py-4 px-4 sm:px-6 text-center" role="cell">
                  <span className="font-mono text-white font-bold text-sm sm:text-lg text-glow-green text-shadow-adaptive">
                    {formatCombo(score.max_combo)}x
                  </span>
                </td>
                <td className="py-3 sm:py-4 px-4 sm:px-6 text-center" role="cell">
                  {mods !== 'None' ? (
                    <span className="text-xs glass-2 text-purple-300 px-2 py-0.5 sm:py-1 rounded-full font-medium">
                      {mods}
                    </span>
                  ) : (
                    <span className="text-xs text-white/60 text-shadow-adaptive-sm">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}