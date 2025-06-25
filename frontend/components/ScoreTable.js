import { Trophy, Target } from 'lucide-react';
import { useState, useEffect } from 'react';

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading scores...</span>
      </div>
    );
  }

  if (!Array.isArray(scores) || scores.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No scores available yet.</p>
      </div>
    );
  }

  const formatScore = (score) => {
    if (typeof score !== 'number' || isNaN(score)) return '0';
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

  // Handle clicking on a username to open their osu! profile
  const handleUsernameClick = (user) => {
    if (!user) return;
    
    // Try different possible ID field names
    const userId = user.id || user.user_id || user.osu_id;
    
    if (userId) {
      const profileUrl = `https://osu.ppy.sh/users/${userId}`;
      window.open(profileUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback: search by username if no ID is available
      const searchUrl = `https://osu.ppy.sh/users/${encodeURIComponent(user.username)}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // First, add original rank based on score to each score object
  const scoresWithRank = scores.map((score, index) => ({
    ...score,
    originalRank: index + 1 // This assumes scores are already sorted by score
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
        return a.originalRank - b.originalRank; // Sort by original rank for default
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
      className={`flex items-center gap-1 hover:text-blue-600 transition-colors font-medium w-full ${
        align === 'right' ? 'justify-end' : 
        align === 'center' ? 'justify-center' : 
        'justify-start'
      }`}
      aria-label={`Sort by ${column}`}
    >
      {children}
      {sortBy === column && (
        <span className="text-xs">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 95) return 'text-emerald-500 bg-emerald-50';
    if (accuracy >= 90) return 'text-green-500 bg-green-50';
    if (accuracy >= 80) return 'text-sky-500 bg-sky-50';
    if (accuracy >= 70) return 'text-orange-500 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getRankStyle = (rank) => {
  switch (rank) {
      case 1:
        return {
          row: 'bg-gradient-to-r from-blue-500 via-blue-300 to-transparent border-l-4 border-l-blue-600 border-b-blue-300',
          rank: 'text-blue-900 text-2xl font-black',
          icon: ''
        };
      case 2:
        return {
          row: 'bg-gradient-to-r from-purple-400 via-purple-200 to-transparent border-l-4 border-purple-600 border-b-purple-300',
          rank: 'text-purple-900 text-xl font-black',
          icon: ''
        };
      case 3:
        return {
          row: 'bg-gradient-to-r from-red-400 via-red-200 to-transparent border-l-4 border-red-600 border-b-red-300',
          rank: 'text-red-900 text-lg font-bold',
          icon: ''
        };
      default:
        return {
          row: '',
          rank: 'text-gray-700 font-bold',
          icon: ''
        };
    }
  };

  return (
    <div className="overflow-x-auto bg-white/80 rounded-xl">
      <table className="w-full table-fixed" role="table" aria-label="Score leaderboard">
        <colgroup>
          <col className="w-20" />
          <col className="w-48" />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-4 text-sm font-medium text-gray-600">
              <div className="flex items-center justify-start">
                Rank
              </div>
            </th>
            <th className="py-3 px-4 text-sm font-medium text-gray-600">
              <SortButton column="player" align="left">Player</SortButton>
            </th>
            <th className="py-3 px-6 text-sm font-medium text-gray-600">
              <SortButton column="score" align="center">Score</SortButton>
            </th>
            <th className="py-3 px-6 text-sm font-medium text-gray-600">
              <SortButton column="accuracy" align="center">Accuracy</SortButton>
            </th>
            <th className="py-3 px-6 text-sm font-medium text-gray-600">
              <SortButton column="combo" align="center">Combo</SortButton>
            </th>
            <th className="py-3 px-6 text-sm font-medium text-gray-600">
              <div className="flex items-center justify-center">
                Mods
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedScores.map((score, index) => {
            // Use original rank instead of current index for ranking and styling
            const rank = score.originalRank;
            const username = sanitizeText(score.users?.username || 'Unknown');
            const country = sanitizeText(score.users?.country || '');
            const mods = sanitizeText(score.mods || 'None');
            const rankStyle = getRankStyle(rank);
            const isWinner = isRulesetWinner(score);
            
            return (
              <tr 
                key={score.id || index}
                className={`border-b border-gray-100 hover:bg-opacity-70 transition-all ${rankStyle.row}`}
                role="row"
              >
                <td className="py-3 px-4" role="cell">
                  <div className="flex items-center justify-start">
                    <span className={rankStyle.rank}>
                      #{rank}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4" role="cell">
                  <div className="flex items-center justify-start gap-3">
                    {score.users?.avatar_url && (
                      <img 
                        src={score.users.avatar_url} 
                        alt={`${username}'s avatar`}
                        className="w-10 h-10 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p 
                          className="font-semibold text-gray-800 hover:text-blue-600 hover:underline transition-colors cursor-pointer truncate" 
                          title={`Click to view ${username}'s osu! profile`}
                          onClick={() => handleUsernameClick(score.users)}
                        >
                          {username}
                        </p>
                        {/* Multiple badges for different winner types */}
                        <div className="flex items-center gap-1">
                          {isWinner && (
                            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                              <Target className="w-3 h-3" />
                              Ruleset Winner
                            </span>
                          )}
                        </div>
                      </div>
                      {country && (
                        <div className="flex items-center gap-1 mt-1">
                          {getCountryFlagUrl(country) ? (
                            <img 
                              src={getCountryFlagUrl(country)} 
                              alt={`${country} flag`}
                              className="w-4 h-3 object-cover border border-gray-300 rounded-sm"
                              title={country.toUpperCase()}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'inline-block';
                              }}
                            />
                          ) : null}
                          <span 
                            className="text-xs text-gray-500 font-medium"
                            style={{ display: getCountryFlagUrl(country) ? 'none' : 'inline-block' }}
                          >
                            🌍 {country.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-6" role="cell">
                  <div className="flex items-center justify-center">
                    <span className="font-mono font-bold text-gray-800 text-lg">
                      {formatScore(score.score)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-6" role="cell">
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-sm font-semibold ${getAccuracyColor(score.accuracy)}`}>
                      {formatAccuracy(score.accuracy)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-6" role="cell">
                  <div className="flex items-center justify-center">
                    <span className="font-mono text-gray-700">
                      {formatCombo(score.max_combo)}x
                    </span>
                  </div>
                </td>
                <td className="py-3 px-6" role="cell">
                  <div className="flex items-center justify-center">
                    {mods !== 'None' ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium truncate max-w-full" title={mods}>
                        {mods}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
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