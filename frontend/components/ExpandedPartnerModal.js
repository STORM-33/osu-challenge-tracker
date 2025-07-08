import FormattedDescription from '../lib/text-formatting';
import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ExpandedPartnerModal({ partner, isVisible, onClose, startPosition }) {
  const modalRef = useRef(null);
  const [animationPhase, setAnimationPhase] = useState('entering');

  useEffect(() => {
    if (isVisible) {
      setAnimationPhase('entering');
      setTimeout(() => setAnimationPhase('expanded'), 50);
    }
  }, [isVisible]);

  const handleClose = () => {
    setAnimationPhase('exiting');
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
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
    
    const modalWidth = 600;
    const modalHeight = 500;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const centerX = viewportWidth / 2 - modalWidth / 2;
    const centerY = viewportHeight / 2 - modalHeight / 2;
    
    const scaleStart = Math.min(80 / modalWidth, 80 / modalHeight);
    
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
        fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300
        ${animationPhase === 'expanded' ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'}
      `}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl glass-2 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-out"
        style={getTransformStyle()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`
            absolute top-6 right-6 z-10 p-2 glass-2 hover:glass-3 rounded-full transition-all duration-200 hover:scale-110 text-white
            ${animationPhase === 'expanded' ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <X className="w-5 h-5 icon-shadow-adaptive-sm" />
        </button>

        {/* Content */}
        <div className="pt-8 px-8 pb-6">
          {/* Header */}
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-white shadow-lg border-3 !border-white/60">
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
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 text-shadow-adaptive-lg">{partner.name}</h2>
              <div className="text-sm text-white/80 text-shadow-adaptive-sm">Partnership Spotlight</div>
            </div>
          </div>

          {/* Description with Formatting Support */}
          <div 
            className={`
                transition-all duration-500 delay-100
                ${animationPhase === 'expanded' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
            >
            <h3 className="text-lg font-semibold text-white mb-3 text-shadow-adaptive">About This Partnership</h3>
            
            {/* Use FormattedDescription if description exists, otherwise fallback */}
            {partner.description ? (
              <div className="text-white/90 leading-relaxed text-base text-shadow-adaptive-sm">
                <FormattedDescription 
                  text={partner.description} 
                  className="[&_strong]:text-white [&_em]:text-white/95 [&_a]:text-purple-300 [&_a:hover]:text-purple-200 [&_code]:bg-white/20 [&_code]:text-purple-200 [&_mark]:bg-yellow-400/30 [&_mark]:text-yellow-100"
                />
              </div>
            ) : (
              <p className="text-white/90 leading-relaxed text-base text-shadow-adaptive-sm">
                Learn more about our partnership with {partner.name} and discover how this collaboration enhances your gaming experience. Click the link below to explore their platform and connect with their community.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};