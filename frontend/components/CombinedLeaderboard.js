import { Trophy, Award, Target, Activity } from 'lucide-react';
import { useState } from 'react';
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
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-2 text-gray-600">Loading combined leaderboard...</span>
      </div>
    );
  }

  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No combined scores available yet.</p>
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
      setSortOrder(column === 'player' ? 'asc' : 'desc'); // Default desc for numeric columns
    }
  };

  // Handle clicking on a username to go to their profile
  const handleUsernameClick = (player) => {
    if (!player || !player.user_id) {
      console.warn('No user ID found for player:', player);
      return;
    }
    
    // Navigate to the challenger's profile page
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
      className={`flex items-center gap-1 hover:text-purple-600 transition-colors font-medium w-full ${
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
    if (accuracy >= 98) return 'text-violet-600 bg-violet-50';
    if (accuracy >= 95) return 'text-emerald-600 bg-emerald-50';
    if (accuracy >= 90) return 'text-green-600 bg-green-50';
    if (accuracy >= 80) return 'text-sky-600 bg-sky-50';
    if (accuracy >= 70) return 'text-orange-600 bg-orange-50';
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

  const getParticipationColor = (mapsPlayed) => {
    const percentage = (mapsPlayed / totalMaps) * 100;
    if (percentage === 100) return 'text-purple-600 bg-purple-50';
    if (percentage >= 80) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-teal-600 bg-teal-50';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="overflow-x-auto bg-white/90 rounded-xl shadow-sm">
      <table className="w-full table-fixed" role="table" aria-label="Combined score leaderboard">
        <colgroup>
          <col className="w-20" />
          <col className="w-56" />
          <col className="w-32" />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-28" />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="py-4 px-4 text-sm font-semibold text-gray-700">
              <div className="flex items-center justify-start">
                Rank
              </div>
            </th>
            <th className="py-4 px-4 text-sm font-semibold text-gray-700">
              <SortButton column="player" align="left">Player</SortButton>
            </th>
            <th className="py-4 px-6 text-sm font-semibold text-gray-700">
              <SortButton column="total_score" align="center">
                <Trophy className="w-4 h-4" />
                Total Score
              </SortButton>
            </th>
            <th className="py-4 px-6 text-sm font-semibold text-gray-700">
              <SortButton column="average_accuracy" align="center">
                <Target className="w-4 h-4" />
                Avg Acc
              </SortButton>
            </th>
            <th className="py-4 px-6 text-sm font-semibold text-gray-700">
              <SortButton column="best_combo" align="center">
                <Award className="w-4 h-4" />
                Best Combo
              </SortButton>
            </th>
            <th className="py-4 px-6 text-sm font-semibold text-gray-700">
              <SortButton column="maps_played" align="center">
                <Activity className="w-4 h-4" />
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
            const rankStyle = getRankStyle(rank);
            
            return (
              <tr 
                key={player.user_id || index}
                className={`border-b border-gray-100 hover:bg-gray-50/70 transition-all ${rankStyle.row}`}
                role="row"
              >
                <td className="py-4 px-4" role="cell">
                  <div className="flex items-center justify-start gap-1">
                    {rankStyle.icon && <span className="text-lg">{rankStyle.icon}</span>}
                    <span className={rankStyle.rank}>
                      #{rank}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4" role="cell">
                  <div className="flex items-center justify-start gap-3">
                    {player.avatar_url && (
                      <img 
                        src={player.avatar_url} 
                        alt={`${username}'s avatar`}
                        className="w-12 h-12 rounded-full ring-2 ring-white shadow-md flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <button 
                        className="font-bold text-gray-900 hover:text-purple-600 hover:underline transition-colors cursor-pointer truncate text-lg text-left" 
                        title={`View ${username}'s profile`}
                        onClick={() => handleUsernameClick(player)}
                      >
                        {username}
                      </button>
                      {country && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {getCountryFlagUrl(country) ? (
                            <img 
                              src={getCountryFlagUrl(country)} 
                              alt={`${country} flag`}
                              className="w-5 h-3.5 object-cover border border-gray-300 rounded-sm shadow-sm"
                              title={country.toUpperCase()}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'inline-block';
                              }}
                            />
                          ) : null}
                          <span 
                            className="text-xs text-gray-600 font-medium"
                            style={{ display: getCountryFlagUrl(country) ? 'none' : 'inline-block' }}
                          >
                            🌍 {country.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6" role="cell">
                  <div className="flex items-center justify-center">
                    <span className="font-mono font-black text-gray-900 text-xl">
                      {formatScore(player.total_score)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6" role="cell">
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold ${getAccuracyColor(player.average_accuracy)}`}>
                      {formatAccuracy(player.average_accuracy)}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6" role="cell">
                  <div className="flex items-center justify-center">
                    <span className="font-mono text-gray-700 font-semibold text-lg">
                      {formatCombo(player.best_combo)}x
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6" role="cell">
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold ${getParticipationColor(player.maps_played)}`}>
                      {player.maps_played}/{totalMaps}
                    </span>
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