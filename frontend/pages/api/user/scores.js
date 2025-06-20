import { withAPITracking } from '../../../middleware';
import { supabase } from '../../../lib/supabase';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user ID from session/cookie
  // In production, implement proper session management
  const userId = req.cookies.osu_session;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { limit = 50, offset = 0 } = req.query;

    // Get user scores with challenge info
    const { data: scores, error, count } = await supabase
      .from('scores')
      .select(`
        *,
        playlists (
          *,
          challenges (
            id,
            name,
            room_id,
            host
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch scores' });
    }

    // Get user stats
    const stats = await calculateUserStats(userId);

    res.status(200).json({
      scores,
      stats,
      total: count,
      limit,
      offset
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function calculateUserStats(userId) {
  try {
    // Get all user scores for stats
    const { data: allScores } = await supabase
      .from('scores')
      .select('accuracy, rank_position')
      .eq('user_id', userId);

    // Get challenge count
    const { count: challengeCount } = await supabase
      .from('user_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!allScores || allScores.length === 0) {
      return {
        totalChallenges: 0,
        avgAccuracy: 0,
        bestRank: null,
        totalScores: 0
      };
    }

    const avgAccuracy = allScores.reduce((acc, s) => acc + s.accuracy, 0) / allScores.length;
    const bestRank = Math.min(...allScores.map(s => s.rank_position));

    return {
      totalChallenges: challengeCount || 0,
      avgAccuracy: avgAccuracy.toFixed(2),
      bestRank,
      totalScores: allScores.length
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return {
      totalChallenges: 0,
      avgAccuracy: 0,
      bestRank: null,
      totalScores: 0
    };
  }
}

export default withAPITracking(handler, { memoryMB: 192 });