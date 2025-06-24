const OSU_MODS = {
  // Difficulty Reduction Mods
  'EZ': { settings: [] }, 
  'NF': { settings: [] }, 
  'HT': { settings: ['speed_change', 'adjust_pitch'] }, 
  'DC': { settings: ['speed_change'] }, 
  
  // Difficulty Increase Mods
  'HR': { settings: [] }, 
  'SD': { settings: ['restart', 'fail_on_slider_tail'] }, 
  'PF': { settings: ['restart'] }, 
  'DT': { settings: ['speed_change', 'adjust_pitch'] }, 
  'NC': { settings: ['speed_change'] }, 
  'HD': { settings: ['only_fade_approach_circles'] }, 
  'AC': { settings: ['minimum_accuracy'] }, 
  'FL': { settings: ['size_multiplier', 'combo_based_size', 'follow_delay'] }, 
  'BL': { settings: [] }, // Blinds (osu! only)
  
  // Automation Mods
  'AT': { settings: [] }, 
  'CN': { settings: [] }, 
  'RL': { settings: [] }, // Relax (can also be RX)
  'RX': { settings: [] }, // Relax (alternative acronym)
  'AP': { settings: [] }, // Autopilot (osu! only)
  'SO': { settings: [] }, // Spun Out (osu! only)
  
  // Conversion Mods
  'MR': { settings: ['reflection'] }, 
  'DA': { settings: ['circle_size', 'drain_rate', 'overall_difficulty', 'approach_rate', 'scroll_speed'] }, 
  'CL': { settings: ['no_slider_head_accuracy', 'classic_note_lock', 'always_play_tail_sample', 'fade_hit_circle_early', 'classic_health'] }, 
  'RD': { settings: ['seed', 'angle_sharpness'] }, 
  'TP': { settings: ['seed', 'metronome'] }, // Target Practice (osu! only)
  'FR': { settings: [] }, // Freeze Frame (osu! only)
  'ST': { settings: [] }, // Strict Tracking (osu! only)
  
  // Fun Mods
  'WU': { settings: ['initial_rate', 'final_rate'] }, 
  'WD': { settings: ['initial_rate', 'final_rate'] }, 
  'AS': { settings: ['initial_rate', 'adjust_pitch'] }, 
  'AD': { settings: ['scale', 'style'] }, // Approach Different (osu! only)
  'MU': { settings: ['inverse_muting', 'enable_metronome', 'mute_combo_count'] }, 
  'DF': { settings: ['start_scale'] }, // Deflate (osu! only)
  'GR': { settings: ['start_scale'] }, // Grow (osu! only)
  'SI': { settings: [] }, // Spin In (osu! only)
  'TC': { settings: [] }, // Traceable (osu! only)
  'BR': { settings: ['roll_speed', 'spin_speed'] }, 
  'DP': { settings: ['max_depth', 'show_approach_circles'] }, // Depth (osu! only)
  'TR': { settings: [] }, // Transform (osu! only)
  'WG': { settings: ['strength'] }, // Wiggle (osu! only)
  'MG': { settings: ['attraction_strength'] }, // Magnetised (osu! only)
  'RP': { settings: ['repulsion_strength'] }, // Repel (osu! only)
  'BU': { settings: [] }, // Bubbles (osu! only)
  'SY': { settings: [] }, // Synesthesia
  'BM': { settings: ['max_size_combo_count', 'max_cursor_size'] }, // Bloom (osu! only)
  'NS': { settings: ['hidden_combo_count'] }, // No Scope
  'AL': { settings: [] }, // Alternate (osu! only)
  'SG': { settings: [] }, // Single Tap (osu! only)
  'TD': { settings: [] }, // Touch Device
  
  // System Mods
  'SV2': { settings: [] }, 
  
  // osu!mania Key Mods
  '1K': { settings: [] }, '2K': { settings: [] }, '3K': { settings: [] },
  '4K': { settings: [] }, '5K': { settings: [] }, '6K': { settings: [] },
  '7K': { settings: [] }, '8K': { settings: [] }, '9K': { settings: [] },
  
  // osu!mania Specific Mods
  'DS': { settings: [] }, // Dual Stages
  'IN': { settings: [] }, // Invert
  'CS': { settings: ['scroll_speed'] }, // Constant Speed
  'HO': { settings: [] }, // Hold Off
  'NR': { settings: [] }, // No Release
  'FI': { settings: [] }, // Fade In
  
  // osu!taiko Specific Mods
  'SW': { settings: [] }, // Swap
  
  // osu!catch Specific Mods
  'FF': { settings: [] }, // Floating Fruits
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
  ['ST', 'TP', 'SD', 'SO'], // Target practice conflicts
];

const SETTING_RANGES = {
  // Speed/Rate settings
  speed_change: { min: 0.5, max: 2.0, type: 'number', precision: 0.01 },
  adjust_pitch: { type: 'boolean' },
  initial_rate: { min: 0.5, max: 2.0, type: 'number', precision: 0.01 },
  final_rate: { min: 0.5, max: 2.0, type: 'number', precision: 0.01 },
  
  // Fail condition settings
  restart: { type: 'boolean' },
  fail_on_slider_tail: { type: 'boolean' },
  minimum_accuracy: { min: 0.0, max: 1.0, type: 'number', precision: 0.01 },
  
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
  
  // New mod settings
  scale: { min: 1.5, max: 10.0, type: 'number', precision: 0.1 },
  style: { min: 0, max: 9, type: 'integer' },
  inverse_muting: { type: 'boolean' },
  enable_metronome: { type: 'boolean' },
  mute_combo_count: { min: 1, max: 50, type: 'integer' },
  start_scale: { min: 0.0, max: 25.0, type: 'number', precision: 0.1 },
  roll_speed: { min: 0.25, max: 2.0, type: 'number', precision: 0.05 },
  spin_speed: { min: 0.5, max: 4.0, type: 'number', precision: 0.1 },
  max_depth: { min: 50, max: 200, type: 'integer' },
  show_approach_circles: { type: 'boolean' },
  strength: { min: 0.1, max: 2.0, type: 'number', precision: 0.1 },
  attraction_strength: { min: 0.05, max: 1.0, type: 'number', precision: 0.05 },
  repulsion_strength: { min: 0.05, max: 1.0, type: 'number', precision: 0.05 },
  max_size_combo_count: { min: 5, max: 100, type: 'integer' },
  max_cursor_size: { min: 5.0, max: 15.0, type: 'number', precision: 0.1 },
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
  MODE_SPECIFIC_MODS
};