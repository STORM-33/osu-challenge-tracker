import { supabaseAdmin } from '../../../lib/supabase-admin';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../../lib/memory-cache';
import { generateETag, checkETag } from '../../../lib/api-utils';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      seasonId, 
      userId, 
      limit = 50, 
      offset = 0,
      withUserContext = false,
      contextRange = 5 
    } = req.query;

    console.log(`Fetching season leaderboard: seasonId=${seasonId}, userId=${userId}, limit=${limit}, offset=${offset}, withUserContext=${withUserContext}`);

    // CREATE CACHE KEY
    const cacheKey = createCacheKey('leaderboard', seasonId || 'current', {
      userId: withUserContext === 'true' ? userId : null,
      limit,
      offset,
      withUserContext,
      contextRange
    });

    // TRY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log(`🏆 Serving leaderboard from memory cache: ${cacheKey}`);
      const etag = generateETag(cached);
      if (checkETag(req, etag)) {
        return res.status(304).end();
      }
      return handleAPIResponse(res, cached, { 
        cache: true, 
        cacheTime: 600,
        enableETag: true,
        req // Pass req for ETag handling
      });
    }

    let data, error;

    if (withUserContext === 'true' && userId) {
      console.log(`Getting leaderboard with user context for user ${userId}`);
      
      // Get leaderboard with user context (offset not applicable here)
      const { data: leaderboardData, error: leaderboardError } = await supabaseAdmin
        .rpc('get_season_leaderboard_with_user', {
          user_id_param: parseInt(userId),
          season_id_param: seasonId ? parseInt(seasonId) : null,
          context_range: parseInt(contextRange)
        });

      data = leaderboardData;
      error = leaderboardError;
    } else {
      console.log(`Getting standard season leaderboard with offset ${offset}`);
      
      // Get standard leaderboard with offset support
      const { data: leaderboardData, error: leaderboardError } = await supabaseAdmin
        .rpc('get_season_leaderboard', {
          season_id_param: seasonId ? parseInt(seasonId) : null,
          limit_count: parseInt(limit),
          offset_count: parseInt(offset)
        });

      data = leaderboardData;
      error = leaderboardError;
    }

    if (error) {
      console.error('Database error fetching season leaderboard:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch season leaderboard',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : undefined
      });
    }

    // Get user's position if userId is provided
    let userPosition = null;
    if (userId) {
      console.log(`Getting position for user ${userId}`);
      
      const { data: positionData, error: positionError } = await supabaseAdmin
        .rpc('get_user_season_position', {
          user_id_param: parseInt(userId),
          season_id_param: seasonId ? parseInt(seasonId) : null
        });

      if (positionError) {
        console.error('Error fetching user position:', positionError);
        // Don't fail the whole request, just log the error
      } else if (positionData?.[0]) {
        userPosition = positionData[0];
      }
    }

    // Get current season info
    const { data: seasonData, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('is_current', true)
      .single();

    if (seasonError && seasonError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching season info:', seasonError);
    }

    const currentSeason = seasonError ? null : seasonData;

    console.log(`Season leaderboard fetched: ${data?.length || 0} entries, user position: ${userPosition ? 'found' : 'none'}`);

    // Determine if there are more records available
    const hasMore = data && data.length === parseInt(limit);

    // PREPARE RESPONSE DATA
    const responseData = {
      leaderboard: data || [],
      userPosition,
      currentSeason,
      hasMore,
      meta: {
        seasonId: seasonId || currentSeason?.id,
        limit: parseInt(limit),
        offset: parseInt(offset),
        returned: data?.length || 0,
        withUserContext: withUserContext === 'true'
      }
    };

    // Cache for 10 minutes
    memoryCache.set(cacheKey, responseData, CACHE_DURATIONS.LEADERBOARD);

    return handleAPIResponse(res, responseData, { 
      cache: true, 
      cacheTime: 600,
      enableETag: true,
      req // Pass req for ETag handling
    });

  } catch (error) {
    console.error('Season leaderboard API error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;