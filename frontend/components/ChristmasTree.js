import { useState } from 'react';

export default function ChristmasTree({ position = 'fixed' }) {
  const [isShaking, setIsShaking] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const playAudio = () => {
    const audioFiles = [
        '/christmas/audio_Si5PjM5D.mp3',
        '/christmas/audio_PU4zkIzK.mp3',
        '/christmas/audio_ApBIZqNs.mp3',
        '/christmas/audio_YIePuI14.mp3',
        '/christmas/audio_qUoOspeX.mp3',
        '/christmas/audio_fmdV2nYe.mp3',
        '/christmas/audio_eQwLDsqb.mp3',
        '/christmas/audio_KB8w61qk.mp3'
    ];
    
    // Pick a random audio file
    const randomAudio = audioFiles[Math.floor(Math.random() * audioFiles.length)];
    
    // Random playback speed between 0.5x and 2x
    const randomSpeed = 0.5 + Math.random() * 1.5;
    
    const audio = new Audio(randomAudio);
    audio.playbackRate = randomSpeed;
    audio.play();

    // Shake animation
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    // Track clicks for easter egg
    setClickCount(prev => prev + 1);
  };

  return (
    <>
      <div 
        className={`fixed bottom-8 right-8 z-50 cursor-pointer transition-transform hover:scale-110 ${
          isShaking ? 'animate-shake' : ''
        } ${clickCount > 10 ? 'animate-spin-slow' : ''}`}
        onClick={playAudio}
      >
        <svg 
          width="100" 
          height="120" 
          viewBox="0 0 100 120" 
          className="drop-shadow-2xl"
        >
          {/* Tree trunk */}
          <rect x="42" y="95" width="16" height="15" rx="2" fill="#5D4037" />
          
          {/* Tree layers - Bottom Tier */}
          <path d="M20 95 L50 65 L80 95 Z" fill="#1B5E20" />
          {/* Tree layers - Middle Tier */}
          <path d="M25 75 L50 45 L75 75 Z" fill="#2E7D32" />
          {/* Tree layers - Top Tier */}
          <path d="M32 55 L50 25 L68 55 Z" fill="#388E3C" />
          
          {/* Ornaments */}
          <circle cx="35" cy="85" r="3.5" fill="#ef4444" className="ornament-pulse" />
          <circle cx="65" cy="85" r="3.5" fill="#eab308" className="ornament-pulse" style={{animationDelay: '0.3s'}} />
          <circle cx="50" cy="70" r="3.5" fill="#3b82f6" className="ornament-pulse" style={{animationDelay: '0.6s'}} />
          <circle cx="40" cy="55" r="3.5" fill="#eab308" className="ornament-pulse" style={{animationDelay: '0.9s'}} />
          <circle cx="60" cy="55" r="3.5" fill="#ef4444" className="ornament-pulse" style={{animationDelay: '1.2s'}} />
          
          {/* Star on top */}
          <polygon 
            points="50,15 53,23 61,23 55,28 57,36 50,31 43,36 45,28 39,23 47,23" 
            fill="#FFD600"
            className="star-twinkle"
          />
          
          {/* Glow effect */}
          <circle cx="50" cy="25" r="15" fill="url(#starGlow)" opacity="0.4" className="star-glow" />
          
          <defs>
            <radialGradient id="starGlow">
              <stop offset="0%" stopColor="#ffd700" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <style jsx>{`
        @keyframes pulse-ornament {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }

        .star-twinkle { animation: twinkle-star 1.5s ease-in-out infinite; transform-origin: center; }
        @keyframes twinkle-star {
          0%, 100% { filter: drop-shadow(0 0 2px #ffd700); opacity: 1; }
          50% { filter: drop-shadow(0 0 10px #ffd700); opacity: 0.8; }
        }

        .star-glow { animation: pulse-glow 2s ease-in-out infinite; }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }

        .animate-shake { animation: shake 0.5s ease-in-out; }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }

        .animate-spin-slow { animation: spin-slow 4s linear infinite; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}