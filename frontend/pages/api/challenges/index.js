import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get query parameters
    const { active = 'true', limit = 50, offset = 0 } = req.query;

    // Build query
    let query = supabase
      .from('challenges')
      .select(`
        *,
        playlists (
          id,
          playlist_id,
          beatmap_title,
          beatmap_artist,
          beatmap_version
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by active status
    if (active === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch challenges' });
    }

    // Calculate participant counts for each challenge
    const challengesWithStats = await Promise.all(
      data.map(async (challenge) => {
        // Get unique participant count
        const { count: participantCount } = await supabase
          .from('scores')
          .select('user_id', { count: 'exact', head: true })
          .in('playlist_id', challenge.playlists.map(p => p.id));

        return {
          ...challenge,
          participant_count: participantCount || 0
        };
      })
    );

    res.status(200).json({
      challenges: challengesWithStats,
      total: count,
      limit,
      offset
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}