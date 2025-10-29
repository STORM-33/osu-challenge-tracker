import FormattedDescription from '../lib/text-formatting';
import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { X, Github, Twitter, ExternalLink } from 'lucide-react';

const ExpandedTeamModal = memo(function ExpandedTeamModal({ 
  member, 
  isVisible, 
  onClose, 
  startPosition 
}) {
  const modalRef = useRef(null);
  const [animationPhase, setAnimationPhase] = useState('entering');
  const [isMobile, setIsMobile] = useState(false);
  
  // ))) state 
  const [clickCount, setClickCount] = useState(0);
  const [joke, setJoke] = useState(null);
  const [showJokeModal, setShowJokeModal] = useState(false);
  const [jokeAnimating, setJokeAnimating] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-dismiss ))) panel after animation + 3 seconds
  useEffect(() => {
    if (showJokeModal) {
      const timer = setTimeout(() => {
        setJokeAnimating(true);
        setTimeout(() => {
          setShowJokeModal(false);
          setJokeAnimating(false);
        }, 4000);
      }, 7000);
      
      return () => clearTimeout(timer);
    }
  }, [showJokeModal]);

  useEffect(() => {
    if (isVisible) {
      setAnimationPhase('entering');
      // Reset ))) state when modal opens
      setClickCount(0);
      setJoke(null);
      setShowJokeModal(false);
      
      // Prevent body scroll on mobile
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
      const timer = setTimeout(() => setAnimationPhase('expanded'), 50);
      return () => clearTimeout(timer);
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
    }
  }, [isVisible, isMobile]);

  // ))) click handler
  const handleAvatarClick = useCallback(async () => {
    if (member?.id !== 2 && member?.name !== 'Storm') {
      return;
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount === 10) {
      try {
        const response = await fetch('https://icanhazdadjoke.com/', {
          headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();
        setJoke(data.joke);
        setShowJokeModal(true);
        setClickCount(0);
      } catch (error) {
        console.error('Error fetching joke:', error);
        setJoke("Why did the programmer quit his job? Because he didn't get arrays! 🎮");
        setShowJokeModal(true);
        setClickCount(0);
      }
    }

    // Reset counter after 3 seconds of inactivity
    setTimeout(() => {
      if (newCount < 10) {
        setClickCount(0);
      }
    }, 3000);
  }, [clickCount, member]);

  const handleClose = useCallback(() => {
    setAnimationPhase('exiting');
    const timer = setTimeout(() => {
      document.body.style.overflow = '';
      onClose();
    }, 300);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Handle touch events for mobile
  const handleTouchStart = useRef(null);
  const handleTouchMove = useCallback((e) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const startY = handleTouchStart.current;
    
    if (startY && touch.clientY - startY > 100) {
      // Swipe down to close on mobile
      handleClose();
    }
  }, [isMobile, handleClose]);

  const handleTouchStartCapture = useCallback((e) => {
    if (isMobile) {
      handleTouchStart.current = e.touches[0].clientY;
    }
  }, [isMobile]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isVisible) {
        if (showJokeModal) {
          setShowJokeModal(false);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isVisible, handleClose, showJokeModal]);

  // Memoize expensive computations
  const avatarUrl = useMemo(() => 
    member?.avatar_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name || '')}&background=9333ea&color=fff&size=256`,
    [member?.avatar_url, member?.name]
  );

  const roleBadgeClass = useMemo(() => {
    if (!member?.role) return 'staff-badge staff-badge-strategist';
    
    const roleLower = member.role.toLowerCase();
    if (roleLower.includes('lead') || roleLower.includes('project')) {
      return 'staff-badge staff-badge-lead';
    } else if (roleLower.includes('develop') || roleLower.includes('engineer') || roleLower.includes('program')) {
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
    } else if (roleLower.includes('composer') || roleLower.includes('music')) {
      return 'staff-badge staff-badge-composer';
    } else {
      return 'staff-badge staff-badge-strategist';
    }
  }, [member?.role]);

  const getTransformStyle = useMemo(() => {
    if (!startPosition) return {};
    
    // Responsive modal dimensions
    const modalWidth = isMobile ? Math.min(window.innerWidth - 32, 400) : 600;
    const modalHeight = isMobile ? Math.min(window.innerHeight - 64, 600) : 500;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const centerX = viewportWidth / 2 - modalWidth / 2;
    const centerY = viewportHeight / 2 - modalHeight / 2;
    
    // Smaller scale start for mobile
    const scaleStart = isMobile 
      ? Math.min(60 / modalWidth, 60 / modalHeight)
      : Math.min(80 / modalWidth, 80 / modalHeight);
    
    if (animationPhase === 'entering') {
      return {
        transform: `translate(${startPosition.x - centerX}px, ${startPosition.y - centerY}px) scale(${scaleStart})`,
        opacity: 1,
      };
    } else if (animationPhase === 'expanded') {
      return {
        transform: 'translate(0px, 0px) scale(1)',
        opacity: 1,
      };
    } else {
      return {
        transform: `translate(${startPosition.x - centerX}px, ${startPosition.y - centerY}px) scale(${scaleStart})`,
        opacity: 0,
      };
    }
  }, [startPosition, animationPhase, isMobile]);

  // Render social links
  const socialLinks = useMemo(() => {
    const hasSocialLinks = member?.social_links && Object.keys(member.social_links).length > 0;
    const hasOsuProfile = member?.osu_username;
    
    if (!hasSocialLinks && !hasOsuProfile) {
      return null;
    }

    return (
      <div className="flex items-center gap-3 mt-4 flex-wrap justify-center md:justify-start">
        {member.social_links?.github && (
          <a 
            href={`https://github.com/${member.social_links.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200"
          >
            <Github className="w-4 h-4 text-white/90" />
            <span className="text-sm text-white/90 text-shadow-adaptive-sm">GitHub</span>
          </a>
        )}
        {member.social_links?.twitter && (
          <a 
            href={`https://twitter.com/${member.social_links.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200"
          >
            <Twitter className="w-4 h-4 text-white/90" />
            <span className="text-sm text-white/90 text-shadow-adaptive-sm">Twitter</span>
          </a>
        )}
        {member.social_links?.discord && (
          <div className="flex items-center gap-2 px-3 py-2 glass-2 rounded-lg">
            <span className="text-sm">💬</span>
            <span className="text-sm text-white/90 text-shadow-adaptive-sm" title={`Discord: ${member.social_links.discord}`}>
              {member.social_links.discord}
            </span>
          </div>
        )}
        {member?.social_links?.website && (
          <a 
            href={member.social_links.website.startsWith('http') ? member.social_links.website : `https://${member.social_links.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4 text-white/90" />
            <span className="text-sm text-white/90 text-shadow-adaptive-sm">Website</span>
          </a>
        )}
        {member?.social_links?.youtube && (
          <a 
            href={member.social_links.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200"
          >
            <span className="text-sm">▶</span>
            <span className="text-sm text-white/90 text-shadow-adaptive-sm">YouTube</span>
          </a>
        )}
        {member.osu_username && (
          <a 
            href={`https://osu.ppy.sh/users/${member.osu_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4 text-white/90" />
            <span className="text-sm text-white/90 text-shadow-adaptive-sm">osu! Profile</span>
          </a>
        )}
      </div>
    );
  }, [member?.social_links, member?.osu_username]);

  const handleImageError = useCallback((e) => {
    e.target.onerror = null;
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name || '')}&background=9333ea&color=fff&size=256`;
  }, [member?.name]);

  if (!isVisible && animationPhase === 'exiting') return null;
  if (!member) return null;

  return (
    <>
      <div
        className={`
          fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 will-change-transform
          ${isMobile ? 'p-4' : 'p-4'}
          ${animationPhase === 'expanded' ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'}
        `}
        onClick={handleBackdropClick}
        onTouchStart={handleTouchStartCapture}
        onTouchMove={handleTouchMove}
      >
        <div
          ref={modalRef}
          className={`
            relative glass-2 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-out will-change-transform
            ${isMobile 
              ? 'w-full max-w-sm max-h-[90vh] rounded-2xl' 
              : 'w-full max-w-2xl'
            }
          `}
          style={getTransformStyle}
        >
          {/* Mobile swipe indicator */}
          {isMobile && (
            <div className={`
              absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white/40 rounded-full
              transition-opacity duration-300
              ${animationPhase === 'expanded' ? 'opacity-100' : 'opacity-0'}
            `} />
          )}

          {/* Close Button */}
          <button
            onClick={handleClose}
            className={`
              absolute z-10 glass-2 hover:glass-3 rounded-full transition-all duration-200 hover:scale-110 text-white
              ${isMobile ? 'top-4 right-4 p-1.5' : 'top-6 right-6 p-2'}
              ${animationPhase === 'expanded' ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <X className={`icon-shadow-adaptive-sm ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>

          {/* Content */}
          <div className={`
            overflow-y-auto max-h-full
            ${isMobile ? 'pt-6 px-5 pb-5' : 'pt-8 px-8 pb-6'}
          `}>
            {/* Header */}
            <div className={`
              flex items-center mb-6
              ${isMobile ? 'gap-4 flex-col text-center' : 'gap-6'}
            `}>
              <div 
                onClick={handleAvatarClick}
                className={`
                  rounded-3xl overflow-hidden bg-white shadow-lg avatar-border
                  ${isMobile ? 'w-20 h-20 rounded-2xl' : 'w-24 h-24'}
                  ${member?.id === 2 || member?.name === 'Storm' ? 'cursor-pointer' : ''}
                `}
              >
                <img
                  src={avatarUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
              <div className={isMobile ? 'text-center' : ''}>
                <h2 className={`
                  font-bold text-white mb-2 text-shadow-adaptive-lg
                  ${isMobile ? 'text-2xl' : 'text-3xl'}
                `}>
                  {member.name}
                </h2>
                <div className={roleBadgeClass}>
                  {member.role}
                </div>
              </div>
            </div>

            {/* Bio with Formatting Support */}
            <div 
              className={`
                transition-all duration-500 delay-100
                ${animationPhase === 'expanded' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
            >
              {member.bio && (
                <>
                  <h3 className={`
                    font-semibold text-white mb-3 text-shadow-adaptive
                    ${isMobile ? 'text-base' : 'text-lg'}
                  `}>
                    About {member.name}
                  </h3>
                  
                  <div className={`
                    text-white/90 leading-relaxed text-shadow-adaptive-sm mb-4
                    ${isMobile ? 'text-sm' : 'text-base'}
                  `}>
                    <FormattedDescription 
                      text={member.bio} 
                      className="[&_strong]:text-white [&_em]:text-white/95 [&_a]:text-purple-300 [&_a:hover]:text-purple-200 [&_code]:bg-white/20 [&_code]:text-purple-200 [&_mark]:bg-yellow-400/30 [&_mark]:text-yellow-100"
                    />
                  </div>
                </>
              )}

              {/* Social Links */}
              {socialLinks}
            </div>
          </div>
        </div>
      </div>

      {/* ))) Panel */}
      {showJokeModal && (
        <div 
          className="fixed top-0 left-0 right-0 z-[60] p-4"
          style={{
            animation: jokeAnimating 
              ? 'slideUpSlow 4s ease-in forwards' 
              : 'slideDownSlow 4s ease-out forwards'
          }}
        >
          <style jsx>{`
            @keyframes slideDownSlow {
              from {
                transform: translateY(-100%);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            @keyframes slideUpSlow {
              from {
                transform: translateY(0);
                opacity: 1;
              }
              to {
                transform: translateY(-100%);
                opacity: 0;
              }
            }
          `}</style>
          
          <div 
            className="bg-white rounded-lg p-6 max-w-md mx-auto shadow-lg"
          >
            <p className="text-gray-800 text-center leading-relaxed">
              {joke}
            </p>
          </div>
        </div>
      )}
    </>
  );
});

export default ExpandedTeamModal;