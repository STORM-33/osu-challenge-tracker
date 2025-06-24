import { withAPITracking } from '../../../middleware';
import { supabase } from '../../../lib/supabase';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomId } = req.query;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Validate roomId format
    if (!/^\d+$/.test(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID format' });
    }

    console.log(`Fetching challenge details for room ${roomId}`);

    // Get challenge with full details including ruleset information
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select(`
        *,
        seasons (
          id,
          name,
          start_date,
          end_date,
          is_current
        ),
        playlists (
          id,
          playlist_id,
          beatmap_id,
          beatmap_title,
          beatmap_artist,
          beatmap_version,
          beatmap_difficulty,
          beatmap_cover_url,
          beatmap_card_url,
          beatmap_list_url,
          beatmap_slimcover_url,
          scores (
            id,
            score,
            accuracy,
            max_combo,
            mods,
            mods_detailed,
            rank_position,
            submitted_at,
            users (
              id,
              osu_id,
              username,
              avatar_url,
              country
            )
          )
        )
      `)
      .eq('room_id', parseInt(roomId))
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      return res.status(500).json({ 
        error: 'Failed to fetch challenge',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Sort scores for each playlist by score descending
    if (challenge.playlists) {
      challenge.playlists = challenge.playlists.map(playlist => ({
        ...playlist,
        scores: playlist.scores 
          ? playlist.scores.sort((a, b) => b.score - a.score)
          : []
      }));
    }

    // Get ruleset winner information if challenge has ruleset
    let rulesetWinner = null;
    let rulesetInfo = null;

    if (challenge.has_ruleset) {
      // Prepare ruleset info for frontend
      rulesetInfo = {
        ruleset_name: challenge.ruleset_name,
        ruleset_description: challenge.ruleset_description,
        required_mods: challenge.required_mods || [],
        ruleset_match_type: challenge.ruleset_match_type
      };

      // Get current ruleset winner
      const { data: winnerData, error: winnerError } = await supabase
        .from('challenge_ruleset_winners')
        .select(`
          score_id,
          won_at,
          scores (
            id,
            score,
            accuracy,
            max_combo,
            mods,
            mods_detailed,
            users (
              id,
              osu_id,
              username,
              avatar_url,
              country
            )
          )
        `)
        .eq('challenge_id', challenge.id)
        .single();

      if (winnerData && !winnerError) {
        rulesetWinner = {
          score_id: winnerData.score_id,
          won_at: winnerData.won_at,
          score: winnerData.scores.score,
          accuracy: winnerData.scores.accuracy,
          max_combo: winnerData.scores.max_combo,
          mods: winnerData.scores.mods,
          mods_detailed: winnerData.scores.mods_detailed,
          username: winnerData.scores.users.username,
          avatar_url: winnerData.scores.users.avatar_url,
          country: winnerData.scores.users.country,
          user_id: winnerData.scores.users.id,
          osu_id: winnerData.scores.users.osu_id
        };
      }
    }

    console.log(`Challenge found: ${challenge.name} with ${challenge.playlists?.length || 0} playlists${challenge.has_ruleset ? ` and ruleset "${challenge.ruleset_name}"` : ''}`);

    res.status(200).json({
      success: true,
      challenge,
      ruleset_info: rulesetInfo,
      ruleset_winner: rulesetWinner
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withAPITracking(handler, { memoryMB: 256 });