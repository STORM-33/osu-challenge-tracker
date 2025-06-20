import { Activity, Star, TrendingUp, Award } from 'lucide-react';

export default function UserStats({ stats }) {
  const statCards = [
    {
      title: 'Total Challenges',
      value: stats.totalChallenges,
      icon: Activity,
      color: 'text-purple-700',
      bgColor: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      hoverBorder: 'hover:border-purple-300',
    },
    {
      title: 'Best Rank',
      value: stats.bestRank ? `#${stats.bestRank}` : 'N/A',
      icon: Star,
      color: 'text-yellow-700',
      bgColor: 'from-yellow-50 to-orange-100',
      borderColor: 'border-yellow-200',
      hoverBorder: 'hover:border-yellow-300',
    },
    {
      title: 'Avg Accuracy',
      value: `${stats.avgAccuracy}%`,
      icon: TrendingUp,
      color: 'text-green-700',
      bgColor: 'from-green-50 to-emerald-100',
      borderColor: 'border-green-200',
      hoverBorder: 'hover:border-green-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${stat.bgColor} border ${stat.borderColor} rounded-xl p-6 ${stat.hoverBorder} transition-all shadow-sm hover:shadow-md`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-neutral-800">{stat.title}</h3>
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