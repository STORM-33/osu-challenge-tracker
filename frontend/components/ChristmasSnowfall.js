// frontend/components/ChristmasSnowfall.js
import { useMemo } from 'react';

export default function ChristmasSnowfall() {
  // Memoize snowflakes so they don't regenerate on re-renders
  const snowflakes = useMemo(() => 
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 10 + Math.random() * 20, // 10-30s
      animationDelay: Math.random() * -20, // Staggered start
      size: 2 + Math.random() * 3, // 2-5px
      opacity: 0.3 + Math.random() * 0.5, // 0.3-0.8
    }))
  , []); // Empty dependency array = only generate once

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="snowflake absolute"
            style={{
              left: `${flake.left}%`,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
              animationDuration: `${flake.animationDuration}s`,
              animationDelay: `${flake.animationDelay}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .snowflake {
          background: white;
          border-radius: 50%;
          filter: blur(1px);
          animation: fall linear infinite;
        }

        @keyframes fall {
          0% {
            transform: translateY(-10vh) translateX(0);
          }
          100% {
            transform: translateY(110vh) translateX(20px);
          }
        }

        /* Add slight horizontal drift */
        .snowflake:nth-child(3n) {
          animation-name: fall-drift-left;
        }

        .snowflake:nth-child(3n+1) {
          animation-name: fall-drift-right;
        }

        @keyframes fall-drift-left {
          0% {
            transform: translateY(-10vh) translateX(0);
          }
          100% {
            transform: translateY(110vh) translateX(-30px);
          }
        }

        @keyframes fall-drift-right {
          0% {
            transform: translateY(-10vh) translateX(0);
          }
          100% {
            transform: translateY(110vh) translateX(30px);
          }
        }
      `}</style>
    </>
  );
}