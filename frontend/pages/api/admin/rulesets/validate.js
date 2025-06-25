import { withAPITracking } from '../../../middleware';
import { withAdminAuth } from '../../../lib/auth-middleware';

const { OSU_MODS, CONFLICTING_MODS, SETTING_RANGES } = require('../../../../lib/osu-mods-reference');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return withAdminAuth(handleValidateRuleset)(req, res);
}

async function handleValidateRuleset(req, res) {
  try {
    const { required_mods, ruleset_match_type, test_scores } = req.body;

    // Validate the ruleset itself (removed name validation)
    const rulesetValidation = validateRulesetData({
      required_mods,
      ruleset_match_type
    });

    if (!rulesetValidation.valid) {
      return res.status(400).json({
        success: false,
        errors: rulesetValidation.errors
      });
    }

    // Test against provided scores if any
    let scoreTests = [];
    if (test_scores && Array.isArray(test_scores)) {
      scoreTests = test_scores.map(testScore => {
        const qualifies = validateScoreAgainstRuleset(
          testScore.mods_detailed || [],
          required_mods || [],
          ruleset_match_type || 'exact'
        );

        return {
          username: testScore.username || 'Test User',
          mods_detailed: testScore.mods_detailed || [],
          qualifies,
          reason: qualifies ? 'Meets ruleset requirements' : getFailureReason(
            testScore.mods_detailed || [],
            required_mods || [],
            ruleset_match_type || 'exact'
          )
        };
      });
    }

    // Generate examples of qualifying mod combinations
    const examples = generateQualifyingExamples(required_mods || [], ruleset_match_type || 'exact');

    res.status(200).json({
      success: true,
      validation: {
        valid: true,
        required_mods: required_mods || [],
        match_type: ruleset_match_type || 'exact'
      },
      score_tests: scoreTests,
      examples: examples,
      message: 'Ruleset validation successful'
    });

  } catch (error) {
    console.error('Validation API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function validateRulesetData({ required_mods, ruleset_match_type }) {
  const errors = [];

  // Validate match type
  if (!['exact', 'at_least', 'any_of'].includes(ruleset_match_type)) {
    errors.push('Invalid match type. Must be "exact", "at_least", or "any_of"');
  }

  // Validate required mods
  if (!Array.isArray(required_mods)) {
    errors.push('Required mods must be an array');
  } else if (required_mods.length === 0) {
    errors.push('At least one mod must be specified');
  } else {
    // Validate each mod
    const modAcronyms = [];
    
    for (let i = 0; i < required_mods.length; i++) {
      const mod = required_mods[i];
      
      if (!mod.acronym || typeof mod.acronym !== 'string') {
        errors.push(`Mod ${i + 1}: acronym is required`);
        continue;
      }

      const acronym = mod.acronym.toUpperCase();
      
      // Check if mod exists in osu! reference
      if (!OSU_MODS[acronym]) {
        errors.push(`Mod ${i + 1}: "${acronym}" is not a valid osu! mod`);
        continue;
      }

      // Check for duplicate mods
      if (modAcronyms.includes(acronym)) {
        errors.push(`Mod ${i + 1}: "${acronym}" is specified multiple times`);
        continue;
      }
      
      modAcronyms.push(acronym);

      // Validate settings
      if (mod.settings && typeof mod.settings === 'object') {
        const validSettings = OSU_MODS[acronym].settings;
        
        for (const settingKey of Object.keys(mod.settings)) {
          if (!validSettings.includes(settingKey)) {
            errors.push(`Mod ${acronym}: "${settingKey}" is not a valid setting`);
            continue;
          }

          const settingValue = mod.settings[settingKey];
          const range = SETTING_RANGES[settingKey];
          
          if (range) {
            if (range.type === 'boolean' && typeof settingValue !== 'boolean') {
              errors.push(`Mod ${acronym}: "${settingKey}" must be a boolean`);
            } else if (range.type === 'number' && typeof settingValue !== 'number') {
              errors.push(`Mod ${acronym}: "${settingKey}" must be a number`);
            } else if (range.type === 'integer' && (!Number.isInteger(settingValue))) {
              errors.push(`Mod ${acronym}: "${settingKey}" must be an integer`);
            } else if (range.min !== undefined && settingValue < range.min) {
              errors.push(`Mod ${acronym}: "${settingKey}" must be at least ${range.min}`);
            } else if (range.max !== undefined && settingValue > range.max) {
              errors.push(`Mod ${acronym}: "${settingKey}" must be at most ${range.max}`);
            }
          }
        }
      }
    }

    // Check for conflicting mods
    for (const conflictGroup of CONFLICTING_MODS) {
      const conflictingFound = modAcronyms.filter(acronym => conflictGroup.includes(acronym));
      if (conflictingFound.length > 1) {
        errors.push(`Conflicting mods detected: ${conflictingFound.join(', ')} cannot be used together`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateScoreAgainstRuleset(scoreMods, requiredMods, matchType) {
  // Handle empty cases
  if (!requiredMods || requiredMods.length === 0) {
    return true; // No requirements means all scores qualify
  }
  
  if (!scoreMods) {
    scoreMods = [];
  }

  switch (matchType) {
    case 'exact':
      // Must have exactly the same mods with same settings
      if (scoreMods.length !== requiredMods.length) {
        return false;
      }
      
      // Check each required mod exists with exact settings
      for (const requiredMod of requiredMods) {
        const scoreModMatch = scoreMods.find(scoreMod => 
          scoreMod.acronym === requiredMod.acronym
        );
        
        if (!scoreModMatch) {
          return false;
        }
        
        // Check settings match exactly
        const requiredSettings = requiredMod.settings || {};
        const scoreSettings = scoreModMatch.settings || {};
        
        if (JSON.stringify(requiredSettings) !== JSON.stringify(scoreSettings)) {
          return false;
        }
      }
      
      return true;
    
    case 'at_least':
      // Must have all required mods with exact settings (can have extras)
      for (const requiredMod of requiredMods) {
        const scoreModMatch = scoreMods.find(scoreMod => 
          scoreMod.acronym === requiredMod.acronym
        );
        
        if (!scoreModMatch) {
          return false;
        }
        
        // Check if all required settings match
        const requiredSettings = requiredMod.settings || {};
        const scoreSettings = scoreModMatch.settings || {};
        
        for (const [key, value] of Object.entries(requiredSettings)) {
          if (scoreSettings[key] !== value) {
            return false;
          }
        }
      }
      
      return true;
    
    case 'any_of':
      // Must have at least one required mod with exact settings
      for (const requiredMod of requiredMods) {
        const scoreModMatch = scoreMods.find(scoreMod => 
          scoreMod.acronym === requiredMod.acronym
        );
        
        if (scoreModMatch) {
          // Check if all required settings match
          const requiredSettings = requiredMod.settings || {};
          const scoreSettings = scoreModMatch.settings || {};
          
          let settingsMatch = true;
          for (const [key, value] of Object.entries(requiredSettings)) {
            if (scoreSettings[key] !== value) {
              settingsMatch = false;
              break;
            }
          }
          
          if (settingsMatch) {
            return true;
          }
        }
      }
      
      return false;
    
    default:
      return false;
  }
}

function getFailureReason(scoreMods, requiredMods, matchType) {
  if (!requiredMods || requiredMods.length === 0) {
    return 'No requirements specified';
  }

  if (!scoreMods) {
    scoreMods = [];
  }

  switch (matchType) {
    case 'exact':
      if (scoreMods.length !== requiredMods.length) {
        return `Must have exactly ${requiredMods.length} mod(s), but has ${scoreMods.length}`;
      }
      
      for (const requiredMod of requiredMods) {
        const scoreModMatch = scoreMods.find(scoreMod => 
          scoreMod.acronym === requiredMod.acronym
        );
        
        if (!scoreModMatch) {
          return `Missing required mod: ${requiredMod.acronym}`;
        }
        
        const requiredSettings = requiredMod.settings || {};
        const scoreSettings = scoreModMatch.settings || {};
        
        for (const [key, value] of Object.entries(requiredSettings)) {
          if (scoreSettings[key] !== value) {
            return `Mod ${requiredMod.acronym}: ${key} should be ${value}, but is ${scoreSettings[key]}`;
          }
        }
      }
      
      return 'Unknown exact match failure';
    
    case 'at_least':
      for (const requiredMod of requiredMods) {
        const scoreModMatch = scoreMods.find(scoreMod => 
          scoreMod.acronym === requiredMod.acronym
        );
        
        if (!scoreModMatch) {
          return `Missing required mod: ${requiredMod.acronym}`;
        }
        
        const requiredSettings = requiredMod.settings || {};
        const scoreSettings = scoreModMatch.settings || {};
        
        for (const [key, value] of Object.entries(requiredSettings)) {
          if (scoreSettings[key] !== value) {
            return `Mod ${requiredMod.acronym}: ${key} should be ${value}, but is ${scoreSettings[key]}`;
          }
        }
      }
      
      return 'Unknown at_least failure';
    
    case 'any_of':
      const modNames = requiredMods.map(mod => mod.acronym).join(', ');
      return `Must have at least one of: ${modNames} with correct settings`;
    
    default:
      return 'Invalid match type';
  }
}

function generateQualifyingExamples(requiredMods, matchType) {
  if (!requiredMods || requiredMods.length === 0) {
    return [{ description: 'Any mods (no requirements)', mods: [] }];
  }

  const examples = [];

  switch (matchType) {
    case 'exact':
      examples.push({
        description: 'Exact match - only these mods',
        mods: requiredMods
      });
      break;
    
    case 'at_least':
      examples.push({
        description: 'Minimum required mods',
        mods: requiredMods
      });
      
      if (requiredMods.length === 1) {
        examples.push({
          description: 'Required mods + additional mod',
          mods: [...requiredMods, { acronym: 'HD', settings: {} }]
        });
      }
      break;
    
    case 'any_of':
      requiredMods.forEach((mod, index) => {
        examples.push({
          description: `Option ${index + 1}: ${mod.acronym} ${Object.keys(mod.settings || {}).length > 0 ? 'with settings' : ''}`,
          mods: [mod]
        });
      });
      
      if (requiredMods.length > 1) {
        examples.push({
          description: 'Multiple options + additional mod',
          mods: [requiredMods[0], { acronym: 'HD', settings: {} }]
        });
      }
      break;
  }

  return examples;
}

export default withAPITracking(handler, { memoryMB: 256 });