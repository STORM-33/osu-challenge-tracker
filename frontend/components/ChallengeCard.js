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
    // Use osu!'s difficulty ranges but map to Tailwind classes
    if (difficulty < 1.25) return 'text-blue-700 bg-blue-100 border-blue-200'; // Easy (Blue)
    if (difficulty < 2.0) return 'text-cyan-700 bg-cyan-100 border-cyan-200'; // Easy-Normal (Cyan)
    if (difficulty < 2.5) return 'text-green-700 bg-green-100 border-green-200'; // Normal (Green)
    if (difficulty < 3.3) return 'text-lime-700 bg-lime-100 border-lime-200'; // Normal-Hard (Lime)
    if (difficulty < 4.2) return 'text-yellow-700 bg-yellow-100 border-yellow-200'; // Hard (Yellow)
    if (difficulty < 4.9) return 'text-orange-700 bg-orange-100 border-orange-200'; // Hard-Insane (Orange)
    if (difficulty < 5.8) return 'text-red-700 bg-red-100 border-red-200'; // Insane (Red)
    if (difficulty < 6.7) return 'text-pink-700 bg-pink-100 border-pink-200'; // Insane-Expert (Pink/Purple)
    if (difficulty < 7.7) return 'text-purple-700 bg-purple-100 border-purple-200'; // Expert (Purple)
    return 'text-indigo-700 bg-indigo-100 border-indigo-200'; // Expert+ (Dark Blue)
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
    <div 
      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${config.cardClass}`}
      style={{
        // Force hardware acceleration and proper clipping
        transform: 'translateZ(0)',
        willChange: 'transform',
        // CSS mask to ensure perfect rounded corner clipping
        WebkitMask: 'radial-gradient(circle at center, white 100%, transparent 100%)',
        mask: 'radial-gradient(circle at center, white 100%, transparent 100%)',
        WebkitMaskComposite: 'intersect',
        maskComposite: 'intersect'
      }}
    >
      
      {/* Background Layer - properly clipped */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          // Additional clipping insurance
          clipPath: 'inset(0 round 1rem)',
          // Prevent any overflow
          contain: 'layout style paint'
        }}
      >
        {/* Base gradient */}
        <div className={`absolute inset-0 rounded-2xl ${
          challengeType === 'weekly' 
            ? 'bg-gradient-to-br from-blue-50 via-white to-blue-100' 
            : 'bg-gradient-to-br from-purple-50 via-white to-purple-100'
        }`} />
        
        {/* Weekly challenge background with map image and soft shadow separation */}
        {size === 'large' && challengeType === 'weekly' && weeklyBackgroundImage && (
          <>
            {/* Background image container with natural soft shadows only */}
            <div 
              className="absolute right-0 top-0 w-1/2 h-full opacity-85 group-hover:opacity-95 transition-opacity duration-300 ease-out rounded-r-2xl"
              style={{ 
                backgroundImage: `url(${weeklyBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                // Very subtle inner shadow for depth only
                boxShadow: 'inset 12px 0 24px -12px rgba(0, 0, 0, 0.06)',
                // Additional clipping for the background image specifically
                clipPath: 'inset(0 0 0 0 round 0 1rem 1rem 0)',
                // Ensure it doesn't exceed bounds
                maxWidth: '50%',
                maxHeight: '100%'
              }}
            >
              {/* Soft overlay for better text contrast - no hard edges */}
              <div 
                className="absolute inset-0 rounded-r-2xl"
                style={{
                  background: 'linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.1) 20%, transparent 40%)',
                }}
              />
            </div>
            
            {/* Content area with natural shadow separation */}
            <div 
              className="absolute left-0 top-0 w-3/5 h-full rounded-l-2xl"
              style={{
                // Soft, natural shadow extending outward
                boxShadow: '12px 0 24px -8px rgba(0, 0, 0, 0.04), 24px 0 48px -16px rgba(0, 0, 0, 0.02)',
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 1) 45%, rgba(255, 255, 255, 0.9) 55%, rgba(255, 255, 255, 0.8) 65%, rgba(255, 255, 255, 0.65) 72%, rgba(255, 255, 255, 0.5) 78%, rgba(255, 255, 255, 0.35) 84%, rgba(255, 255, 255, 0.2) 90%, rgba(255, 255, 255, 0.1) 95%, rgba(255, 255, 255, 0.05) 98%, transparent 100%)',
                backdropFilter: 'blur(0.25px)',
              }}
            />
          </>
        )}
        
        {/* Glass overlay */}
        <div className="absolute inset-0 backdrop-blur-sm bg-white/30 transition-all duration-300 ease-out group-hover:bg-white/20 rounded-2xl" />
        
        {/* Decorative elements */}
        <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-gradient-to-tr from-white/10 to-transparent transition-all duration-300 ease-out group-hover:scale-110 group-hover:from-white/20" />
      </div>

      {/* Content */}
      <div className={`relative z-10 ${config.padding} flex flex-col h-full`}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-0">
          <div className="flex-1 pr-3">
            <div className={`${config.titleHeight} flex items-start mb-0`}>
              <h3 className={`${config.titleClass} font-bold text-neutral-800 line-clamp-2 group-hover:text-primary-600 transition-colors duration-300 leading-tight`}>
                {displayName}
              </h3>
            </div>
            
            {/* Integrated map info for large weekly challenges */}
            {size === 'large' && challengeType === 'weekly' && weeklyMapInfo && (
              <div className="space-y-1 -mt-8">
                <p className="text-base font-semibold text-neutral-700 transition-colors duration-300 group-hover:text-neutral-800">
                  <Music className="w-4 h-4 inline-block mr-1 text-blue-500" />
                  {weeklyMapInfo.beatmap_title}
                </p>
                <div className="flex items-center gap-3 text-sm text-neutral-600 transition-colors duration-300 group-hover:text-neutral-700">
                  <span>by {weeklyMapInfo.beatmap_artist}</span>
                  <span className="text-neutral-400">•</span>
                  <span>[{weeklyMapInfo.beatmap_version}]</span>
                  {weeklyMapInfo.beatmap_difficulty && (
                    <>
                      <span className="text-neutral-400">•</span>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${getDifficultyColor(weeklyMapInfo.beatmap_difficulty)}`}>
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
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm transition-all duration-300 group-hover:shadow-md ${
              challengeType === 'weekly' 
                ? 'text-blue-700 bg-blue-200 border border-blue-300 group-hover:bg-blue-300'
                : 'text-purple-700 bg-purple-200 border border-purple-300 group-hover:bg-purple-300'
            }`}>
              {challengeType === 'weekly' ? 'Weekly' : 'Monthly'}
            </span>
            
            {/* Season badge */}
            {showSeasonBadge && challenge.seasons && size !== 'small' && (
              <span className="text-xs text-neutral-600 bg-neutral-200 px-2 py-1 rounded-full font-medium border border-neutral-300 transition-all duration-300 group-hover:bg-neutral-300">
                {challenge.seasons.name}
              </span>
            )}
          </div>
        </div>

        {/* Weekly Map Info Card for medium size*/}
        {challengeType === 'weekly' && weeklyMapInfo && size === 'medium' && (
          <div className="mb-4 flex-shrink-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 shadow-sm transition-all duration-300 group-hover:bg-white/70 group-hover:shadow-md">
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
            <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 ${size === 'large' ? 'w-12 h-12' : ''}`}>
              <Users className={`${config.iconSize} text-primary-600`} />
            </div>
            <p className={`${config.numberSize} font-bold text-neutral-800`}>
              {challenge.participant_count || 0}
            </p>
            <p className="text-xs text-neutral-600 font-medium">Players</p>
          </div>
          
          <div className="text-center">
            <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 ${size === 'large' ? 'w-12 h-12' : ''}`}>
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
              <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 ${size === 'large' ? 'w-12 h-12' : ''}`}>
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
      </div>
    </div>
  );
}