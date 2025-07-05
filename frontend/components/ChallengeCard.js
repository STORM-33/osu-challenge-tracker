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

  const getTimeRemaining = (endDate) => {
    if (!endDate) return null;
    
    // Force UTC interpretation by adding 'Z' if not present
    const utcDateString = endDate.includes('Z') || endDate.includes('+') || endDate.includes('T') && endDate.length > 19 
      ? endDate 
      : endDate + 'Z';
    
    const end = new Date(utcDateString);
    const now = new Date();
    
    if (isNaN(end.getTime())) return null;
    
    const totalMs = end - now;
    if (totalMs <= 0) return { expired: true };
    
    const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return { days, label: days === 1 ? 'Day left' : 'Days left' };
    } else if (hours > 0) {
      return { hours, label: hours === 1 ? 'Hour left' : 'Hours left' };
    } else if (minutes > 0) {
      return { minutes, label: minutes === 1 ? 'Minute left' : 'Minutes left' };
    } else {
      return { expired: true };
    }
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

  const timeRemaining = getTimeRemaining(challenge.end_date);
  
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
      
      {/* Background Layer */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          clipPath: 'inset(0 round 1rem)',
          contain: 'layout style paint'
        }}
      >
        {/* Use your CSS glass card class instead of multiple layers */}
        <div className="glass-card absolute inset-0 rounded-2xl" />
        
        {/* Weekly challenge background with gradual image reveal */}
        {size === 'large' && challengeType === 'weekly' && weeklyBackgroundImage && (
          <>
            {/* Background image with gradient mask */}
            <div 
              className="absolute inset-0 opacity-80 group-hover:opacity-90 transition-opacity duration-300 ease-out rounded-2xl"
              style={{ 
                backgroundImage: `url(${weeklyBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                // Smooth gradient mask that gradually reveals image
                maskImage: 'linear-gradient(90deg, transparent 0%, transparent 25%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,1) 90%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, transparent 25%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,1) 90%)',
              }}
            />
            
            {/* Additional gradient overlay for better text contrast on the left */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 40%, rgba(255, 255, 255, 0.1) 60%, transparent 80%)',
              }}
            />
          </>
        )}
        
        {/* Decorative elements */}
        <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-gradient-to-tr from-white/5 to-transparent transition-all duration-300 ease-out group-hover:scale-110 group-hover:from-white/10" />
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
                  <Music className="w-4 h-4 inline-block mr-1 text-blue-500 icon-glow-sm" />
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
            {/* Challenge type badge - more transparent */}
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm transition-all duration-300 group-hover:shadow-md backdrop-blur-sm ${
              challengeType === 'weekly' 
                ? 'text-blue-700 bg-blue-200/80 border border-blue-300/60 group-hover:bg-blue-300/80'
                : 'text-purple-700 bg-purple-200/80 border border-purple-300/60 group-hover:bg-purple-300/80'
            }`}>
              {challengeType === 'weekly' ? 'Weekly' : 'Monthly'}
            </span>
            
            {/* Season badge - more transparent */}
            {showSeasonBadge && challenge.seasons && size !== 'small' && (
              <span className="text-xs text-neutral-600 bg-neutral-200/80 px-2 py-1 rounded-full font-medium border border-neutral-300/60 transition-all duration-300 group-hover:bg-neutral-300/80 backdrop-blur-sm">
                {challenge.seasons.name}
              </span>
            )}
          </div>
        </div>

        {/* Weekly Map Info Card for medium size - more transparent */}
        {challengeType === 'weekly' && weeklyMapInfo && size === 'medium' && (
          <div className="mb-4 flex-shrink-0">
            <div className="bg-white/40 backdrop-blur-sm rounded-xl p-4 border border-blue-200/40 shadow-sm transition-all duration-300 group-hover:bg-white/50 group-hover:shadow-md">
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
            <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-primary-100/80 to-primary-200/80 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 backdrop-blur-sm ${size === 'large' ? 'w-12 h-12' : ''}`}>
              <Users className={`${config.iconSize} text-primary-600`} />
            </div>
            <p className={`${config.numberSize} font-bold text-neutral-800`}>
              {challenge.participant_count || 0}
            </p>
            <p className="text-xs text-neutral-600 font-medium">Players</p>
          </div>
          
          <div className="text-center">
            <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-purple-100/80 to-purple-200/80 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 backdrop-blur-sm ${size === 'large' ? 'w-12 h-12' : ''}`}>
              <Music className={`${config.iconSize} text-purple-600`} />
            </div>
            <p className={`${config.numberSize} font-bold text-neutral-800`}>
              {challenge.playlists?.length || 0}
            </p>
            <p className="text-xs text-neutral-600 font-medium">Maps</p>
          </div>
          
          {/* Time remaining with new precise display */}
          {config.showDays && (
            <div className="text-center">
              <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-green-100/80 to-green-200/80 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 backdrop-blur-sm ${size === 'large' ? 'w-12 h-12' : ''}`}>
                <Calendar className={`${config.iconSize} text-green-600`} />
              </div>
              {timeRemaining && !timeRemaining.expired ? (
                <>
                  <p className={`${config.numberSize} font-bold text-neutral-800`}>
                    {timeRemaining.days || timeRemaining.hours || timeRemaining.minutes}
                  </p>
                  <p className="text-xs text-neutral-600 font-medium">{timeRemaining.label}</p>
                </>
              ) : (
                <>
                  <p className={`${size === 'large' ? 'text-base' : 'text-sm'} font-bold ${timeRemaining?.expired ? 'text-red-600' : 'text-green-600'}`}>
                    {timeRemaining?.expired ? 'Ended' : 'Active'}
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