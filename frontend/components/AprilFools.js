import { useEffect, useRef, useState } from 'react';

// ====================================================
// APRIL FOOLS 2026 - 90s Geocities Mode
// To revert: remove <AprilFools /> from _app.js and delete this file
// ====================================================

const VISITOR_COUNT = Math.floor(Math.random() * 90000) + 10000;

const GEOCITIES_CSS = `
  /* ========== NUCLEAR 90s OVERRIDE ========== */

  /* Tiled starry background */
  body {
    background: #000080 !important;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='60' height='60' fill='%23000080'/%3E%3Ccircle cx='10' cy='10' r='1' fill='white' opacity='0.6'/%3E%3Ccircle cx='40' cy='25' r='0.8' fill='white' opacity='0.4'/%3E%3Ccircle cx='25' cy='50' r='1.2' fill='white' opacity='0.5'/%3E%3Ccircle cx='55' cy='5' r='0.6' fill='white' opacity='0.7'/%3E%3Ccircle cx='5' cy='40' r='0.9' fill='white' opacity='0.3'/%3E%3Ccircle cx='50' cy='45' r='1' fill='white' opacity='0.5'/%3E%3C/svg%3E") !important;
    background-repeat: repeat !important;
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='14' fill='none' stroke='lime' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='2' fill='lime'/%3E%3C/svg%3E") 16 16, crosshair !important;
  }

  /* Kill the custom background image */
  .bg-fixed-mobile {
    display: none !important;
  }

  /* COMIC SANS EVERYTHING */
  * {
    font-family: 'Comic Sans MS', 'Comic Sans', cursive !important;
  }

  h1, h2, h3, h4, h5, h6, .text-lg, .text-xl, .text-2xl, .text-3xl, .text-4xl {
    font-family: 'Times New Roman', serif !important;
    text-shadow: 2px 2px 0px #FF00FF, -1px -1px 0px #00FFFF !important;
  }

  /* DESTROY all glassmorphism - replace with BEVELED BORDERS */
  .glass-1, .glass-2, .glass-3, .glass-4,
  [class*="glass-"],
  [class*="backdrop-blur"],
  [class*="bg-white/"] {
    background: #C0C0C0 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 3px outset #FFFFFF !important;
    box-shadow: inset 1px 1px 0px #FFFFFF, inset -1px -1px 0px #808080 !important;
  }

  /* Cards get the full Windows 95 treatment */
  [class*="rounded-2xl"],
  [class*="rounded-xl"],
  [class*="rounded-lg"] {
    border-radius: 0 !important;
    border: 3px outset #FFFFFF !important;
  }

  /* Buttons - classic 3D beveled */
  button, a[class*="btn"], .btn-primary, [class*="nav-pill"] {
    background: #C0C0C0 !important;
    color: #000000 !important;
    border: 2px outset #FFFFFF !important;
    border-radius: 0 !important;
    text-shadow: none !important;
    font-weight: bold !important;
    padding: 4px 12px !important;
    cursor: pointer !important;
  }

  button:hover, a[class*="btn"]:hover, .btn-primary:hover, [class*="nav-pill"]:hover {
    background: #A0A0A0 !important;
  }

  button:active, a[class*="btn"]:active, .btn-primary:active, [class*="nav-pill"]:active {
    border-style: inset !important;
  }

  /* Links should be blue and underlined like god intended */
  a {
    color: #0000FF !important;
    text-decoration: underline !important;
  }

  a:visited {
    color: #800080 !important;
  }

  a:hover {
    color: #FF0000 !important;
  }

  /* Override button-style links back */
  button a, a[class*="btn"], .btn-primary {
    text-decoration: none !important;
  }

  /* Text colors - BRIGHT and CLASHING */
  p, span, div, td, th, li {
    color: #FFFF00 !important;
  }

  h1 { color: #FF00FF !important; font-size: 2em !important; }
  h2 { color: #00FF00 !important; font-size: 1.6em !important; }
  h3 { color: #00FFFF !important; font-size: 1.3em !important; }

  /* Table styling - THICK BORDERS */
  table {
    border: 3px ridge #C0C0C0 !important;
    border-collapse: separate !important;
    border-spacing: 2px !important;
    background: #000080 !important;
  }

  td, th {
    border: 2px inset #C0C0C0 !important;
    padding: 4px 8px !important;
    background: #000040 !important;
  }

  th {
    background: #800080 !important;
    color: #FFFFFF !important;
    font-weight: bold !important;
  }

  /* Header area */
  header {
    background: #800080 !important;
    border-bottom: 4px ridge #C0C0C0 !important;
  }

  header svg:not(.af-ignore) {
    display: none !important;
  }

  /* Footer */
  footer {
    background: #000040 !important;
    border-top: 4px ridge #C0C0C0 !important;
  }

  /* Kill all transitions and blur */
  * {
    transition: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  /* Nav pills override */
  [class*="nav-pill"] {
    background: #C0C0C0 !important;
    color: #000000 !important;
  }

  [class*="nav-pill-active"] {
    background: #A0A0A0 !important;
    border-style: inset !important;
  }

  /* Scrollbar - classic Windows style */
  ::-webkit-scrollbar {
    width: 16px !important;
    background: #C0C0C0 !important;
  }
  ::-webkit-scrollbar-thumb {
    background: #C0C0C0 !important;
    border: 2px outset #FFFFFF !important;
  }
  ::-webkit-scrollbar-track {
    background: #808080 !important;
  }

  /* Images get borders */
  img {
    border: 2px solid #C0C0C0 !important;
  }

  /* Input fields */
  input, select, textarea {
    background: #FFFFFF !important;
    color: #000000 !important;
    border: 2px inset #808080 !important;
    border-radius: 0 !important;
    font-family: 'Comic Sans MS', cursive !important;
  }

  /* BLINK animation */
  @keyframes blink90s {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  .blink-90s {
    animation: blink90s 1s step-end infinite;
  }

  /* Rainbow text animation */
  @keyframes rainbow90s {
    0% { color: #FF0000; }
    16% { color: #FF8000; }
    33% { color: #FFFF00; }
    50% { color: #00FF00; }
    66% { color: #0080FF; }
    83% { color: #8000FF; }
    100% { color: #FF0000; }
  }
  .rainbow-90s {
    animation: rainbow90s 2s linear infinite;
    font-weight: bold !important;
  }

  /* Marquee container */
  .af-marquee {
    background: #FFFF00 !important;
    color: #FF0000 !important;
    border: 2px inset #808080 !important;
    padding: 4px 0 !important;
    font-weight: bold !important;
    font-size: 16px !important;
    overflow: hidden !important;
  }

  /* Under construction banner */
  .af-construction {
    background: repeating-linear-gradient(
      45deg,
      #FFD700,
      #FFD700 10px,
      #000000 10px,
      #000000 20px
    ) !important;
    padding: 8px !important;
    text-align: center !important;
    border: 2px ridge #C0C0C0 !important;
  }

  .af-construction-inner {
    background: #FFFF00 !important;
    color: #000000 !important;
    padding: 6px 16px !important;
    font-weight: bold !important;
    display: inline-block !important;
    border: 2px outset #FFFFFF !important;
  }

  /* Visitor counter */
  .af-visitor-counter {
    background: #000000 !important;
    border: 3px ridge #808080 !important;
    padding: 8px 16px !important;
    display: inline-block !important;
    text-align: center !important;
  }

  .af-visitor-counter span {
    color: #00FF00 !important;
    font-family: 'Courier New', monospace !important;
    font-size: 20px !important;
    font-weight: bold !important;
  }

  /* Guestbook link */
  .af-guestbook {
    background: #FF00FF !important;
    color: #FFFFFF !important;
    padding: 8px 24px !important;
    border: 3px outset #FF80FF !important;
    font-size: 18px !important;
    font-weight: bold !important;
    display: inline-block !important;
    text-decoration: none !important;
    cursor: pointer !important;
  }

  .af-guestbook:hover {
    background: #CC00CC !important;
    color: #FFFF00 !important;
  }

  /* Webring */
  .af-webring {
    background: #000040 !important;
    border: 3px double #FFFF00 !important;
    padding: 8px 16px !important;
    text-align: center !important;
    color: #FFFFFF !important;
  }

  /* Sparkle trail canvas */
  .af-sparkle-canvas {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    pointer-events: none !important;
    z-index: 99999 !important;
  }

  /* HR styling */
  .af-hr {
    border: none !important;
    height: 4px !important;
    background: linear-gradient(to right, #FF0000, #FF8000, #FFFF00, #00FF00, #0080FF, #8000FF) !important;
    margin: 8px 0 !important;
  }

  /* ========== CHALLENGE BADGES - 90s style ========== */
  .challenge-badge-weekly {
    background: #0000FF !important;
    color: #FFFFFF !important;
    border: 2px outset #8080FF !important;
    border-radius: 0 !important;
    font-family: 'Comic Sans MS', cursive !important;
    text-transform: uppercase !important;
    font-size: 11px !important;
    padding: 2px 8px !important;
    box-shadow: none !important;
  }

  .challenge-badge-monthly {
    background: #FF00FF !important;
    color: #FFFF00 !important;
    border: 2px outset #FF80FF !important;
    border-radius: 0 !important;
    font-family: 'Comic Sans MS', cursive !important;
    text-transform: uppercase !important;
    font-size: 11px !important;
    padding: 2px 8px !important;
    box-shadow: none !important;
  }

  .challenge-badge-custom {
    background: #008000 !important;
    color: #FFFFFF !important;
    border: 2px outset #80FF80 !important;
    border-radius: 0 !important;
    font-family: 'Comic Sans MS', cursive !important;
    text-transform: uppercase !important;
    font-size: 11px !important;
    padding: 2px 8px !important;
    box-shadow: none !important;
  }

  .badge-icon-green {
    background: #008000 !important;
    color: #FFFFFF !important;
    border: 2px outset #80FF80 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .badge-icon-orange {
    background: #FF8000 !important;
    color: #000000 !important;
    border: 2px outset #FFCC80 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  /* ========== Lucide icons - replace with 90s text symbols ========== */
  /* Make all SVG icons inside main content visible but ugly */
  main svg, .min-h-screen svg {
    color: #00FF00 !important;
    stroke: #00FF00 !important;
    filter: drop-shadow(1px 1px 0px #000000) !important;
  }

  /* Trophy icon - make it yellow and chunky */
  main svg.lucide-trophy, .min-h-screen svg.lucide-trophy {
    color: #FFD700 !important;
    stroke: #FFD700 !important;
    filter: drop-shadow(2px 2px 0px #FF0000) drop-shadow(-1px -1px 0px #FF8000) !important;
  }

  /* Sparkles icon */
  main svg.lucide-sparkles, .min-h-screen svg.lucide-sparkles {
    color: #FF0000 !important;
    stroke: #FF0000 !important;
    animation: blink90s 0.5s step-end infinite !important;
  }

  /* streak-card header - 90s table header feel */
  .streak-card-current {
    background: linear-gradient(to bottom, #FF8000, #CC6600) !important;
    border: 3px outset #FFCC80 !important;
    border-radius: 0 !important;
  }

  /* Gradient overrides - spare elements with inline background-image (challenge cards) */
  [class*="bg-gradient"]:not([style*="background-image"]),
  [class*="from-"]:not([style*="background-image"]),
  [class*="to-"]:not([style*="background-image"]) {
    background: #C0C0C0 !important;
  }

  /* Gradient overlays inside challenge card image containers - keep transparent */
  [style*="background-image"] [class*="bg-gradient"],
  [style*="background-image"] [class*="from-"] {
    background: transparent !important;
  }

  /* Let the div with inline background-image keep its image */
  [style*="background-image"] {
    background-color: transparent !important;
  }

  /* Pill badges - all should be boxy */
  [class*="rounded-full"] {
    border-radius: 0 !important;
  }

  /* The green pulse dot */
  .animate-pulse {
    animation: blink90s 1s step-end infinite !important;
  }

  /* Kill floating animation - too modern */
  .animate-float {
    animation: none !important;
    transform: none !important;
  }

  /* Kill ALL glow effects - no glowing in 1997 */
  [class*="text-glow"],
  [class*="box-shadow"],
  [class*="shadow-glow"],
  [class*="icon-shadow"] {
    filter: none !important;
    text-shadow: none !important;
    box-shadow: none !important;
  }

  [class*="text-shadow-adaptive"] {
    text-shadow: none !important;
  }

  [class*="icon-shadow-adaptive"] {
    filter: none !important;
  }

  /* Kill hover glow/scale - no fancy hover in the 90s */
  .glass-hover:hover,
  [class*="hover\\:shadow"],
  [class*="hover\\:scale"] {
    box-shadow: none !important;
    transform: none !important;
    filter: none !important;
  }

  /* Nuke all box-shadows site-wide (beveled borders are the only decoration) */
  main *, footer *, header * {
    box-shadow: none !important;
  }
`;

function SparkleTrail() {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#FFD700', '#FF69B4', '#00FFFF', '#FF4500', '#ADFF2F', '#FF00FF'];

    const handleMouseMove = (e) => {
      for (let i = 0; i < 3; i++) {
        particles.current.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2 - 1,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 4 + 2,
          isStar: Math.random() > 0.5,
        });
      }
      if (particles.current.length > 100) {
        particles.current = particles.current.slice(-100);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    const drawStar = (cx, cy, size, color) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](Math.cos(angle) * size, Math.sin(angle) * size);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 0.02;

        if (p.life > 0) {
          ctx.globalAlpha = p.life;
          if (p.isStar) {
            drawStar(p.x, p.y, p.size, p.color);
          } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          }
        }
      });
      ctx.globalAlpha = 1;
      particles.current = particles.current.filter((p) => p.life > 0);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="af-sparkle-canvas" />;
}

function MarqueeText({ children, direction = 'left' }) {
  const [pos, setPos] = useState(direction === 'left' ? 100 : -100);
  const animRef = useRef(null);

  useEffect(() => {
    let current = direction === 'left' ? 100 : -100;
    const speed = direction === 'left' ? -0.08 : 0.08;

    const animate = () => {
      current += speed;
      if (direction === 'left' && current < -100) current = 100;
      if (direction === 'right' && current > 100) current = -100;
      setPos(current);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [direction]);

  return (
    <div className="af-marquee" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
      <div style={{ transform: `translateX(${pos}%)`, display: 'inline-block', width: '100%', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// Weighted random: 300 most common, then 100, 50, miss rarest
const JUDGMENTS = [
  { text: '300', color: '#5CA0FF', weight: 45 },
  { text: '100', color: '#5CFF5C', weight: 30 },
  { text: '50',  color: '#FFCC22', weight: 15 },
  { text: 'MISS', color: '#FF4444', weight: 10 },
];

function pickJudgment() {
  const total = JUDGMENTS.reduce((s, j) => s + j.weight, 0);
  let r = Math.random() * total;
  for (const j of JUDGMENTS) {
    r -= j.weight;
    if (r <= 0) return j;
  }
  return JUDGMENTS[0];
}

function HitJudgments() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e) => {
      const judgment = pickJudgment();

      const el = document.createElement('div');
      el.textContent = judgment.text;
      el.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        transform: translate(-50%, -50%) scale(0.5);
        color: ${judgment.color};
        font-family: 'Arial Black', 'Impact', sans-serif;
        font-size: ${judgment.text === 'MISS' ? '32px' : '28px'};
        font-weight: 900;
        pointer-events: none;
        z-index: 99999;
        text-shadow: 0 0 6px ${judgment.color}, 0 0 12px ${judgment.color}, 2px 2px 0px #000;
        opacity: 1;
        transition: none;
      `;

      container.appendChild(el);

      // Pop in
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.1s ease-out';
        el.style.transform = 'translate(-50%, -50%) scale(1.2)';

        // Settle + float up + fade
        setTimeout(() => {
          el.style.transition = 'transform 0.6s ease-out, opacity 0.6s ease-out';
          el.style.transform = 'translate(-50%, -100%) scale(1)';
          el.style.opacity = '0';
        }, 100);

        // Remove from DOM
        setTimeout(() => {
          el.remove();
        }, 750);
      });
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }} />;
}

function GeocitiesStyle() {
  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-april-fools', 'true');
    style.textContent = GEOCITIES_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  return null;
}

export default function AprilFools() {
  return (
    <>
      {/* Inject the CSS via useEffect instead of dangerouslySetInnerHTML */}
      <GeocitiesStyle />

      {/* Sparkle cursor trail */}
      <SparkleTrail />


      {/* Top marquee banner */}
      <div style={{ position: 'relative', zIndex: 9998 }}>
        <MarqueeText direction="left">
          ~*~*~ Welcome to osu!Challengers Nexus!!! ~*~*~ Your #1 source for osu! challenges on the World Wide Web!! ~*~*~ Last updated: April 2nd 2026 ~*~*~
        </MarqueeText>

        {/* Rainbow separator */}
        <hr className="af-hr" />
      </div>
    </>
  );
}
