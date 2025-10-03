import { useState, useRef, useEffect } from 'react';
import { Pipette } from 'lucide-react';

// Move utility functions outside component to avoid hoisting issues
const hexToHsl = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 100, l: 50 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

const hslToHex = (h, s, l) => {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const isValidHex = (hex) => {
  return /^#?([a-f\d]{6})$/i.test(hex);
};

export default function ColorPicker({ color, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const [hexError, setHexError] = useState(false);
  const pickerRef = useRef(null);
  
  // Initialize HSL from prop only once and manage state independently
  const getInitialHSL = (hexColor) => {
    const hsl = hexToHsl(hexColor);
    return {
      h: hsl.h,
      s: hsl.s,
      l: hsl.l
    };
  };

  const [hslState, setHslState] = useState(() => getInitialHSL(color));

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Only sync from prop when picker is closed (not during user interaction)
  useEffect(() => {
    if (!isOpen) {
      const newHSL = getInitialHSL(color);
      setHslState(newHSL);
      setHexInput('');
      setHexError(false);
    }
  }, [color, isOpen]);

  const handleHueChange = (e) => {
    const newHue = parseInt(e.target.value);
    const newHSL = { ...hslState, h: newHue };
    setHslState(newHSL);
    onChange(hslToHex(newHSL.h, newHSL.s, newHSL.l));
  };

  const handleSaturationChange = (e) => {
    const newSat = parseInt(e.target.value);
    const newHSL = { ...hslState, s: newSat };
    setHslState(newHSL);
    onChange(hslToHex(newHSL.h, newHSL.s, newHSL.l));
  };

  const handleLightnessChange = (e) => {
    const newLight = parseInt(e.target.value);
    const newHSL = { ...hslState, l: newLight };
    setHslState(newHSL);
    onChange(hslToHex(newHSL.h, newHSL.s, newHSL.l));
  };

  const handleHexInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace('#', '');
    setHexInput(value);
    
    // Only validate and apply if there's a value
    if (value.length === 0) {
      setHexError(false);
      return;
    }
    
    // Add # for validation
    const hexValue = '#' + value;
    
    // Validate and apply if valid (6 characters)
    if (value.length === 6 && isValidHex(hexValue)) {
      setHexError(false);
      const newHSL = hexToHsl(hexValue);
      setHslState(newHSL);
      onChange(hexValue); // Send the actual hex value typed, not the converted one
    } else if (value.length >= 6) {
      setHexError(true);
    } else {
      setHexError(false);
    }
  };

  const handleHexInputBlur = () => {
    // Reset to current color if invalid
    if (hexError || (hexInput && !isValidHex('#' + hexInput.replace('#', '')))) {
      setHexInput('');
      setHexError(false);
    }
  };

  // Get current color for display (use prop when closed, state when open)
  const displayColor = isOpen ? hslToHex(hslState.h, hslState.s, hslState.l) : color;

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full glass-1 rounded-lg p-3 flex items-center gap-3 hover:glass-2 transition-all"
      >
        <div 
          className="w-10 h-10 rounded-lg shadow-inner border-2 border-white/20"
          style={{ backgroundColor: displayColor }}
        />
        <div className="flex-1 text-left">
          <span className="text-white font-mono text-shadow-adaptive">{displayColor.toUpperCase()}</span>
        </div>
        <Pipette className="w-5 h-5 text-white/70 icon-shadow-adaptive-sm" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full rounded-xl p-4 shadow-2xl z-50 space-y-4" style={{
          backdropFilter: 'blur(24px) brightness(0.7)',
          WebkitBackdropFilter: 'blur(24px) brightness(0.7)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 10px rgba(255, 255, 255, 0.15)'
        }}>
          {/* Color Preview */}
          <div 
            className="w-full h-20 rounded-lg shadow-inner border-2 border-white/20"
            style={{ backgroundColor: hslToHex(hslState.h, hslState.s, hslState.l) }}
          />

          {/* Hex Input */}
          <div>
            <label className="text-sm font-medium text-white/90 text-shadow-adaptive-sm mb-2 block">
              Hex Code
            </label>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              onFocus={() => setHexInput(hslToHex(hslState.h, hslState.s, hslState.l).replace('#', ''))}
              placeholder="FFFFFF"
              maxLength={6}
              className={`w-full px-3 py-2 rounded-lg font-mono text-base transition-all ${
                hexError 
                  ? 'glass-1 border-2 border-red-500 text-red-300 placeholder-red-300/50' 
                  : 'glass-1 border-2 border-white/20 text-white placeholder-white/40'
              } focus:outline-none focus:border-white/40`}
              style={{ 
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            />
            {hexError && (
              <p className="text-xs text-red-300 mt-1 text-shadow-adaptive-sm">
                Invalid hex code (use format: FFFFFF or #FFFFFF)
              </p>
            )}
          </div>

          {/* Hue Slider */}
          <div>
            <label className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Hue</label>
            <input
              type="range"
              min="0"
              max="360"
              value={hslState.h}
              onChange={handleHueChange}
              className="w-full h-4 rounded-lg appearance-none cursor-pointer mt-2"
              style={{
                background: `linear-gradient(to right, 
                  hsl(0, 100%, 50%), 
                  hsl(60, 100%, 50%), 
                  hsl(120, 100%, 50%), 
                  hsl(180, 100%, 50%), 
                  hsl(240, 100%, 50%), 
                  hsl(300, 100%, 50%), 
                  hsl(360, 100%, 50%))`
              }}
            />
          </div>

          {/* Saturation Slider */}
          <div>
            <label className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Saturation</label>
            <input
              type="range"
              min="0"
              max="100"
              value={hslState.s}
              onChange={handleSaturationChange}
              className="w-full h-4 rounded-lg appearance-none cursor-pointer mt-2"
              style={{
                background: `linear-gradient(to right, 
                  hsl(${hslState.h}, 0%, ${hslState.l}%), 
                  hsl(${hslState.h}, 100%, ${hslState.l}%))`
              }}
            />
          </div>

          {/* Lightness Slider */}
          <div>
            <label className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Lightness</label>
            <input
              type="range"
              min="0"
              max="100"
              value={hslState.l}
              onChange={handleLightnessChange}
              className="w-full h-4 rounded-lg appearance-none cursor-pointer mt-2"
              style={{
                background: `linear-gradient(to right, 
                  hsl(${hslState.h}, ${hslState.s}%, 0%), 
                  hsl(${hslState.h}, ${hslState.s}%, 50%), 
                  hsl(${hslState.h}, ${hslState.s}%, 100%))`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}