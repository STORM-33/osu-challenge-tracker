import { Trophy, Medal, Award } from 'lucide-react';
import { useState } from 'react';

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

export default function ScoreTable({ scores = [], loading = false }) {
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');

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

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" aria-label="First place" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" aria-label="Second place" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-500" aria-label="Third place" />;
      default:
        return null;
    }
  };

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

  // Sort scores based on current sort settings
  const sortedScores = [...scores].sort((a, b) => {
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
        return 0; // Keep original order for rank
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
    if (accuracy >= 98) return 'text-green-600 bg-green-50';
    if (accuracy >= 95) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
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
            const rank = index + 1;
            const username = sanitizeText(score.users?.username || 'Unknown');
            const country = sanitizeText(score.users?.country || '');
            const mods = sanitizeText(score.mods || 'None');
            
            return (
              <tr 
                key={score.id || index}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  rank <= 3 ? 'bg-gradient-to-r from-transparent' : ''
                } ${
                  rank === 1 ? 'via-yellow-50/30 to-transparent' :
                  rank === 2 ? 'via-gray-50/30 to-transparent' :
                  rank === 3 ? 'via-orange-50/30 to-transparent' : ''
                }`}
                role="row"
              >
                <td className="py-3 px-4" role="cell">
                  <div className="flex items-center justify-start gap-2">
                    {getRankIcon(rank)}
                    <span className={`font-bold ${rank <= 3 ? 'text-blue-600 text-lg' : 'text-gray-700'}`}>
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
                      <p className="font-semibold text-gray-800 hover:text-blue-600 transition-colors cursor-pointer truncate" title={username}>
                        {username}
                      </p>
                      {country && (
                        <p className="text-xs text-gray-500 uppercase truncate" title={country}>
                          {country}
                        </p>
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