import { withOptionalAuth } from '../../lib/auth-middleware';
import { withAPITracking } from '../../middleware';
import { supabase } from '../../lib/supabase';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed' }
    });
  }

  try {
    // Get basic stats (visible to all users)
    const [
      { count: activeChallenges },
      { count: totalUsers },
      { count: scoresToday },
      { data: recentActivity }
    ] = await Promise.all([
      // Active challenges count
      supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      
      // Total users count
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true }),
      
      // Scores submitted today
      supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .gte('submitted_at', new Date().toISOString().split('T')[0]),
      
      // Recent activity (last 5 scores)
      supabase
        .from('scores')
        .select(`
          score,
          accuracy,
          submitted_at,
          users (username),
          playlists (
            beatmap_title,
            challenges (name, custom_name)
          )
        `)
        .order('submitted_at', { ascending: false })
        .limit(5)
    ]);

    const basicStats = {
      activeChallenges: activeChallenges || 0,
      totalUsers: totalUsers || 0,
      scoresToday: scoresToday || 0,
      recentActivity: recentActivity || [],
      lastUpdate: new Date().toISOString()
    };

    // If user is admin, add detailed stats
    if (req.user?.admin) {
      const [
        { count: totalChallenges },
        { count: totalScores },
        { count: totalPlaylists },
        { data: topUsers },
        { data: challengeStats }
      ] = await Promise.all([
        // Total challenges
        supabase
          .from('challenges')
          .select('*', { count: 'exact', head: true }),
        
        // Total scores
        supabase
          .from('scores')
          .select('*', { count: 'exact', head: true }),
        
        // Total playlists
        supabase
          .from('playlists')
          .select('*', { count: 'exact', head: true }),
        
        // Top users by score count
        supabase
          .rpc('get_user_score_counts')
          .limit(10),
        
        // Challenge participation stats
        supabase
          .from('challenges')
          .select(`
            id,
            name,
            custom_name,
            created_at,
            playlists (
              scores (count)
            )
          `)
          .eq('is_active', true)
      ]);

      basicStats.adminStats = {
        totalChallenges: totalChallenges || 0,
        totalScores: totalScores || 0,
        totalPlaylists: totalPlaylists || 0,
        topUsers: topUsers || [],
        challengeStats: challengeStats || []
      };
    }

    res.status(200).json({
      success: true,
      data: basicStats
    });

  } catch (error) {
    console.error('Stats API error:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Failed to fetch statistics',
        code: 'STATS_ERROR'
      }
    });
  }
}

export default withAPITracking(withOptionalAuth(handler), { memoryMB: 192 });