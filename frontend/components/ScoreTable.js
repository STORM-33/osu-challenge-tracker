import { Trophy, Medal, Award } from 'lucide-react';

export default function ScoreTable({ scores }) {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Award className="w-4 h-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const formatScore = (score) => {
    return score.toLocaleString();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Rank</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Player</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Score</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Accuracy</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Combo</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Mods</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score, index) => {
            const rank = index + 1;
            return (
              <tr 
                key={score.id} 
                className="border-b border-gray-800 hover:bg-purple-900/10 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {getRankIcon(rank)}
                    <span className={`font-semibold ${rank <= 3 ? 'text-purple-400' : ''}`}>
                      #{rank}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {score.users?.avatar_url && (
                      <img 
                        src={score.users.avatar_url} 
                        alt={score.users.username}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium text-purple-300">
                        {score.users?.username || 'Unknown'}
                      </p>
                      {score.users?.country && (
                        <p className="text-xs text-gray-500">
                          {score.users.country}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold">
                  {formatScore(score.score)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`font-semibold ${
                    score.accuracy >= 98 ? 'text-green-400' :
                    score.accuracy >= 95 ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}>
                    {score.accuracy.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {score.max_combo}x
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xs text-gray-500">
                    {score.mods || 'None'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}