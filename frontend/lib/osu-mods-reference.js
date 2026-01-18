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
  'BR': { name: 'Barrel Roll', category: 'Fun', settings: ['roll_speed', 'direction'] },
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

  // Barrel Roll (corrected name)
  spin_speed: { 
    type: 'range', 
    min: 0.02, 
    max: 12.0, 
    step: 0.01, 
    default: 0.5,
    label: 'Spin Speed',
    format: (val) => `${val}`
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
  ['ST', 'TP', 'SD', 'SO'], // Target practice conflicts (restored)
];

const SETTING_RANGES = {
  // Speed/Rate settings
  speed_change: { 
    min: function(modAcronym) {
      if (['HT', 'DC'].includes(modAcronym)) return 0.5;
      if (['DT', 'NC'].includes(modAcronym)) return 1.01;
      return 0.5;
    },
    max: function(modAcronym) {
      if (['HT', 'DC'].includes(modAcronym)) return 0.99;
      if (['DT', 'NC'].includes(modAcronym)) return 2.0;
      return 2.0;
    },
    type: 'number', 
    precision: 0.01 
  },
  adjust_pitch: { type: 'boolean' },
  
  // Wind Up/Down
  initial_rate: { 
    min: function(modAcronym) {
      if (modAcronym === 'WU') return 0.5;
      if (modAcronym === 'WD') return 0.51;
      return 0.5;
    },
    max: function(modAcronym) {
      if (modAcronym === 'WU') return 1.99;
      if (modAcronym === 'WD') return 2.0;
      return 2.0;
    },
    type: 'number', 
    precision: 0.01 
  },
  final_rate: { 
    min: function(modAcronym) {
      if (modAcronym === 'WU') return 0.51;
      if (modAcronym === 'WD') return 0.5;
      return 0.5;
    },
    max: function(modAcronym) {
      if (modAcronym === 'WU') return 2.0;
      if (modAcronym === 'WD') return 1.99;
      return 2.0;
    },
    type: 'number', 
    precision: 0.01 
  },
  
  // Fail condition settings
  restart: { type: 'boolean' },
  fail_on_slider_tail: { type: 'boolean' },
  
  // Accuracy Challenge
  minimum_accuracy: { min: 0.6, max: 0.99, type: 'number', precision: 0.01 },
  accuracy_judge_mode: { 
    type: 'select', 
    options: ['Standard', 'Maximum Achievable'] 
  },
  
  // Hidden settings
  only_fade_approach_circles: { type: 'boolean' },
  
  // Flashlight settings
  size_multiplier: { min: 0.5, max: 2.0, type: 'number', precision: 0.1 },
  combo_based_size: { type: 'boolean' },
  follow_delay: { min: 120.0, max: 1200.0, type: 'number', precision: 1.0 },
  
  // Mirror settings
  reflection: { min: 0, max: 2, type: 'integer' },
  
  // Difficulty Adjust settings
  circle_size: { min: 0.0, max: 11.0, type: 'number', precision: 0.1 },
  drain_rate: { min: 0.0, max: 11.0, type: 'number', precision: 0.1 },
  overall_difficulty: { min: 0.0, max: 11.0, type: 'number', precision: 0.1 },
  approach_rate: { min: -10.0, max: 11.0, type: 'number', precision: 0.1 },
  scroll_speed: { min: 0.01, max: 4.0, type: 'number', precision: 0.01 },
  
  // Classic settings
  no_slider_head_accuracy: { type: 'boolean' },
  classic_note_lock: { type: 'boolean' },
  always_play_tail_sample: { type: 'boolean' },
  fade_hit_circle_early: { type: 'boolean' },
  classic_health: { type: 'boolean' },
  
  // Random settings
  seed: { type: 'integer' },
  angle_sharpness: { min: 1.0, max: 10.0, type: 'number', precision: 0.1 },
  
  // Target Practice settings
  metronome: { type: 'boolean' },
  
  // Approach Different
  initial_size: { min: 1.5, max: 10.0, type: 'number', precision: 0.1 },
  style: { 
    type: 'select', 
    options: ['Linear', 'Gravity', 'InOut1', 'InOut2', 'Accelerate1', 'Accelerate2', 'Accelerate3', 'Decelerate1', 'Decelerate2', 'Decelerate3'] 
  },
  
  // Muted
  start_muted: { type: 'boolean' },
  enable_metronome: { type: 'boolean' },
  final_volume_combo_count: { min: 0, max: 500, type: 'integer' },
  mute_hit_sounds: { type: 'boolean' },
  
  // Scale modification settings
  start_scale: { 
    min: function(modAcronym) {
      if (modAcronym === 'GR') return 0.0;
      if (modAcronym === 'DF') return 1.0;
      return 0.0;
    },
    max: function(modAcronym) {
      if (modAcronym === 'GR') return 0.99;
      if (modAcronym === 'DF') return 25.0;
      return 25.0;
    },
    type: 'number', 
    precision: function(modAcronym) {
      if (modAcronym === 'GR') return 0.01;
      if (modAcronym === 'DF') return 0.1;
      return 0.1;
    }
  },
  
  // Barrel Roll (corrected name)
  spin_speed: { min: 0.02, max: 12.0, type: 'number', precision: 0.01 },
  direction: { 
    type: 'select', 
    options: ['Clockwise', 'Counterclockwise'] 
  },
  
  // Depth settings
  max_depth: { min: 50, max: 200, type: 'integer' },
  show_approach_circles: { type: 'boolean' },
  
  // Wiggle settings
  strength: { min: 0.1, max: 2.0, type: 'number', precision: 0.1 },
  
  // Attraction/Repulsion settings
  attraction_strength: { min: 0.05, max: 1.0, type: 'number', precision: 0.05 },
  repulsion_strength: { min: 0.05, max: 1.0, type: 'number', precision: 0.05 },
  
  // Bloom settings
  max_size_combo_count: { min: 5, max: 100, type: 'integer' },
  max_cursor_size: { min: 5.0, max: 15.0, type: 'number', precision: 0.1 },
  
  // No Scope settings
  hidden_combo_count: { min: 0, max: 50, type: 'integer' },
};

// Mode-specific mods for filtering
const MODE_SPECIFIC_MODS = {
  'osu': ['BL', 'AP', 'SO', 'TP', 'FR', 'ST', 'AD', 'DF', 'GR', 'SI', 'TC', 'DP', 'TR', 'WG', 'MG', 'RP', 'BU', 'BM', 'AL', 'SG', 'TD'],
  'taiko': ['SW'],
  'catch': ['FF'],
  'mania': ['1K', '2K', '3K', '4K', '5K', '6K', '7K', '8K', '9K', 'DS', 'IN', 'CS', 'HO', 'NR', 'FI']
};

module.exports = {
  OSU_MODS,
  CONFLICTING_MODS,
  SETTING_RANGES,
  SETTING_CONFIGS,
  MODE_SPECIFIC_MODS
};