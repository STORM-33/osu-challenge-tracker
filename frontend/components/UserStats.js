import { Activity, Star, TrendingUp, Award } from 'lucide-react';

export default function UserStats({ stats }) {
  const statCards = [
    {
      title: 'Total Challenges',
      value: stats.totalChallenges,
      icon: Activity,
      color: 'text-purple-400',
      bgColor: 'from-purple-900/20 to-purple-800/20',
    },
    {
      title: 'Best Rank',
      value: stats.bestRank ? `#${stats.bestRank}` : 'N/A',
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'from-yellow-900/20 to-orange-900/20',
    },
    {
      title: 'Avg Accuracy',
      value: `${stats.avgAccuracy}%`,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'from-green-900/20 to-emerald-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${stat.bgColor} border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{stat.title}</h3>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <p className={`text-3xl font-bold ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}