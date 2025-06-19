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
    <div className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer group h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-neutral-800 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {challenge.name}
          </h3>
          <p className="text-sm text-neutral-600">Hosted by {challenge.host}</p>
        </div>
        <div className="ml-2">
          <span className="text-xs text-primary-600 bg-primary-100 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
            {challenge.room_type}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4 flex-1">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-primary-100 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-800">
            {challenge.participant_count || 0}
          </p>
          <p className="text-xs text-neutral-600">Players</p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
            <Music className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-800">
            {challenge.playlists?.length || 0}
          </p>
          <p className="text-xs text-neutral-600">Maps</p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          {daysRemaining !== null ? (
            <>
              <p className="text-2xl font-bold text-neutral-800">{daysRemaining}</p>
              <p className="text-xs text-neutral-600">Days left</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-green-600">Active</p>
              <p className="text-xs text-neutral-600">Status</p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-4 border-t border-neutral-200">
        <span className="font-medium">
          {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
        </span>
        <ChevronRight className="w-4 h-4 text-primary-500 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}