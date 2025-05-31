import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    // Get challenge with all related data
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select(`
        *,
        playlists (
          *,
          scores (
            *,
            users (
              id,
              username,
              avatar_url,
              country
            )
          )
        )
      `)
      .eq('room_id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch challenge' });
    }

    // Sort scores for each playlist and limit to top 50
    if (challenge.playlists) {
      challenge.playlists = challenge.playlists.map(playlist => ({
        ...playlist,
        scores: playlist.scores
          ?.sort((a, b) => b.score - a.score)
          .slice(0, 50) || []
      }));
    }

    // Add cache headers for 1 minute
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(challenge);

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}