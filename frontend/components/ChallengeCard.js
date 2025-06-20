import { Calendar, Users, Music, ChevronRight, Star, Zap } from 'lucide-react';

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

  const getDifficultyColor = (difficulty) => {
    if (difficulty < 2) return 'text-green-600 bg-green-100';
    if (difficulty < 2.7) return 'text-blue-600 bg-blue-100';
    if (difficulty < 4) return 'text-yellow-600 bg-yellow-100';
    if (difficulty < 5.3) return 'text-orange-600 bg-orange-100';
    if (difficulty < 6.5) return 'text-red-600 bg-red-100';
    return 'text-purple-600 bg-purple-100';
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
      cardClass: 'h-64',
      titleClass: 'text-base',
      titleHeight: 'min-h-[48px]',
      statsGrid: 'grid-cols-2',
      iconSize: 'w-4 h-4',
      numberSize: 'text-lg',
      showHost: false,
      showDays: false,
      padding: 'p-4'
    },
    medium: {
      cardClass: 'h-80',
      titleClass: 'text-lg',
      titleHeight: 'min-h-[56px]',
      statsGrid: 'grid-cols-3',
      iconSize: 'w-5 h-5',
      numberSize: 'text-xl',
      showHost: false,
      showDays: true,
      padding: 'p-5'
    },
    large: {
      cardClass: 'h-80 w-full',
      titleClass: 'text-2xl',
      titleHeight: 'min-h-[64px]',
      statsGrid: 'grid-cols-3',
      iconSize: 'w-6 h-6',
      numberSize: 'text-2xl',
      showHost: false,
      showDays: true,
      padding: 'p-6'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${config.cardClass}`}>
      
      {/* Background Layer */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className={`absolute inset-0 ${
          challengeType === 'weekly' 
            ? 'bg-gradient-to-br from-blue-50 via-white to-blue-100' 
            : 'bg-gradient-to-br from-purple-50 via-white to-purple-100'
        }`} />
        
        {/* Weekly challenge background with map image*/}
        {size === 'large' && challengeType === 'weekly' && weeklyBackgroundImage && (
          <>
            <div 
              className="absolute right-0 top-0 w-1/2 h-full bg-cover bg-center opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              style={{ 
                backgroundImage: `url(${weeklyBackgroundImage})`,
              }}
            />
            {/* Softer gradient overlay for better blending */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent" />
          </>
        )}
        
        {/* Glass overlay*/}
        <div className="absolute inset-0 backdrop-blur-sm bg-white/30" />
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-gradient-to-tr from-white/10 to-transparent" />
      </div>

      {/* Content */}
      <div className={`relative z-10 ${config.padding} flex flex-col h-full`}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-0">
          <div className="flex-1 pr-3">
            <div className={`${config.titleHeight} flex items-start mb-0`}>
              <h3 className={`${config.titleClass} font-bold text-neutral-800 line-clamp-2 group-hover:text-primary-600 transition-colors leading-tight`}>
                {displayName}
              </h3>
            </div>
            
            {/* Integrated map info for large weekly challenges */}
            {size === 'large' && challengeType === 'weekly' && weeklyMapInfo && (
              <div className="space-y-1 -mt-8">
                <p className="text-base font-semibold text-neutral-700">
                  <Music className="w-4 h-4 inline-block mr-1 text-blue-500" />
                  {weeklyMapInfo.beatmap_title}
                </p>
                <div className="flex items-center gap-3 text-sm text-neutral-600">
                  <span>by {weeklyMapInfo.beatmap_artist}</span>
                  <span className="text-neutral-400">•</span>
                  <span>[{weeklyMapInfo.beatmap_version}]</span>
                  {weeklyMapInfo.beatmap_difficulty && (
                    <>
                      <span className="text-neutral-400">•</span>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getDifficultyColor(weeklyMapInfo.beatmap_difficulty)}`}>
                        <Star className="w-3 h-3 fill-current" />
                        <span>{weeklyMapInfo.beatmap_difficulty.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Challenge type badge */}
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm ${
              challengeType === 'weekly' 
                ? 'text-blue-700 bg-blue-200 border border-blue-300'
                : 'text-purple-700 bg-purple-200 border border-purple-300'
            }`}>
              {challengeType === 'weekly' ? 'Weekly' : 'Monthly'}
            </span>
            
            {/* Season badge */}
            {showSeasonBadge && challenge.seasons && size !== 'small' && (
              <span className="text-xs text-neutral-600 bg-neutral-200 px-2 py-1 rounded-full font-medium border border-neutral-300">
                {challenge.seasons.name}
              </span>
            )}
          </div>
        </div>

        {/* Weekly Map Info Card for medium size*/}
        {challengeType === 'weekly' && weeklyMapInfo && size === 'medium' && (
          <div className="mb-4 flex-shrink-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate mb-1">
                    {weeklyMapInfo.beatmap_title}
                  </p>
                  <p className="text-xs text-neutral-600 truncate">
                    by {weeklyMapInfo.beatmap_artist}
                  </p>
                  <p className="text-xs text-neutral-500 truncate mt-1">
                    [{weeklyMapInfo.beatmap_version}]
                  </p>
                </div>
                {weeklyMapInfo.beatmap_difficulty && (
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getDifficultyColor(weeklyMapInfo.beatmap_difficulty)}`}>
                      <Star className="w-3 h-3 fill-current" />
                      <span>{weeklyMapInfo.beatmap_difficulty.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Stats Grid */}
        <div className={`grid ${config.statsGrid} gap-3 mb-4 flex-shrink-0`}>
          <div className="text-center">
            <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center shadow-sm ${size === 'large' ? 'w-12 h-12' : ''}`}>
              <Users className={`${config.iconSize} text-primary-600`} />
            </div>
            <p className={`${config.numberSize} font-bold text-neutral-800`}>
              {challenge.participant_count || 0}
            </p>
            <p className="text-xs text-neutral-600 font-medium">Players</p>
          </div>
          
          <div className="text-center">
            <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm ${size === 'large' ? 'w-12 h-12' : ''}`}>
              <Music className={`${config.iconSize} text-purple-600`} />
            </div>
            <p className={`${config.numberSize} font-bold text-neutral-800`}>
              {challenge.playlists?.length || 0}
            </p>
            <p className="text-xs text-neutral-600 font-medium">Maps</p>
          </div>
          
          {/* Days remaining*/}
          {config.showDays && (
            <div className="text-center">
              <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm ${size === 'large' ? 'w-12 h-12' : ''}`}>
                <Calendar className={`${config.iconSize} text-green-600`} />
              </div>
              {daysRemaining !== null && daysRemaining > 0 ? (
                <>
                  <p className={`${config.numberSize} font-bold text-neutral-800`}>{daysRemaining}</p>
                  <p className="text-xs text-neutral-600 font-medium">Days left</p>
                </>
              ) : (
                <>
                  <p className={`${size === 'large' ? 'text-base' : 'text-sm'} font-bold ${daysRemaining === 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {daysRemaining === 0 ? 'Ended' : 'Active'}
                  </p>
                  <p className="text-xs text-neutral-600 font-medium">Status</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-white/50 flex-shrink-0">
          <span className="font-medium">
            {size === 'small' 
              ? formatDate(challenge.start_date)
              : `${formatDate(challenge.start_date)} - ${formatDate(challenge.end_date)}`
            }
          </span>
          <div className="flex items-center gap-1 text-primary-500 group-hover:text-primary-600 transition-colors">
            <span className="text-xs font-medium">View</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}