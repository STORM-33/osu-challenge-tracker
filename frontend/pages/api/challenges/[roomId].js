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

    // Get challenge with full details including difficulty
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

    console.log(`Challenge found: ${challenge.name} with ${challenge.playlists?.length || 0} playlists`);

    res.status(200).json({
      success: true,
      challenge
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