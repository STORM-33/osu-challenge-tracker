import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { withAdminAuth } from '../../../../lib/auth-middleware';
import { OSU_MODS, CONFLICTING_MODS, SETTING_RANGES, SETTING_CONFIGS } from '../../../../lib/osu-mods-reference';

async function handler(req, res) {
  const { challengeId } = req.query;

  if (!challengeId || !/^\d+$/.test(challengeId)) {
    return res.status(400).json({ error: 'Invalid challenge ID' });
  }

  const challengeIdInt = parseInt(challengeId);

  if (req.method === 'GET') {
    return handleGetRuleset(req, res, challengeIdInt);
  } else if (req.method === 'POST' || req.method === 'PUT') {
    return withAdminAuth(async (req, res) => {
      return handleCreateOrUpdateRuleset(req, res, challengeIdInt);
    })(req, res);
  } else if (req.method === 'DELETE') {
    return withAdminAuth(async (req, res) => {
      return handleDeleteRuleset(req, res, challengeIdInt);
    })(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetRuleset(req, res, challengeId) {
  try {
    const { data: challenge, error } = await supabaseAdmin
      .from('challenges')
      .select(`
        id,
        room_id,
        name,
        custom_name,
        has_ruleset,
        required_mods,
        ruleset_match_type
      `)
      .eq('id', challengeId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch challenge' });
    }

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Get current winner if ruleset exists
    let winner = null;
    if (challenge.has_ruleset) {
      const { data: winnerData } = await supabaseAdmin
        .from('challenge_ruleset_winners')
        .select(`
          score_id,
          won_at,
          scores (
            score,
            mods_detailed,
            users (
              username,
              avatar_url
            )
          )
        `)
        .eq('challenge_id', challengeId)
        .single();

      if (winnerData) {
        winner = {
          score_id: winnerData.score_id,
          won_at: winnerData.won_at,
          score: winnerData.scores.score,
          mods_detailed: winnerData.scores.mods_detailed,
          username: winnerData.scores.users.username,
          avatar_url: winnerData.scores.users.avatar_url
        };
      }
    }

    res.status(200).json({
      success: true,
      challenge,
      winner
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCreateOrUpdateRuleset(req, res, challengeId) {
  try {
    const { 
      required_mods, 
      ruleset_match_type 
    } = req.body;

    // Validate input (removed name and description validation)
    const validation = validateRulesetData({
      required_mods,
      ruleset_match_type
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid ruleset data', 
        details: validation.errors 
      });
    }

    // Check if challenge exists
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('id, name')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Update challenge with ruleset (removed name and description)
    const { data: updatedChallenge, error: updateError } = await supabaseAdmin
      .from('challenges')
      .update({
        has_ruleset: true,
        required_mods: required_mods || [],
        ruleset_match_type: ruleset_match_type || 'exact',
        updated_at: new Date().toISOString()
      })
      .eq('id', challengeId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update ruleset' });
    }

    // Calculate new winner
    const { data: winnerResult, error: winnerError } = await supabaseAdmin
      .rpc('update_challenge_ruleset_winner', { challenge_id_param: challengeId });

    if (winnerError) {
      console.warn('Winner calculation error:', winnerError);
    }

    res.status(200).json({
      success: true,
      challenge: updatedChallenge,
      winner_result: winnerResult,
      message: 'Ruleset updated successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDeleteRuleset(req, res, challengeId) {
  try {
    // Remove ruleset from challenge (removed name and description)
    const { data: updatedChallenge, error: updateError } = await supabaseAdmin
      .from('challenges')
      .update({
        has_ruleset: false,
        required_mods: [],
        ruleset_match_type: 'exact',
        updated_at: new Date().toISOString()
      })
      .eq('id', challengeId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to remove ruleset' });
    }

    // Remove winner record
    await supabaseAdmin
      .from('challenge_ruleset_winners')
      .delete()
      .eq('challenge_id', challengeId);

    res.status(200).json({
      success: true,
      message: 'Ruleset removed successfully'
    });

  } catch (error) {
    console.error('API error:', error);
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

export default handler;