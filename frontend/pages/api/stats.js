import { supabase } from '../../lib/supabase';
import { withOptionalAuth } from '../../lib/auth-middleware';
import { handleAPIResponse, handleAPIError } from '../../lib/api-utils';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../lib/memory-cache';
import { generateETag, checkETag } from '../../lib/api-utils';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed' }
    });
  }

  try {
    const isAdmin = req.user?.admin || false;
    const cacheKey = createCacheKey('stats', isAdmin ? 'admin' : 'public');

    // TRY MEMORY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log('📊 Serving stats from memory cache');
      const etag = generateETag(cached);
      if (checkETag(req, etag)) {
        return res.status(304).end();
      }
      
      return handleAPIResponse(res, cached, { 
        cache: true, 
        cacheTime: 300,
        enableETag: true 
      });
    }

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
      .not('submitted_at', 'is', null)
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
    if (isAdmin) {
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

    // Cache for 5 minutes
    memoryCache.set(cacheKey, basicStats, CACHE_DURATIONS.STATS);

    return handleAPIResponse(res, basicStats, { 
      cache: true, 
      cacheTime: 300,
      enableETag: true 
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

export default withOptionalAuth(handler);