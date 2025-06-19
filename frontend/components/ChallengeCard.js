import { Calendar, Users, Music, ChevronRight, Star } from 'lucide-react';

export default function ChallengeCard({ 
  challenge, 
  size = 'medium', 
  challengeType = 'monthly', // 'weekly' or 'monthly'
  showSeasonBadge = false 
}) {
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
  
  // Display name: custom_name takes priority over name
  const displayName = challenge.custom_name || challenge.name;

  // Get background image and map info for weekly challenges
  const weeklyBackgroundImage = challengeType === 'weekly' && challenge.playlists?.[0]?.beatmap_cover_url;
  const weeklyMapInfo = challengeType === 'weekly' && challenge.playlists?.[0];

  // Size configurations
  const sizeConfig = {
    small: {
      cardClass: 'h-48',
      titleClass: 'text-base',
      titleHeight: 'h-12', // Fixed height for title area
      statsGrid: 'grid-cols-2',
      iconSize: 'w-4 h-4',
      numberSize: 'text-lg',
      showHost: false,
      showDays: false
    },
    medium: {
      cardClass: 'h-full min-h-[300px]',
      titleClass: 'text-xl',
      titleHeight: 'h-16', // Fixed height for title area
      statsGrid: 'grid-cols-3',
      iconSize: 'w-6 h-6',
      numberSize: 'text-2xl',
      showHost: false,
      showDays: true
    },
    large: {
      cardClass: 'h-64 w-full',
      titleClass: 'text-3xl',
      titleHeight: 'h-20', // Fixed height for title area
      statsGrid: 'grid-cols-3',
      iconSize: 'w-8 h-8',
      numberSize: 'text-4xl',
      showHost: false,
      showDays: true
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`glass-card rounded-2xl hover:shadow-xl transition-all cursor-pointer group ${config.cardClass} flex flex-col relative overflow-hidden`}>
      
      {/* Background for weekly challenges - partial background */}
      {size === 'large' && challengeType === 'weekly' && weeklyBackgroundImage && (
        <div className="absolute right-0 top-0 w-1/2 h-full">
          <div 
            className="w-full h-full bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity"
            style={{ 
              backgroundImage: `url(${weeklyBackgroundImage})`,
              maskImage: 'linear-gradient(to left, rgba(0,0,0,1), rgba(0,0,0,0))',
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1), rgba(0,0,0,0))'
            }}
          />
        </div>
      )}

      {/* Placeholder for monthly challenges */}
      {size === 'large' && challengeType === 'monthly' && (
        <div className="absolute right-0 top-0 w-1/2 h-full">
          <div className="w-full h-full bg-gradient-to-l from-primary-100 to-transparent opacity-20 group-hover:opacity-30 transition-opacity flex items-center justify-center">
            <div className="text-primary-300 text-6xl font-bold">MC</div>
          </div>
        </div>
      )}

      {/* Content overlay - using flexbox with fixed sections */}
      <div className="relative z-10 p-6 flex flex-col h-full">
        
        {/* Header - Fixed height */}
        <div className={`${config.titleHeight} flex justify-between items-start mb-4 flex-shrink-0`}>
          <div className="flex-1 pr-4 overflow-hidden">
            <h3 className={`${config.titleClass} font-bold text-neutral-800 line-clamp-2 group-hover:text-primary-600 transition-colors leading-tight`}>
              {displayName}
            </h3>
          </div>
          
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Challenge type badge */}
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
              challengeType === 'weekly' 
                ? 'text-blue-600 bg-blue-100'
                : 'text-purple-600 bg-purple-100'
            }`}>
              {challengeType === 'weekly' ? 'Weekly' : 'Monthly'}
            </span>
            
            {/* Season badge */}
            {showSeasonBadge && challenge.seasons && (
              <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full font-medium">
                {challenge.seasons.name}
              </span>
            )}
          </div>
        </div>

        {/* Map Info for Weekly Challenges - Fixed position */}
        {challengeType === 'weekly' && weeklyMapInfo && size === 'large' && (
          <div className="mb-4 flex-shrink-0">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 truncate">
                    {weeklyMapInfo.beatmap_title}
                  </p>
                  <p className="text-xs text-blue-700 truncate">
                    by {weeklyMapInfo.beatmap_artist}
                  </p>
                </div>
                {weeklyMapInfo.beatmap_difficulty && (
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium text-blue-900">
                      {weeklyMapInfo.beatmap_difficulty.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spacer to push stats to bottom */}
        <div className="flex-1"></div>

        {/* Stats Grid - Fixed position at bottom */}
        <div className={`grid ${config.statsGrid} gap-4 mb-4 flex-shrink-0`}>
          <div className="text-center">
            <div className={`w-12 h-12 mx-auto mb-2 bg-primary-100 rounded-full flex items-center justify-center ${size === 'large' ? 'w-16 h-16' : ''}`}>
              <Users className={`${config.iconSize} text-primary-600`} />
            </div>
            <p className={`${config.numberSize} font-bold text-neutral-800`}>
              {challenge.participant_count || 0}
            </p>
            <p className="text-xs text-neutral-600">Players</p>
          </div>
          
          <div className="text-center">
            <div className={`w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center ${size === 'large' ? 'w-16 h-16' : ''}`}>
              <Music className={`${config.iconSize} text-purple-600`} />
            </div>
            <p className={`${config.numberSize} font-bold text-neutral-800`}>
              {challenge.playlists?.length || 0}
            </p>
            <p className="text-xs text-neutral-600">Maps</p>
          </div>
          
          {/* Only show third column for medium and large cards that show days */}
          {config.showDays && (
            <div className="text-center">
              <div className={`w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center ${size === 'large' ? 'w-16 h-16' : ''}`}>
                <Calendar className={`${config.iconSize} text-green-600`} />
              </div>
              {daysRemaining !== null && daysRemaining > 0 ? (
                <>
                  <p className={`${config.numberSize} font-bold text-neutral-800`}>{daysRemaining}</p>
                  <p className="text-xs text-neutral-600">Days left</p>
                </>
              ) : (
                <>
                  <p className={`${size === 'large' ? 'text-lg' : 'text-sm'} font-bold ${daysRemaining === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {daysRemaining === 0 ? 'Expired' : 'Active'}
                  </p>
                  <p className="text-xs text-neutral-600">Status</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer - Fixed position */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-4 border-t border-neutral-200 flex-shrink-0">
          <span className="font-medium">
            {size === 'small' 
              ? formatDate(challenge.start_date)
              : `${formatDate(challenge.start_date)} - ${formatDate(challenge.end_date)}`
            }
          </span>
          <ChevronRight className="w-4 h-4 text-primary-500 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}