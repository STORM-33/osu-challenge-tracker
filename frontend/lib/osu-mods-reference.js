const OFFICIAL_MODS_REFERENCE = require('../../osu-mods-refference.json');

const CATEGORY_LABELS = {
  DifficultyReduction: 'Difficulty Reduction',
  DifficultyIncrease: 'Difficulty Increase',
  Automation: 'Automation',
  Conversion: 'Conversion',
  Fun: 'Fun',
  System: 'System'
};

function normalizeCategory(type) {
  return CATEGORY_LABELS[type] || type.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function normalizeRulesetName(name) {
  return name === 'fruits' ? 'catch' : name;
}

function getSettingNames(settings) {
  if (!Array.isArray(settings)) {
    return [];
  }

  return settings
    .map((setting) => setting?.Name)
    .filter(Boolean);
}

function buildOsuMods(reference) {
  const mods = {};

  for (const ruleset of reference) {
    for (const mod of ruleset?.Mods || []) {
      const acronym = mod.Acronym;
      const settingNames = getSettingNames(mod.Settings);

      if (!mods[acronym]) {
        mods[acronym] = {
          name: mod.Name,
          category: normalizeCategory(mod.Type),
          settings: [...new Set(settingNames)]
        };
        continue;
      }

      mods[acronym].settings = [...new Set([...mods[acronym].settings, ...settingNames])];
    }
  }

  return mods;
}

function buildConflictingMods(reference, validMods, rulesetName = 'osu') {
  const conflictPairs = new Set();
  const normalizedRulesetName = normalizeRulesetName(rulesetName);
  const targetRuleset = reference.find(
    (ruleset) => normalizeRulesetName(ruleset.Name) === normalizedRulesetName
  );

  if (!targetRuleset) {
    return [];
  }

  for (const mod of targetRuleset?.Mods || []) {
    const modAcronym = mod.Acronym;
    const incompatibilities = Array.isArray(mod.IncompatibleMods) ? mod.IncompatibleMods : [];

    for (const incompatibleAcronym of incompatibilities) {
      if (incompatibleAcronym === modAcronym) {
        continue;
      }

      if (!validMods[modAcronym] || !validMods[incompatibleAcronym]) {
        continue;
      }

      const [first, second] = [modAcronym, incompatibleAcronym].sort();
      conflictPairs.add(`${first}|${second}`);
    }
  }

  return [...conflictPairs]
    .map((pair) => pair.split('|'))
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
}

function buildModeSpecificMods(reference) {
  const rulesetMods = {};

  for (const ruleset of reference) {
    const rulesetName = normalizeRulesetName(ruleset.Name);
    rulesetMods[rulesetName] = new Set((ruleset?.Mods || []).map((mod) => mod.Acronym));
  }

  const modeNames = Object.keys(rulesetMods);
  const commonMods = new Set(rulesetMods[modeNames[0]] || []);
  for (const modeName of modeNames.slice(1)) {
    for (const acronym of [...commonMods]) {
      if (!rulesetMods[modeName].has(acronym)) {
        commonMods.delete(acronym);
      }
    }
  }

  const modeSpecificMods = {};
  for (const [modeName, modSet] of Object.entries(rulesetMods)) {
    modeSpecificMods[modeName] = [...modSet]
      .filter((acronym) => !commonMods.has(acronym))
      .sort();
  }

  return modeSpecificMods;
}

const OSU_MODS = buildOsuMods(OFFICIAL_MODS_REFERENCE);
const CONFLICTING_MODS = buildConflictingMods(OFFICIAL_MODS_REFERENCE, OSU_MODS, 'osu');
const MODE_SPECIFIC_MODS = buildModeSpecificMods(OFFICIAL_MODS_REFERENCE);

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

module.exports = {
  OSU_MODS,
  CONFLICTING_MODS,
  SETTING_RANGES,
  SETTING_CONFIGS,
  MODE_SPECIFIC_MODS
};
