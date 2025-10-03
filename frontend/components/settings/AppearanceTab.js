import { useState, useEffect } from 'react';
import { useSettings } from '../../lib/SettingsContext';
import ColorPicker from './ColorPicker';
import { Palette, Sliders, RotateCcw } from 'lucide-react';

export default function AppearanceTab() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState({
    background_type: settings.background_type,
    background_gradient_type: settings.background_gradient_type || 'linear',
    background_gradient_angle: settings.background_gradient_angle || 135,
    background_color: settings.background_color,
    background_gradient_end: settings.background_gradient_end,
    background_blur: settings.background_blur,
    background_dimming: settings.background_dimming,
    background_saturation: settings.background_saturation
  });

  useEffect(() => {
    setLocalSettings({
      background_type: settings.background_type,
      background_gradient_type: settings.background_gradient_type || 'linear',
      background_gradient_angle: settings.background_gradient_angle || 135,
      background_color: settings.background_color,
      background_gradient_end: settings.background_gradient_end,
      background_blur: settings.background_blur,
      background_dimming: settings.background_dimming,
      background_saturation: settings.background_saturation
    });
  }, [settings]);

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    updateSettings(newSettings, true); 
  };

  const handleReset = async () => {
    await resetSettings('appearance');
  };

  // Enhanced preset themes with different gradient types
  const presets = [
    { name: 'Ice & Fire', type: 'gradient', gradientType: 'linear', angle: 135, color: '#FF5714', gradientEnd: '#1056F9' },
    { name: 'Ocean Breeze', type: 'gradient', gradientType: 'linear', angle: 135, color: '#1E90FF', gradientEnd: '#00BFFF' },
    { name: 'Purple Dream', type: 'gradient', gradientType: 'linear', angle: 135, color: '#9370DB', gradientEnd: '#BA55D3' },
    { name: 'Sunset Glow', type: 'gradient', gradientType: 'radial', color: '#FF6B35', gradientEnd: '#004E89' },
    { name: 'Magenta Burst', type: 'gradient', gradientType: 'radial', color: '#E535AB', gradientEnd: '#6366F1' },
    { name: 'Neon Spin', type: 'gradient', gradientType: 'conic', color: '#FF00FF', gradientEnd: '#00FFFF' },
    { name: 'Rose Gold', type: 'gradient', gradientType: 'linear', angle: 45, color: '#E91E63', gradientEnd: '#FF9800' },
    { name: 'Dark Theme', type: 'gradient', gradientType: 'linear', angle: 135, color: '#121212', gradientEnd: '#563E3E' }
  ];

  const applyPreset = (preset) => {
    const newSettings = {
      background_type: preset.type,
      background_gradient_type: preset.gradientType || 'linear',
      background_gradient_angle: preset.angle || 135,
      background_color: preset.color,
      background_gradient_end: preset.gradientEnd || preset.color
    };
    
    setLocalSettings(prev => ({ ...prev, ...newSettings }));
    updateSettings(newSettings, true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2 text-shadow-adaptive">
          <Palette className="w-5 h-5 sm:w-6 sm:h-6 icon-shadow-adaptive" />
          Background Appearance
        </h2>
        <p className="text-white/80 text-sm sm:text-base text-shadow-adaptive-sm">
          Customize how your background looks across the entire site
        </p>
      </div>

      <>
        {/* Background Type */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white text-shadow-adaptive">Background Type</h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleChange('background_type', 'solid')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                localSettings.background_type === 'solid'
                  ? 'glass-2 text-white shadow-lg'
                  : 'glass-1 text-white/80 hover:text-white'
              }`}
            >
              Solid Color
            </button>
            <button
              onClick={() => handleChange('background_type', 'gradient')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                localSettings.background_type === 'gradient'
                  ? 'glass-2 text-white shadow-lg'
                  : 'glass-1 text-white/80 hover:text-white'
              }`}
            >
              Gradient
            </button>
          </div>
        </div>

        {/* Gradient Type Selection */}
        {localSettings.background_type === 'gradient' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white text-shadow-adaptive">Gradient Style</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleChange('background_gradient_type', 'linear')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  localSettings.background_gradient_type === 'linear'
                    ? 'glass-2 text-white shadow-lg'
                    : 'glass-1 text-white/80 hover:text-white'
                }`}
              >
                Linear
              </button>
              <button
                onClick={() => handleChange('background_gradient_type', 'radial')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  localSettings.background_gradient_type === 'radial'
                    ? 'glass-2 text-white shadow-lg'
                    : 'glass-1 text-white/80 hover:text-white'
                }`}
              >
                Radial
              </button>
              <button
                onClick={() => handleChange('background_gradient_type', 'conic')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  localSettings.background_gradient_type === 'conic'
                    ? 'glass-2 text-white shadow-lg'
                    : 'glass-1 text-white/80 hover:text-white'
                }`}
              >
                Conic
              </button>
            </div>
          </div>
        )}

        {/* Gradient Angle (only for linear gradients) */}
        {localSettings.background_type === 'gradient' && localSettings.background_gradient_type === 'linear' && (
          <div className="space-y-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Gradient Angle</label>
              <span className="text-sm text-white/70 text-shadow-adaptive-sm">{localSettings.background_gradient_angle ?? 135}°</span>
            </div>
            <input
              type="range"
              min="1"
              max="360"
              step="1"
              value={localSettings.background_gradient_angle ?? 135}
              onChange={(e) => handleChange('background_gradient_angle', Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-white/50">1°</span>
              <span className="text-xs text-white/50">180°</span>
              <span className="text-xs text-white/50">360°</span>
            </div>
          </div>
        )}

        {/* Preset Themes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white text-shadow-adaptive">Quick Presets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="glass-1 hover:glass-2 rounded-lg p-3 transition-all group"
              >
                <div 
                  className="w-full h-12 rounded-lg mb-2 shadow-inner"
                  style={{
                    background: preset.type === 'gradient' 
                      ? preset.gradientType === 'linear'
                        ? `linear-gradient(${preset.angle || 135}deg, ${preset.color} 0%, ${preset.gradientEnd} 100%)`
                        : preset.gradientType === 'radial'
                        ? `radial-gradient(circle at center, ${preset.color} 0%, ${preset.gradientEnd} 100%)`
                        : `conic-gradient(from 0deg at center, ${preset.color} 0%, ${preset.gradientEnd} 50%, ${preset.color} 100%)`
                      : preset.color
                  }}
                />
                <span className="text-xs text-white/80 group-hover:text-white text-shadow-adaptive-sm">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 text-shadow-adaptive">Colors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2 text-shadow-adaptive-sm">
                  {localSettings.background_type === 'gradient' ? 'Start Color' : 'Background Color'}
                </label>
                <ColorPicker
                  color={localSettings.background_color}
                  onChange={(color) => handleChange('background_color', color)}
                />
              </div>
              
              {localSettings.background_type === 'gradient' && (
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2 text-shadow-adaptive-sm">
                    End Color
                  </label>
                  <ColorPicker
                    color={localSettings.background_gradient_end}
                    onChange={(color) => handleChange('background_gradient_end', color)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Adjustment Sliders */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white text-shadow-adaptive flex items-center gap-2">
            <Sliders className="w-5 h-5 icon-shadow-adaptive" />
            Adjustments
          </h3>
          
          {/* Blur */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Blur</label>
              <span className="text-sm text-white/70 text-shadow-adaptive-sm">{localSettings.background_blur}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              value={localSettings.background_blur}
              onChange={(e) => handleChange('background_blur', parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-white/50">0%</span>
              <span className="text-xs text-white/50">12%</span>
            </div>
          </div>

          {/* Dimming */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Dimming</label>
              <span className="text-sm text-white/70 text-shadow-adaptive-sm">{localSettings.background_dimming}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="70"
              value={localSettings.background_dimming}
              onChange={(e) => handleChange('background_dimming', parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-white/50">20%</span>
              <span className="text-xs text-white/50">70%</span>
            </div>
          </div>

          {/* Saturation */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-white/90 text-shadow-adaptive-sm">Saturation</label>
              <span className="text-sm text-white/70 text-shadow-adaptive-sm">
                {localSettings.background_saturation > 0 ? '+' : ''}{localSettings.background_saturation}%
              </span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              value={localSettings.background_saturation}
              onChange={(e) => handleChange('background_saturation', parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-white/50">-15%</span>
              <span className="text-xs text-white/50">0%</span>
              <span className="text-xs text-white/50">+15%</span>
            </div>
          </div>
        </div>
      </>

      {/* Reset Button */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 glass-1 hover:glass-2 text-white/80 hover:text-white rounded-lg transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}