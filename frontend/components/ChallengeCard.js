import { Calendar, Users, Music, ChevronRight } from 'lucide-react';

export default function ChallengeCard({ challenge }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysRemaining = getDaysRemaining(challenge.end_date);

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">
            {challenge.name}
          </h3>
          <p className="text-sm text-gray-400">Hosted by {challenge.host}</p>
        </div>
        <div className="ml-2">
          <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded whitespace-nowrap">
            {challenge.room_type}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4 flex-1">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">
            {challenge.participant_count || 0}
          </p>
          <p className="text-xs text-gray-500">Players</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Music className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl font-bold text-pink-400">
            {challenge.playlists?.length || 0}
          </p>
          <p className="text-xs text-gray-500">Maps</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Calendar className="w-4 h-4 text-green-400" />
          </div>
          {daysRemaining !== null ? (
            <>
              <p className="text-2xl font-bold text-green-400">{daysRemaining}</p>
              <p className="text-xs text-gray-500">Days left</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-green-400">Active</p>
              <p className="text-xs text-gray-500">Status</p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-800">
        <span>
          {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
        </span>
        <ChevronRight className="w-4 h-4 text-purple-400" />
      </div>
    </div>
  );
}