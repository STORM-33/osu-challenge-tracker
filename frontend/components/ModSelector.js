import { useState, useEffect } from 'react';
import { X, Settings, Info, Check, AlertTriangle } from 'lucide-react';

// COMPLETE osu! Mods reference
const OSU_MODS = {
  // Difficulty Reduction
  'EZ': { name: 'Easy', category: 'Difficulty Reduction', settings: [] },
  'NF': { name: 'No Fail', category: 'Difficulty Reduction', settings: [] },
  'HT': { name: 'Half Time', category: 'Difficulty Reduction', settings: ['speed_change', 'adjust_pitch'] },
  'DC': { name: 'Daycore', category: 'Difficulty Reduction', settings: ['speed_change'] },
  
  // Difficulty Increase
  'HR': { name: 'Hard Rock', category: 'Difficulty Increase', settings: [] },
  'SD': { name: 'Sudden Death', category: 'Difficulty Increase', settings: ['restart', 'fail_on_slider_tail'] },
  'PF': { name: 'Perfect', category: 'Difficulty Increase', settings: ['restart'] },
  'DT': { name: 'Double Time', category: 'Difficulty Increase', settings: ['speed_change', 'adjust_pitch'] },
  'NC': { name: 'Nightcore', category: 'Difficulty Increase', settings: ['speed_change'] },
  'HD': { name: 'Hidden', category: 'Difficulty Increase', settings: ['only_fade_approach_circles'] },
  'FL': { name: 'Flashlight', category: 'Difficulty Increase', settings: ['size_multiplier', 'combo_based_size', 'follow_delay'] },
  'AC': { name: 'Accuracy Challenge', category: 'Difficulty Increase', settings: ['minimum_accuracy', 'accuracy_judge_mode', 'restart'] },
  'BL': { name: 'Blinds', category: 'Difficulty Increase', settings: [] },
  
  // Automation
  'AT': { name: 'Autoplay', category: 'Automation', settings: [] },
  'CN': { name: 'Cinema', category: 'Automation', settings: [] },
  'RL': { name: 'Relax', category: 'Automation', settings: [] },
  'RX': { name: 'Relax', category: 'Automation', settings: [] },
  'AP': { name: 'Autopilot', category: 'Automation', settings: [] },
  'SO': { name: 'Spun Out', category: 'Automation', settings: [] },
  
  // Conversion
  'MR': { name: 'Mirror', category: 'Conversion', settings: ['reflection'] },
  'DA': { name: 'Difficulty Adjust', category: 'Conversion', settings: ['circle_size', 'drain_rate', 'overall_difficulty', 'approach_rate', 'scroll_speed'] },
  'CL': { name: 'Classic', category: 'Conversion', settings: ['no_slider_head_accuracy', 'classic_note_lock', 'always_play_tail_sample', 'fade_hit_circle_early', 'classic_health'] },
  'RD': { name: 'Random', category: 'Conversion', settings: ['seed', 'angle_sharpness'] },
  'TP': { name: 'Target Practice', category: 'Conversion', settings: ['seed', 'metronome'] },
  'FR': { name: 'Freeze Frame', category: 'Conversion', settings: [] },
  'ST': { name: 'Strict Tracking', category: 'Conversion', settings: [] },
  
  // Fun & Visual
  'WU': { name: 'Wind Up', category: 'Fun', settings: ['initial_rate', 'final_rate', 'adjust_pitch'] },
  'WD': { name: 'Wind Down', category: 'Fun', settings: ['initial_rate', 'final_rate', 'adjust_pitch'] },
  'AS': { name: 'Adaptive Speed', category: 'Fun', settings: ['initial_rate', 'adjust_pitch'] },
  'AD': { name: 'Approach Different', category: 'Fun', settings: ['initial_size', 'style'] },
  'MU': { name: 'Muted', category: 'Fun', settings: ['start_muted', 'enable_metronome', 'final_volume_combo_count', 'mute_hit_sounds'] },
  'DF': { name: 'Deflate', category: 'Fun', settings: ['start_scale'] },
  'GR': { name: 'Grow', category: 'Fun', settings: ['start_scale'] },
  'SI': { name: 'Spin In', category: 'Fun', settings: [] },
  'TC': { name: 'Traceable', category: 'Fun', settings: [] },
  'BR': { name: 'Barrel Roll', category: 'Fun', settings: ['spin_speed', 'direction'] },
  'DP': { name: 'Depth', category: 'Fun', settings: ['max_depth', 'show_approach_circles'] },
  'TR': { name: 'Transform', category: 'Fun', settings: [] },
  'WG': { name: 'Wiggle', category: 'Fun', settings: ['strength'] },
  'MG': { name: 'Magnetised', category: 'Fun', settings: ['attraction_strength'] },
  'RP': { name: 'Repel', category: 'Fun', settings: ['repulsion_strength'] },
  'BU': { name: 'Bubbles', category: 'Fun', settings: [] },
  'SY': { name: 'Synesthesia', category: 'Fun', settings: [] },
  'BM': { name: 'Bloom', category: 'Fun', settings: ['max_size_combo_count', 'max_cursor_size'] },
  'NS': { name: 'No Scope', category: 'Fun', settings: ['hidden_combo_count'] },
  'AL': { name: 'Alternate', category: 'Fun', settings: [] },
  'SG': { name: 'Single Tap', category: 'Fun', settings: [] },
  
  // System
  'TD': { name: 'Touch Device', category: 'System', settings: [] },
  'SV2': { name: 'Score V2', category: 'System', settings: [] },
  
  // osu!mania Key Mods
  '1K': { name: '1 Key', category: 'osu!mania', settings: [] },
  '2K': { name: '2 Keys', category: 'osu!mania', settings: [] },
  '3K': { name: '3 Keys', category: 'osu!mania', settings: [] },
  '4K': { name: '4 Keys', category: 'osu!mania', settings: [] },
  '5K': { name: '5 Keys', category: 'osu!mania', settings: [] },
  '6K': { name: '6 Keys', category: 'osu!mania', settings: [] },
  '7K': { name: '7 Keys', category: 'osu!mania', settings: [] },
  '8K': { name: '8 Keys', category: 'osu!mania', settings: [] },
  '9K': { name: '9 Keys', category: 'osu!mania', settings: [] },
  
  // osu!mania Specific
  'DS': { name: 'Dual Stages', category: 'osu!mania', settings: [] },
  'IN': { name: 'Invert', category: 'osu!mania', settings: [] },
  'CS': { name: 'Constant Speed', category: 'osu!mania', settings: ['scroll_speed'] },
  'HO': { name: 'Hold Off', category: 'osu!mania', settings: [] },
  'NR': { name: 'No Release', category: 'osu!mania', settings: [] },
  'FI': { name: 'Fade In', category: 'osu!mania', settings: [] },
  
  // Mode Specific
  'SW': { name: 'Swap', category: 'Mode Specific', settings: [] },
  'FF': { name: 'Floating Fruits', category: 'Mode Specific', settings: [] },
};

// Updated conflicting mods
const CONFLICTING_MODS = [
  ['HT', 'DC', 'DT', 'NC', 'WU', 'WD', 'AS'], // Speed/Rate mods
  ['EZ', 'HR'], // Difficulty adjustment
  ['NF', 'SD', 'PF', 'AC', 'CN'], // Fail conditions
  ['AT', 'CN', 'RL', 'RX', 'AP', 'SO'], // Automation
  ['AL', 'SG'], // Input modification
  ['MG', 'RP'], // Position modification
  ['FI', 'HD', 'FL'], // Visual conflicts (mania)
  ['HO', 'NR'], // Hold note mods (mania)
  ['TR', 'WG', 'MG', 'RP', 'BU', 'DP'], // Transformation mods
];

// Complete setting configurations
const SETTING_CONFIGS = {
  // Speed/Rate settings
  speed_change: { 
    type: 'range', 
    getMin: (mod) => (['HT', 'DC'].includes(mod) ? 0.5 : 1.01),
    getMax: (mod) => (['HT', 'DC'].includes(mod) ? 0.99 : 2.0),
    step: 0.01, 
    getDefault: (mod) => (['HT', 'DC'].includes(mod) ? 0.75 : 1.5),
    label: 'Speed Change',
    format: (val) => `${val}x`
  },
  adjust_pitch: { 
    type: 'boolean', 
    default: false,
    label: 'Adjust Pitch'
  },
  
  // Wind Up/Down
  initial_rate: { 
    type: 'range', 
    getMin: (mod) => (mod === 'WU' ? 0.5 : 0.51),
    getMax: (mod) => (mod === 'WU' ? 1.99 : 2.0),
    step: 0.01, 
    getDefault: (mod) => (mod === 'WU' ? 1.0 : 1.0),
    label: 'Initial Rate',
    format: (val) => `${val}x`
  },
  final_rate: { 
    type: 'range', 
    getMin: (mod) => (mod === 'WU' ? 0.51 : 0.5),
    getMax: (mod) => (mod === 'WU' ? 2.0 : 1.99),
    step: 0.01, 
    getDefault: (mod) => (mod === 'WU' ? 1.5 : 0.75),
    label: 'Final Rate',
    format: (val) => `${val}x`
  },
  
  // Fail condition settings
  restart: { 
    type: 'boolean', 
    default: false,
    label: 'Auto Restart on Fail'
  },
  fail_on_slider_tail: { 
    type: 'boolean', 
    default: false,
    label: 'Fail on Slider Tail Miss'
  },
  
  // Accuracy Challenge
  minimum_accuracy: { 
    type: 'range', 
    min: 0.6, 
    max: 0.99, 
    step: 0.01, 
    default: 0.9,
    label: 'Minimum Accuracy',
    format: (val) => `${(val * 100).toFixed(0)}%`
  },
  accuracy_judge_mode: { 
    type: 'select', 
    options: [
      { value: 'Standard', label: 'Standard' },
      { value: 'MaximumAchievable', label: 'Maximum Achievable' }
    ],
    default: 'Standard',
    label: 'Accuracy Mode'
  },
  
  // Hidden settings
  only_fade_approach_circles: { 
    type: 'boolean', 
    default: false,
    label: 'Only Fade Approach Circles'
  },
  
  // Flashlight settings
  size_multiplier: { 
    type: 'range', 
    min: 0.5, 
    max: 2.0, 
    step: 0.1, 
    default: 1.0,
    label: 'Size Multiplier',
    format: (val) => `${val}x`
  },
  combo_based_size: { 
    type: 'boolean', 
    default: true,
    label: 'Combo Based Size'
  },
  follow_delay: { 
    type: 'range', 
    min: 120, 
    max: 1200, 
    step: 10, 
    default: 120,
    label: 'Follow Delay',
    format: (val) => `${val}ms`
  },
  
  // Mirror settings
  reflection: { 
    type: 'select', 
    options: [
      { value: 0, label: 'Horizontal' },
      { value: 1, label: 'Vertical' },
      { value: 2, label: 'Both' }
    ],
    default: 0,
    label: 'Reflection Type'
  },
  
  // Difficulty Adjust settings
  circle_size: { 
    type: 'range', 
    min: 0.0, 
    max: 11.0, 
    step: 0.1, 
    default: 5.0,
    label: 'Circle Size'
  },
  drain_rate: { 
    type: 'range', 
    min: 0.0, 
    max: 11.0, 
    step: 0.1, 
    default: 5.0,
    label: 'Drain Rate'
  },
  overall_difficulty: { 
    type: 'range', 
    min: 0.0, 
    max: 11.0, 
    step: 0.1, 
    default: 5.0,
    label: 'Overall Difficulty'
  },
  approach_rate: { 
    type: 'range', 
    min: -10.0, 
    max: 11.0, 
    step: 0.1, 
    default: 9.0,
    label: 'Approach Rate'
  },
  scroll_speed: { 
    type: 'range', 
    min: 0.01, 
    max: 4.0, 
    step: 0.01, 
    default: 1.5,
    label: 'Scroll Speed',
    format: (val) => `${val}x`
  },
  
  // Classic settings
  no_slider_head_accuracy: { 
    type: 'boolean', 
    default: true,
    label: 'No Slider Head Accuracy'
  },
  classic_note_lock: { 
    type: 'boolean', 
    default: true,
    label: 'Classic Note Lock'
  },
  always_play_tail_sample: { 
    type: 'boolean', 
    default: true,
    label: 'Always Play Tail Sample'
  },
  fade_hit_circle_early: { 
    type: 'boolean', 
    default: true,
    label: 'Fade Hit Circle Early'
  },
  classic_health: { 
    type: 'boolean', 
    default: true,
    label: 'Classic Health'
  },
  
  // Random settings
  seed: { 
    type: 'number', 
    default: 0,
    label: 'Random Seed'
  },
  angle_sharpness: { 
    type: 'range', 
    min: 1.0, 
    max: 10.0, 
    step: 0.1, 
    default: 7.0,
    label: 'Angle Sharpness'
  },
  
  // Target Practice settings
  metronome: { 
    type: 'boolean', 
    default: true,
    label: 'Enable Metronome'
  },
  
  // Approach Different
  initial_size: { 
    type: 'range', 
    min: 1.5, 
    max: 10.0, 
    step: 0.1, 
    default: 4.0,
    label: 'Initial Size',
    format: (val) => `${val}x`
  },
  style: { 
    type: 'select', 
    options: [
      { value: 0, label: 'Linear' },
      { value: 1, label: 'Gravity' },
      { value: 2, label: 'InOut1' },
      { value: 3, label: 'InOut2' },
      { value: 4, label: 'Accelerate1' },
      { value: 5, label: 'Accelerate2' },
      { value: 6, label: 'Accelerate3' },
      { value: 7, label: 'Decelerate1' },
      { value: 8, label: 'Decelerate2' },
      { value: 9, label: 'Decelerate3' }
    ],
    default: 0,
    label: 'Animation Style'
  },
  
  // Muted
  start_muted: { 
    type: 'boolean', 
    default: false,
    label: 'Start Muted'
  },
  enable_metronome: { 
    type: 'boolean', 
    default: true,
    label: 'Enable Metronome'
  },
  final_volume_combo_count: { 
    type: 'range', 
    min: 0, 
    max: 500, 
    step: 1, 
    default: 100,
    label: 'Final Volume at Combo Count'
  },
  mute_hit_sounds: { 
    type: 'boolean', 
    default: true,
    label: 'Mute Hit Sounds'
  },
  
  // Scale modification settings
  start_scale: { 
    type: 'range', 
    getMin: (mod) => (mod === 'GR' ? 0.0 : 1.0),
    getMax: (mod) => (mod === 'GR' ? 0.99 : 25.0),
    getStep: (mod) => (mod === 'GR' ? 0.01 : 0.1),
    getDefault: (mod) => (mod === 'GR' ? 0.5 : 2.0),
    label: 'Start Scale',
    format: (val) => `${val}x`
  },
  
  // Barrel Roll
  spin_speed: { 
    type: 'range', 
    min: 0.02, 
    max: 12.0, 
    step: 0.01, 
    default: 0.5,
    label: 'Roll Speed (RPM)',
    format: (val) => `${val} rpm`
  },
  direction: { 
    type: 'select', 
    options: [
      { value: 'Clockwise', label: 'Clockwise' },
      { value: 'Counterclockwise', label: 'Counterclockwise' }
    ],
    default: 'Clockwise',
    label: 'Direction of Rotation'
  },
  
  // Depth settings
  max_depth: { 
    type: 'range', 
    min: 50, 
    max: 200, 
    step: 5, 
    default: 100,
    label: 'Max Depth'
  },
  show_approach_circles: { 
    type: 'boolean', 
    default: true,
    label: 'Show Approach Circles'
  },
  
  // Wiggle settings
  strength: { 
    type: 'range', 
    min: 0.1, 
    max: 2.0, 
    step: 0.1, 
    default: 1.0,
    label: 'Wiggle Strength',
    format: (val) => `${val}x`
  },
  
  // Attraction/Repulsion settings
  attraction_strength: { 
    type: 'range', 
    min: 0.05, 
    max: 1.0, 
    step: 0.05, 
    default: 0.5,
    label: 'Attraction Strength',
    format: (val) => `${(val * 100).toFixed(0)}%`
  },
  repulsion_strength: { 
    type: 'range', 
    min: 0.05, 
    max: 1.0, 
    step: 0.05, 
    default: 0.5,
    label: 'Repulsion Strength',
    format: (val) => `${(val * 100).toFixed(0)}%`
  },
  
  // Bloom settings
  max_size_combo_count: { 
    type: 'range', 
    min: 5, 
    max: 100, 
    step: 5, 
    default: 50,
    label: 'Max Size Combo Count'
  },
  max_cursor_size: { 
    type: 'range', 
    min: 5.0, 
    max: 15.0, 
    step: 0.1, 
    default: 10.0,
    label: 'Max Cursor Size',
    format: (val) => `${val}x`
  },
  
  // No Scope settings
  hidden_combo_count: { 
    type: 'range', 
    min: 0, 
    max: 50, 
    step: 1, 
    default: 10,
    label: 'Hidden Combo Count'
  }
};

export default function ModSelector({ selectedMods = [], onChange, matchType = 'exact' }) {
  const [conflicts, setConflicts] = useState([]);
  const [showSettings, setShowSettings] = useState({});

  useEffect(() => {
    checkConflicts();
  }, [selectedMods]);

  const checkConflicts = () => {
    const modAcronyms = selectedMods.map(mod => mod.acronym);
    const foundConflicts = [];

    for (const conflictGroup of CONFLICTING_MODS) {
      const conflictingFound = modAcronyms.filter(acronym => conflictGroup.includes(acronym));
      if (conflictingFound.length > 1) {
        foundConflicts.push(conflictingFound);
      }
    }

    setConflicts(foundConflicts);
  };

  const handleModToggle = (acronym) => {
    const isSelected = selectedMods.some(mod => mod.acronym === acronym);
    
    if (isSelected) {
      // Remove mod
      const newMods = selectedMods.filter(mod => mod.acronym !== acronym);
      onChange(newMods);
      
      // Hide settings panel
      setShowSettings(prev => ({ ...prev, [acronym]: false }));
    } else {
      // Add mod with default settings
      const modInfo = OSU_MODS[acronym];
      const defaultSettings = {};
      
      if (modInfo.settings.length > 0) {
        for (const settingKey of modInfo.settings) {
          const config = SETTING_CONFIGS[settingKey];
          if (config) {
            // Handle dynamic defaults based on mod
            if (typeof config.getDefault === 'function') {
              defaultSettings[settingKey] = config.getDefault(acronym);
            } else {
              defaultSettings[settingKey] = config.default;
            }
          }
        }
      }
      
      const newMod = {
        acronym,
        settings: defaultSettings
      };
      
      onChange([...selectedMods, newMod]);
    }
  };

  const handleSettingChange = (modAcronym, settingKey, value) => {
    const newMods = selectedMods.map(mod => {
      if (mod.acronym === modAcronym) {
        return {
          ...mod,
          settings: {
            ...mod.settings,
            [settingKey]: value
          }
        };
      }
      return mod;
    });
    onChange(newMods);
  };

  const toggleSettings = (acronym) => {
    setShowSettings(prev => ({
      ...prev,
      [acronym]: !prev[acronym]
    }));
  };

  const getModByCategory = () => {
    const categories = {};
    Object.entries(OSU_MODS).forEach(([acronym, info]) => {
      if (!categories[info.category]) {
        categories[info.category] = [];
      }
      categories[info.category].push({ acronym, ...info });
    });
    return categories;
  };

  const isModSelected = (acronym) => {
    return selectedMods.some(mod => mod.acronym === acronym);
  };

  const getSelectedMod = (acronym) => {
    return selectedMods.find(mod => mod.acronym === acronym);
  };

  const getSettingRange = (config, modAcronym, settingKey) => {
    if (config.getMin && config.getMax) {
      return {
        min: config.getMin(modAcronym),
        max: config.getMax(modAcronym),
        step: config.getStep ? config.getStep(modAcronym) : config.step
      };
    }
    return {
      min: config.min,
      max: config.max,
      step: config.step
    };
  };

  const renderSettingsSummary = (selectedMod) => {
    if (!selectedMod.settings || Object.keys(selectedMod.settings).length === 0) {
      return null;
    }

    const summaryItems = [];
    Object.entries(selectedMod.settings).forEach(([key, value]) => {
      const config = SETTING_CONFIGS[key];
      if (config && config.format) {
        summaryItems.push(`${config.label}: ${config.format(value)}`);
      } else if (config && config.type === 'boolean') {
        if (value) summaryItems.push(config.label);
      } else if (config && config.type === 'select') {
        const option = config.options.find(opt => opt.value === value);
        if (option) summaryItems.push(`${config.label}: ${option.label}`);
      } else if (value !== undefined) {
        summaryItems.push(`${config?.label || key}: ${value}`);
      }
    });

    return summaryItems.length > 0 ? ` (${summaryItems.join(', ')})` : null;
  };

  const categories = getModByCategory();

  return (
    <div className="space-y-6">

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900 mb-1">Mod Conflicts Detected</h4>
              {conflicts.map((conflictGroup, index) => (
                <p key={index} className="text-sm text-red-700">
                  {conflictGroup.join(', ')} cannot be used together
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Mods Summary */}
      {selectedMods.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Selected Mods ({selectedMods.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedMods.map(mod => {
              const settingsSummary = renderSettingsSummary(mod);
              return (
                <div key={mod.acronym} className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <span className="font-medium">{mod.acronym}</span>
                  {settingsSummary && (
                    <span className="text-xs opacity-75">{settingsSummary}</span>
                  )}
                  {Object.keys(mod.settings || {}).length > 0 && (
                    <Settings className="w-3 h-3" />
                  )}
                  <button
                    onClick={() => handleModToggle(mod.acronym)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mod Categories */}
      {Object.entries(categories).map(([category, mods]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
            {category}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mods.map(mod => {
              const isSelected = isModSelected(mod.acronym);
              const selectedMod = getSelectedMod(mod.acronym);
              const hasSettings = mod.settings.length > 0;
              
              return (
                <div key={mod.acronym} className="space-y-2">
                  <button
                    onClick={() => handleModToggle(mod.acronym)}
                    className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg">{mod.acronym}</div>
                        <div className="text-sm opacity-75">{mod.name}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                    </div>
                  </button>
                  
                  {/* Settings Button */}
                  {isSelected && hasSettings && (
                    <button
                      onClick={() => toggleSettings(mod.acronym)}
                      className={`w-full p-2 rounded-lg border text-sm transition-colors ${
                        showSettings[mod.acronym]
                          ? 'border-blue-300 bg-blue-100 text-blue-800'
                          : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </div>
                    </button>
                  )}
                  
                  {/* Settings Panel */}
                  {isSelected && hasSettings && showSettings[mod.acronym] && selectedMod && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-gray-800">{mod.name} Settings</h4>
                      
                      {mod.settings.map(settingKey => {
                        const config = SETTING_CONFIGS[settingKey];
                        if (!config) return null;
                        
                        const currentValue = selectedMod.settings[settingKey] ?? 
                          (typeof config.getDefault === 'function' ? config.getDefault(mod.acronym) : config.default);
                        
                        return (
                          <div key={settingKey} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {config.label}
                              {config.format && (
                                <span className="ml-2 text-gray-500">
                                  ({config.format(currentValue)})
                                </span>
                              )}
                            </label>
                            
                            {config.type === 'boolean' && (
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={currentValue}
                                  onChange={(e) => handleSettingChange(mod.acronym, settingKey, e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600">Enable</span>
                              </label>
                            )}
                            
                            {config.type === 'range' && (
                              <div className="space-y-1">
                                {(() => {
                                  const range = getSettingRange(config, mod.acronym, settingKey);
                                  return (
                                    <>
                                      <input
                                        type="range"
                                        min={range.min}
                                        max={range.max}
                                        step={range.step}
                                        value={currentValue}
                                        onChange={(e) => handleSettingChange(mod.acronym, settingKey, parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                      />
                                      <div className="flex justify-between text-xs text-gray-500">
                                        <span>{range.min}</span>
                                        <span>{range.max}</span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            
                            {config.type === 'number' && (
                              <input
                                type="number"
                                value={currentValue}
                                onChange={(e) => handleSettingChange(mod.acronym, settingKey, parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            )}
                            
                            {config.type === 'select' && (
                              <select
                                value={currentValue}
                                onChange={(e) => {
                                  const val = config.options.find(opt => opt.value.toString() === e.target.value)?.value;
                                  handleSettingChange(mod.acronym, settingKey, val);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {config.options.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}