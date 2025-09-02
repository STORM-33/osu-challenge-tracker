import { Calendar, Users, Music, Star } from 'lucide-react';

export default function ChallengeCard({ 
  challenge, 
  size = 'medium', 
  challengeType = 'monthly', // 'weekly', 'monthly', or 'custom'
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

  const getDifficultyClass = (difficulty) => {
  // Use osu!'s difficulty ranges with glassmorphism styling
  if (difficulty < 1.25) return 'difficulty-star-easy';
  if (difficulty < 2.0) return 'difficulty-star-easy-normal';
  if (difficulty < 2.5) return 'difficulty-star-normal';
  if (difficulty < 3.3) return 'difficulty-star-normal-hard';
  if (difficulty < 4.2) return 'difficulty-star-hard';
  if (difficulty < 4.9) return 'difficulty-star-hard-insane';
  if (difficulty < 5.8) return 'difficulty-star-insane';
  if (difficulty < 6.7) return 'difficulty-star-insane-expert';
  if (difficulty < 7.7) return 'difficulty-star-expert';
  return 'difficulty-star-expert-plus';
};

  const timeRemaining = getTimeRemaining(challenge.end_date);
  
  // Display name: custom_name takes priority over name
  const displayName = challenge.custom_name || challenge.name;

  // Get background image and map info
  const backgroundImage = challenge.playlists?.[0]?.beatmap_cover_url;
  const mapInfo = challenge.playlists?.[0];

  // Get badge class based on challenge type
  const getBadgeClass = () => {
    switch(challengeType) {
      case 'weekly':
        return 'challenge-badge-weekly';
      case 'monthly':
        return 'challenge-badge-monthly';
      case 'custom':
        return 'challenge-badge-custom';
      default:
        return 'challenge-badge-monthly';
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      cardClass: 'h-48',
      padding: 'p-2 sm:p-3',
      textSize: 'text-xs',
      titleSize: 'text-sm',
      iconSize: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
      numberSize: 'text-sm sm:text-base',
      badgeScale: 'scale-90',
      iconPadding: 'p-1 sm:p-1.5'
    },
    medium: {
      cardClass: 'h-56 sm:h-64',
      padding: 'p-3 sm:p-4',
      textSize: 'text-xs sm:text-sm',
      titleSize: 'text-base sm:text-lg',
      iconSize: 'w-3 h-3 sm:w-4 sm:h-4',
      numberSize: 'text-base sm:text-lg md:text-xl',
      badgeScale: '',
      iconPadding: 'p-1 sm:p-1.5 md:p-2'
    },
    large: {
      cardClass: 'h-72 sm:h-80',
      padding: 'p-4 sm:p-5 md:p-6',
      textSize: 'text-sm sm:text-base',
      titleSize: 'text-lg sm:text-xl',
      iconSize: 'w-4 h-4 sm:w-5 sm:h-5',
      numberSize: 'text-lg sm:text-xl md:text-2xl',
      badgeScale: 'sm:scale-110',
      iconPadding: 'p-1.5 sm:p-2 md:p-2.5'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`group relative overflow-hidden glass-3 rounded-xl sm:rounded-2xl ${config.cardClass} transition-shadow duration-300 hover:shadow-2xl cursor-pointer`}>
      
      {/* Top 80% - Background Image Section */}
      <div className="relative h-[80%] overflow-hidden">
        {backgroundImage ? (
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.8)'
          }}
        >
          {/* Enhanced gradient overlay with side shadows */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {/* Left shadow */}
          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/50 to-transparent" />
          {/* Right shadow */}
          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/50 to-transparent" />
          {/* Bottom shadow (enhanced) */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-600/30" />
      )}

        {/* Challenge Type Badge - Top Right */}
        <div className={`absolute top-3 right-3 z-20 ${config.badgeScale}`}>
          <span className={getBadgeClass()}>
            {challengeType.charAt(0).toUpperCase() + challengeType.slice(1)}
          </span>
        </div>

        {/* Challenge Name on Image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          {/* Difficulty Star Rating - Above challenge name */}
          {mapInfo?.beatmap_difficulty && (
            <div className="mb-2">
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.textSize} font-bold text-white text-shadow-adaptive-sm ${getDifficultyClass(mapInfo.beatmap_difficulty)}`}>
                <Star className="w-3 h-3 fill-current" />
                <span>{mapInfo.beatmap_difficulty.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <h3 className={`${config.titleSize} font-bold text-white mb-1 line-clamp-2 text-shadow-adaptive-lg`}>
            {displayName}
          </h3>
          
          {/* Map Info */}
          {mapInfo && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-3 sm:gap-5 md:gap-8 text-white/80 flex-wrap">
                <span className={`${config.textSize} font-semibold text-white text-shadow-adaptive truncate`}>
                  {mapInfo.beatmap_title}
                </span>
                <span className={`${config.textSize} text-shadow-adaptive-sm truncate`}>
                  by {mapInfo.beatmap_artist}
                </span>
                {mapInfo.beatmap_version && (
                  <span className={`${config.textSize} text-white/70 text-shadow-adaptive-sm truncate`}>
                    [{mapInfo.beatmap_version}]
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 20% - Stats Bar */}
      <div className="h-[20%] bg-black/40 backdrop-blur-sm border-t border-white/10">
        <div className={`h-full flex items-center ${config.padding}`}>
          <div className="flex gap-6 lg:gap-20">
            {/* Players - Red */}
            <div className="flex items-center gap-3">
              <div className={`${config.iconPadding} icon-gradient-red rounded-lg icon-container-red`}>
                <Users className={`${config.iconSize} text-white icon-shadow-adaptive-sm`} />
              </div>
              <div className="lg:flex lg:items-center lg:gap-1.5">
                <p className={`${config.numberSize} font-bold text-white leading-tight text-shadow-adaptive`}>
                  {challenge.participant_count || 0}
                </p>
                <p className={`${config.textSize} lg:text-2xl text-white/70 font-bold leading-tight text-shadow-adaptive-sm`}>
                  Players
                </p>
              </div>
            </div>

            {/* Maps - Dark Purple */}
            <div className="flex items-center gap-3">
              <div className={`${config.iconPadding} icon-gradient-dark-purple rounded-lg icon-container-dark-purple`}>
                <Music className={`${config.iconSize} text-white icon-shadow-adaptive-sm`} />
              </div>
              <div className="lg:flex lg:items-center lg:gap-1.5">
                <p className={`${config.numberSize} font-bold text-white leading-tight text-shadow-adaptive`}>
                  {challenge.playlists?.length || 0}
                </p>
                <p className={`${config.textSize} lg:text-2xl text-white/70 font-bold leading-tight text-shadow-adaptive-sm`}>
                  {challenge.playlists?.length === 1 ? 'Map' : 'Maps'}
                </p>
              </div>
            </div>

            {/* Time - Green */}
            <div className="flex items-center gap-3">
              <div className={`${config.iconPadding} icon-gradient-green rounded-lg icon-container-green`}>
                <Calendar className={`${config.iconSize} text-white icon-shadow-adaptive-sm`} />
              </div>
              <div className="lg:flex lg:items-center lg:gap-1.5">
                {timeRemaining && !timeRemaining.expired ? (
                  <>
                    <p className={`${config.numberSize} font-bold text-white leading-tight text-shadow-adaptive`}>
                      {timeRemaining.days || timeRemaining.hours || timeRemaining.minutes}
                    </p>
                    <p className={`${config.textSize} lg:text-2xl text-white/70 font-bold leading-tight text-shadow-adaptive-sm`}>
                      {timeRemaining.label}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`${config.numberSize} font-bold ${timeRemaining?.expired ? 'text-red-400' : 'text-green-400'} leading-tight text-shadow-adaptive`}>
                      {timeRemaining?.expired ? 'Ended' : 'Active'}
                    </p>
                    <p className={`${config.textSize} lg:text-2xl text-white/70 font-bold leading-tight text-shadow-adaptive-sm`}>
                      Status
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}