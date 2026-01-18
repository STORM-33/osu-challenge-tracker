// lib/ruleset-name-generator.js
// Utility for auto-generating ruleset names from mod data

// Default values for mod settings (only show in name if different)
const MOD_DEFAULT_VALUES = {
  // Speed/Rate settings
  speed_change: 1.5, // For DT/NC
  adjust_pitch: false,
  initial_rate: 1.0,
  final_rate: 1.5,
  
  // Fail condition settings
  restart: false,
  fail_on_slider_tail: false,
  minimum_accuracy: 0.8,
  
  // Visual settings
  only_fade_approach_circles: false,
  
  // Flashlight settings
  size_multiplier: 1.0,
  combo_based_size: true,
  follow_delay: 120,
  
  // Mirror settings
  reflection: 0, // Horizontal
  
  // Difficulty Adjust (use null to indicate "not specified")
  circle_size: null,
  drain_rate: null,
  overall_difficulty: null,
  approach_rate: null,
  scroll_speed: 1.5,
  
  // Classic settings (all true by default)
  no_slider_head_accuracy: true,
  classic_note_lock: true,
  always_play_tail_sample: true,
  fade_hit_circle_early: true,
  classic_health: true,
  
  // Random settings
  seed: 0,
  angle_sharpness: 7.0,
  
  // Target Practice
  metronome: true,
  
  // Approach Different
  scale: 4.0,
  style: 0, // Linear
  
  // Muted settings
  inverse_muting: false,
  enable_metronome: false,
  mute_combo_count: 25,
  
  // Scale modification
  start_scale: 2.0,
  
  // Barrel Roll
  spin_speed: 1.0,
  spin_speed: 1.0,
  
  // Depth
  max_depth: 100,
  show_approach_circles: true,
  
  // Wiggle
  strength: 1.0,
  
  // Attraction/Repulsion
  attraction_strength: 0.5,
  repulsion_strength: 0.5,
  
  // Bloom
  max_size_combo_count: 50,
  max_cursor_size: 10.0,
  
  // No Scope
  hidden_combo_count: 10
};

// Format functions for different setting types
const SETTING_FORMATTERS = {
  // Multipliers with 'x' suffix
  speed_change: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  initial_rate: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  final_rate: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  size_multiplier: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  scroll_speed: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  start_scale: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  roll_speed: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  spin_speed: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  strength: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  max_cursor_size: (val, defaultVal) => val !== defaultVal ? `${val}x` : null,
  
  // Percentages
  minimum_accuracy: (val, defaultVal) => val !== defaultVal ? `${Math.round(val * 100)}%` : null,
  attraction_strength: (val, defaultVal) => val !== defaultVal ? `${Math.round(val * 100)}%` : null,
  repulsion_strength: (val, defaultVal) => val !== defaultVal ? `${Math.round(val * 100)}%` : null,
  
  // Time values
  follow_delay: (val, defaultVal) => val !== defaultVal ? `${val}ms` : null,
  
  // Reflection type
  reflection: (val, defaultVal) => {
    if (val === defaultVal) return null;
    const types = ['H', 'V', 'HV'];
    return types[val] || 'H';
  },
  
  // Style enum
  style: (val, defaultVal) => {
    if (val === defaultVal) return null;
    const styles = ['Lin', 'Grav', 'IO1', 'IO2', 'A1', 'A2', 'A3', 'D1', 'D2', 'D3'];
    return styles[val] || 'Lin';
  },
  
  // Difficulty Adjust - special handling for null defaults
  circle_size: (val, defaultVal) => val != null ? `CS${val}` : null,
  drain_rate: (val, defaultVal) => val != null ? `HP${val}` : null,
  overall_difficulty: (val, defaultVal) => val != null ? `OD${val}` : null,
  approach_rate: (val, defaultVal) => val != null ? `AR${val}` : null,
  
  // Simple numeric values
  scale: (val, defaultVal) => val !== defaultVal ? val.toString() : null,
  max_depth: (val, defaultVal) => val !== defaultVal ? val.toString() : null,
  angle_sharpness: (val, defaultVal) => val !== defaultVal ? val.toString() : null,
  mute_combo_count: (val, defaultVal) => val !== defaultVal ? val.toString() : null,
  max_size_combo_count: (val, defaultVal) => val !== defaultVal ? val.toString() : null,
  hidden_combo_count: (val, defaultVal) => val !== defaultVal ? val.toString() : null,
  seed: (val, defaultVal) => val !== defaultVal ? val.toString() : null,
  
  // Boolean flags - only show if true and different from default
  adjust_pitch: (val, defaultVal) => val !== defaultVal && val ? 'Pitch' : null,
  restart: (val, defaultVal) => val !== defaultVal && val ? 'Restart' : null,
  fail_on_slider_tail: (val, defaultVal) => val !== defaultVal && val ? 'FailTail' : null,
  only_fade_approach_circles: (val, defaultVal) => val !== defaultVal && val ? 'FadeAC' : null,
  combo_based_size: (val, defaultVal) => val !== defaultVal ? (val ? 'ComboSize' : 'NoComboSize') : null,
  metronome: (val, defaultVal) => val !== defaultVal ? (val ? 'Metro' : 'NoMetro') : null,
  inverse_muting: (val, defaultVal) => val !== defaultVal && val ? 'InvMute' : null,
  enable_metronome: (val, defaultVal) => val !== defaultVal && val ? 'Metro' : null,
  show_approach_circles: (val, defaultVal) => val !== defaultVal ? (val ? 'ShowAC' : 'HideAC') : null,
  
  // Classic mod settings - only show if different from default (all true)
  no_slider_head_accuracy: (val, defaultVal) => val !== defaultVal ? (val ? null : 'SliderHead') : null,
  classic_note_lock: (val, defaultVal) => val !== defaultVal ? (val ? null : 'ModernLock') : null,
  always_play_tail_sample: (val, defaultVal) => val !== defaultVal ? (val ? null : 'NoTailSample') : null,
  fade_hit_circle_early: (val, defaultVal) => val !== defaultVal ? (val ? null : 'NoEarlyFade') : null,
  classic_health: (val, defaultVal) => val !== defaultVal ? (val ? null : 'ModernHealth') : null
};

/**
 * Generate a formatted string for a single mod with its settings
 * @param {Object} mod - Mod object with acronym and settings
 * @returns {string} - Formatted mod string (e.g., "DT(1.8x)", "HR", "DA(CS4OD8)")
 */
function formatSingleMod(mod) {
  const { acronym, settings = {} } = mod;
  
  // Get all non-default settings for this mod
  const formattedSettings = [];
  
  for (const [settingKey, settingValue] of Object.entries(settings)) {
    const defaultValue = MOD_DEFAULT_VALUES[settingKey];
    const formatter = SETTING_FORMATTERS[settingKey];
    
    if (formatter) {
      const formatted = formatter(settingValue, defaultValue);
      if (formatted) {
        formattedSettings.push(formatted);
      }
    }
  }
  
  // Return acronym with settings in parentheses if any
  if (formattedSettings.length > 0) {
    return `${acronym}(${formattedSettings.join('')})`;
  }
  
  return acronym;
}

/**
 * Generate a ruleset name from mod array and match type
 * @param {Array} requiredMods - Array of mod objects
 * @param {string} matchType - 'exact', 'at_least', or 'any_of'
 * @returns {string} - Generated ruleset name
 */
function generateRulesetName(requiredMods, matchType = 'at_least') {
  if (!requiredMods || requiredMods.length === 0) {
    return 'NoMod';
  }
  
  // Format each mod
  const formattedMods = requiredMods.map(formatSingleMod);
  
  // Join mods without separators (standard osu! convention)
  let modString = formattedMods.join('');
  
  // Add prefix for non-exact match types
  switch (matchType) {
    case 'at_least':
      modString = `AtLeast:${modString}`;
      break;
    case 'any_of':
      modString = `Any:${modString}`;
      break;
    case 'exact':
    default:
      // No prefix for exact match
      break;
  }
  
  return modString;
}

/**
 * Generate a human-readable description of the ruleset
 * @param {Array} requiredMods - Array of mod objects
 * @param {string} matchType - 'exact', 'at_least', or 'any_of'
 * @returns {string} - Human-readable description
 */
function generateRulesetDescription(requiredMods, matchType = 'at_least') {
  if (!requiredMods || requiredMods.length === 0) {
    return 'No mods required';
  }
  
  const modNames = requiredMods.map(mod => mod.acronym).join(', ');
  
  switch (matchType) {
    case 'exact':
      return `Must use exactly: ${modNames}`;
    case 'at_least':
      return `Must include all of: ${modNames} (extras allowed)`;
    case 'any_of':
      return `Must include at least one of: ${modNames} (extras allowed)`;
    default:
      return `Invalid match type: ${matchType}`;
  }
}

/**
 * Validate if a generated name would be unique
 * @param {string} generatedName - The generated name to check
 * @param {Array} existingNames - Array of existing ruleset names to check against
 * @returns {boolean} - True if unique, false if duplicate
 */
function isRulesetNameUnique(generatedName, existingNames = []) {
  return !existingNames.includes(generatedName);
}

/**
 * Get a preview of what the ruleset name will look like
 * @param {Array} requiredMods - Array of mod objects
 * @param {string} matchType - 'exact', 'at_least', or 'any_of'
 * @returns {Object} - Object with name, description, and validation info
 */
function previewRulesetName(requiredMods, matchType = 'at_least') {
  const name = generateRulesetName(requiredMods, matchType);
  const description = generateRulesetDescription(requiredMods, matchType);
  
  return {
    name,
    description,
    isValid: name.length > 0 && name.length <= 100, // Reasonable length limit
    modCount: requiredMods ? requiredMods.length : 0
  };
}

// Export for ES6 modules
export {
  generateRulesetName,
  generateRulesetDescription,
  previewRulesetName,
  isRulesetNameUnique,
  formatSingleMod,
  MOD_DEFAULT_VALUES,
  SETTING_FORMATTERS
};

// Also export as default for convenience
export default {
  generateRulesetName,
  generateRulesetDescription,
  previewRulesetName,
  isRulesetNameUnique,
  formatSingleMod,
  MOD_DEFAULT_VALUES,
  SETTING_FORMATTERS
};

// Backward compatibility
if (typeof window !== 'undefined') {
  window.RulesetNameGenerator = {
    generateRulesetName,
    generateRulesetDescription,
    previewRulesetName,
    isRulesetNameUnique,
    formatSingleMod
  };
}