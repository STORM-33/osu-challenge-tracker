import FormattedDescription from '../lib/text-formatting';
import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ExpandedPartnerModal({ partner, isVisible, onClose, startPosition }) {
  const modalRef = useRef(null);
  const [animationPhase, setAnimationPhase] = useState('entering');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isVisible) {
      setAnimationPhase('entering');
      // Prevent body scroll on mobile
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
      setTimeout(() => setAnimationPhase('expanded'), 50);
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
    }
  }, [isVisible, isMobile]);

  const handleClose = () => {
    setAnimationPhase('exiting');
    setTimeout(() => {
      document.body.style.overflow = '';
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle touch events for mobile
  const handleTouchStart = useRef(null);
  const handleTouchMove = (e) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const startY = handleTouchStart.current;
    
    if (startY && touch.clientY - startY > 100) {
      // Swipe down to close on mobile
      handleClose();
    }
  };

  const handleTouchStartCapture = (e) => {
    if (isMobile) {
      handleTouchStart.current = e.touches[0].clientY;
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isVisible]);

  if (!isVisible && animationPhase === 'exiting') return null;
  if (!partner) return null;

  const getTransformStyle = () => {
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
  };

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center transition-all duration-300
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
          relative glass-2 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-out
          ${isMobile 
            ? 'w-full max-w-sm max-h-[90vh] rounded-2xl' 
            : 'w-full max-w-2xl'
          }
        `}
        style={getTransformStyle()}
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
            <div className={`
              rounded-3xl overflow-hidden bg-white shadow-lg border-3 !border-white/60
              ${isMobile ? 'w-20 h-20 rounded-2xl' : 'w-24 h-24'}
            `}>
              <img
                src={partner.icon_url}
                alt={partner.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name)}&background=9333ea&color=fff&size=256`;
                }}
              />
            </div>
            <div className={isMobile ? 'text-center' : ''}>
              <h2 className={`
                font-bold text-white mb-2 text-shadow-adaptive-lg
                ${isMobile ? 'text-2xl' : 'text-3xl'}
              `}>
                {partner.name}
              </h2>
              <div className={`
                text-white/80 text-shadow-adaptive-sm
                ${isMobile ? 'text-xs' : 'text-sm'}
              `}>
                Partnership Spotlight
              </div>
            </div>
          </div>

          {/* Description with Formatting Support */}
          <div 
            className={`
              transition-all duration-500 delay-100
              ${animationPhase === 'expanded' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
          >
            <h3 className={`
              font-semibold text-white mb-3 text-shadow-adaptive
              ${isMobile ? 'text-base' : 'text-lg'}
            `}>
              About This Partnership
            </h3>
            
            {/* Use FormattedDescription if description exists, otherwise fallback */}
            {partner.description ? (
              <div className={`
                text-white/90 leading-relaxed text-shadow-adaptive-sm
                ${isMobile ? 'text-sm' : 'text-base'}
              `}>
                <FormattedDescription 
                  text={partner.description} 
                  className="[&_strong]:text-white [&_em]:text-white/95 [&_a]:text-purple-300 [&_a:hover]:text-purple-200 [&_code]:bg-white/20 [&_code]:text-purple-200 [&_mark]:bg-yellow-400/30 [&_mark]:text-yellow-100"
                />
              </div>
            ) : (
              <p className={`
                text-white/90 leading-relaxed text-shadow-adaptive-sm
                ${isMobile ? 'text-sm' : 'text-base'}
              `}>
                Learn more about our partnership with {partner.name} and discover how this collaboration enhances your gaming experience. Click the link below to explore their platform and connect with their community.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};