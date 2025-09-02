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

    console.log(`Fetching weighted season leaderboard: seasonId=${seasonId}, userId=${userId}, limit=${limit}, offset=${offset}, withUserContext=${withUserContext}`);

    // CREATE CACHE KEY
    const cacheKey = createCacheKey('leaderboard_weighted', seasonId || 'current', {
      userId: withUserContext === 'true' ? userId : null,
      limit,
      offset,
      withUserContext,
      contextRange
    });

    // TRY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log(`🏆 Serving weighted leaderboard from memory cache: ${cacheKey}`);
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
      console.log(`Getting weighted leaderboard with user context for user ${userId}`);
      
      // Get leaderboard with user context using new weighted function
      const { data: leaderboardData, error: leaderboardError } = await supabaseAdmin
        .rpc('get_season_leaderboard_weighted_with_user', {
          user_id_param: parseInt(userId),
          season_id_param: seasonId ? parseInt(seasonId) : null,
          context_range: parseInt(contextRange)
        });

      data = leaderboardData;
      error = leaderboardError;
    } else {
      console.log(`Getting standard weighted season leaderboard with offset ${offset}`);
      
      // Get standard weighted leaderboard with offset support
      const { data: leaderboardData, error: leaderboardError } = await supabaseAdmin
        .rpc('get_season_leaderboard_weighted', {
          season_id_param: seasonId ? parseInt(seasonId) : null,
          limit_count: parseInt(limit),
          offset_count: parseInt(offset)
        });

      data = leaderboardData;
      error = leaderboardError;
    }

    if (error) {
      console.error('Database error fetching weighted season leaderboard:', error);
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

    // Get user's position if userId is provided (using new weighted function)
    let userPosition = null;
    if (userId) {
      console.log(`Getting weighted position for user ${userId}`);
      
      // Use the weighted leaderboard to find user's position
      const { data: positionData, error: positionError } = await supabaseAdmin
        .rpc('get_season_leaderboard_weighted', {
          season_id_param: seasonId ? parseInt(seasonId) : null,
          limit_count: 10000, // Get enough to find the user
          offset_count: 0
        });

      if (positionError) {
        console.error('Error fetching user weighted position:', positionError);
        // Don't fail the whole request, just log the error
      } else if (positionData) {
        // Find the user in the results
        const userEntry = positionData.find(entry => entry.out_user_id === parseInt(userId));
        if (userEntry) {
          userPosition = {
            user_position: userEntry.user_rank,  // ← Changed from userEntry.out_rank_position
            total_score: userEntry.out_total_score,
            average_accuracy: userEntry.out_average_accuracy,
            challenges_participated: userEntry.out_challenges_participated,
            final_weighted_score: userEntry.out_final_weighted_score,
            max_streak: userEntry.out_max_streak,
            score_percentile: userEntry.out_score_percentile,
            accuracy_percentile: userEntry.out_accuracy_percentile,
            streak_percentile: userEntry.out_streak_percentile,
            total_participants: userEntry.out_total_participants,
            percentile: ((userEntry.out_total_participants - userEntry.user_rank + 1) / userEntry.out_total_participants) * 100  // ← Changed here too
          };
        }
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

    // Transform data to match frontend expectations
    const transformedData = data ? data.map(entry => ({
      user_id: entry.out_user_id,
      username: entry.out_username,
      avatar_url: entry.out_avatar_url,
      country: entry.out_country,
      total_score: entry.out_total_score,
      average_accuracy: entry.out_average_accuracy,
      max_streak: entry.out_max_streak,
      challenges_participated: entry.out_challenges_participated,
      final_weighted_score: entry.out_final_weighted_score,
      score_percentile: entry.out_score_percentile,
      accuracy_percentile: entry.out_accuracy_percentile,
      streak_percentile: entry.out_streak_percentile,
      user_position: entry.user_rank,  
      rank_position: entry.user_rank,  
      position: entry.user_rank,       
      total_participants: entry.out_total_participants,
      is_target_user: entry.out_is_target_user,
      percentile: entry.out_total_participants > 0 ? 
        ((entry.out_total_participants - entry.user_rank + 1) / entry.out_total_participants) * 100 : 0  
    })) : [];

    console.log(`Weighted season leaderboard fetched: ${transformedData?.length || 0} entries, user position: ${userPosition ? 'found' : 'none'}`);

    // Determine if there are more records available
    const hasMore = transformedData && transformedData.length === parseInt(limit);

    // PREPARE RESPONSE DATA
    const responseData = {
      leaderboard: transformedData || [],
      userPosition,
      currentSeason,
      hasMore,
      meta: {
        seasonId: seasonId || currentSeason?.id,
        limit: parseInt(limit),
        offset: parseInt(offset),
        returned: transformedData?.length || 0,
        withUserContext: withUserContext === 'true',
        weighted: true // Flag to indicate this is weighted data
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
    console.error('Weighted season leaderboard API error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;