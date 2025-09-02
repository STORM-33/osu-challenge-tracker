// frontend/components/TeamCard.js - Optimized version
import { Github, Twitter, ExternalLink, User } from 'lucide-react';
import { memo, useMemo } from 'react';

const TeamCard = memo(function TeamCard({ 
  member, 
  size = 'medium', 
  onClick = null,
  isExpanded = false,
  cardRef = null 
}) {
  const sizeConfig = {
    small: {
      avatarSize: 'w-16 h-16',
      textSize: 'text-sm',
      roleTextSize: 'text-xs',
      padding: 'p-3',
      gap: 'gap-2'
    },
    medium: {
      avatarSize: 'w-20 h-20',
      textSize: 'text-base',
      roleTextSize: 'text-sm',
      padding: 'p-4',
      gap: 'gap-3'
    },
    large: {
      avatarSize: 'w-24 h-24',
      textSize: 'text-lg',
      roleTextSize: 'text-base',
      padding: 'p-6',
      gap: 'gap-4'
    }
  };

  const config = sizeConfig[size];

  // Memoize expensive computations
  const avatarUrl = useMemo(() => 
    member.avatar_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=9333ea&color=fff&size=256`,
    [member.avatar_url, member.name]
  );

  const roleBadgeClass = useMemo(() => {
    const roleLower = member.role.toLowerCase();
    if (roleLower.includes('lead') || roleLower.includes('project')) {
      return 'staff-badge staff-badge-lead';
    } else if (roleLower.includes('develop') || roleLower.includes('engineer')) {
      return 'staff-badge staff-badge-developer';
    } else if (roleLower.includes('design') || roleLower.includes('ui') || roleLower.includes('ux')) {
      return 'staff-badge staff-badge-designer';
    } else if (roleLower.includes('map') || roleLower.includes('beat')) {
      return 'staff-badge staff-badge-mapper';
    } else if (roleLower.includes('community') || roleLower.includes('manager')) {
      return 'staff-badge staff-badge-strategist';
    } else if (roleLower.includes('qa') || roleLower.includes('test')) {
      return 'staff-badge staff-badge-qa';
    } else if (roleLower.includes('artist') || roleLower.includes('art')) {
      return 'staff-badge staff-badge-artist';
    } else {
      return 'staff-badge staff-badge-strategist';
    }
  }, [member.role]);

  // Optimize social links rendering
  const socialLinks = useMemo(() => {
    if (!member.social_links || Object.keys(member.social_links).length === 0) {
      return null;
    }

    return (
      <div className="flex items-center gap-1 mt-2">
        {member.social_links.github && (
          <a 
            href={`https://github.com/${member.social_links.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 glass-1 rounded-lg hover:glass-2 transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Github className="w-3 h-3 text-white/80" />
          </a>
        )}
        {member.social_links.twitter && (
          <a 
            href={`https://twitter.com/${member.social_links.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 glass-1 rounded-lg hover:glass-2 transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Twitter className="w-3 h-3 text-white/80" />
          </a>
        )}
        {member.social_links.discord && (
          <div className="p-1 glass-1 rounded-lg">
            <span className="text-xs text-white/60" title={`Discord: ${member.social_links.discord}`}>
              💬
            </span>
          </div>
        )}
        {member.osu_username && (
          <a 
            href={`https://osu.ppy.sh/users/${member.osu_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 glass-1 rounded-lg hover:glass-2 transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3 text-white/80" />
          </a>
        )}
      </div>
    );
  }, [member.social_links, member.osu_username]);

  const handleImageError = useMemo(() => (e) => {
    e.target.onerror = null;
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=9333ea&color=fff&size=256`;
  }, [member.name]);

  return (
    <div
      ref={cardRef}
      onClick={() => onClick && onClick(member)}
      className={`
        group cursor-pointer transition-all duration-300 ease-out will-change-transform
        ${isExpanded ? 'opacity-0 pointer-events-none' : 'hover:scale-[1.02]'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <div className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl glass-2">
        
        {/* Content */}
        <div className={`relative z-10 ${config.padding} flex flex-col items-center ${config.gap}`}>
          {/* Avatar */}
          <div className={`${config.avatarSize} rounded-2xl overflow-hidden bg-white shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:scale-110 group-hover:rounded-xl avatar-border`}>
            <img
              src={avatarUrl}
              alt={member.name}
              className="w-full h-full object-cover"
              onError={handleImageError}
              loading="lazy"
            />
          </div>
          
          {/* Member info */}
          <div className="text-center">
            <h3 className={`${config.textSize} font-semibold text-white group-hover:text-white transition-colors duration-300 text-shadow-adaptive mb-1`}>
              {member.name}
            </h3>
            
            {/* Role badge */}
            <div className={roleBadgeClass}>
              {member.role}
            </div>

            {/* Social links - only show if not clicking for modal */}
            {!onClick && size !== 'small' && socialLinks}
            
            {/* Bio preview (if available and not small size) - Hidden when morphing is enabled */}
            {member.bio && size !== 'small' && !onClick && (
              <p className="text-xs text-white/70 mt-2 line-clamp-2 max-w-[150px] text-shadow-adaptive-sm">
                {member.bio}
              </p>
            )}
          </div>
          
          {/* Click indicator */}
          {onClick && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <User className="w-4 h-4 text-white/80" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default TeamCard;