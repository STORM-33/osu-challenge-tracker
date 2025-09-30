import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { trackedFetch } from '../../../lib/api-tracker';
import { handleAPIResponse, handleAPIError, validateRequest, getPaginationParams, paginatedResponse } from '../../../lib/api-utils';
import apiTracker from '../../../lib/api-tracker';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../../lib/memory-cache';
import { generateETag, checkETag } from '../../../lib/api-utils';
import { isStale } from '../../../lib/sync-config';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetChallenges(req, res);
  } else if (req.method === 'POST') {
    return withAdminAuth(handleCreateChallenge)(req, res);
  } else {
    return handleAPIError(res, new Error('Method not allowed'));
  }
}

async function handleGetChallenges(req, res) {
  try {
    validateRequest(req, {
      method: 'GET',
      query: {
        active: { type: 'string', enum: ['true', 'false'] },
        season_id: { type: 'number', min: 1 },
        search: { type: 'string', maxLength: 100 },
        sortBy: { type: 'string', enum: ['created_at', 'updated_at', 'name', 'participant_count', 'start_date'] },
        sortOrder: { type: 'string', enum: ['asc', 'desc'] }
      }
    });

    const { 
      active,
      season_id,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const { limit, offset, page } = getPaginationParams(req, 100, 50);

    // CREATE CACHE KEY
    const cacheKey = createCacheKey('challenges_list', 'all', {
      active, season_id, search, sortBy, sortOrder, page, limit
    });

    // TRY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      console.log(`📋 Serving challenges from cache: ${cacheKey}`);
      const etag = generateETag(cached);
      if (checkETag(req, etag)) {
        return res.status(304).end();
      }
      return paginatedResponse(res, cached.data, cached.pagination.total, { 
        limit, page 
      });
    }

    console.log(`📋 Fetching challenges from database`);

    // FETCH FROM DATABASE
    let query = supabase
      .from('challenges')
      .select(`
        *,
        seasons (id, name, start_date, end_date, is_current),
        playlists (
          id, playlist_id, beatmap_title, beatmap_artist,
          beatmap_version, beatmap_difficulty, beatmap_cover_url,
          beatmap_card_url, beatmap_list_url, beatmap_slimcover_url
        )
      `, { count: 'exact' });

    // Apply filters
    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }

    if (season_id) {
      query = query.eq('season_id', parseInt(season_id));
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,custom_name.ilike.%${search}%,host.ilike.%${search}%`);
    }

    const ascending = sortOrder === 'asc';
    query = query
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // CALCULATE FRESHNESS FOR EACH CHALLENGE
    const challengesWithFreshness = data.map(challenge => ({
      ...challenge,
      data_age_minutes: challenge.updated_at 
        ? Math.floor((Date.now() - new Date(challenge.updated_at).getTime()) / 60000)
        : null,
      is_fresh: !isStale(challenge.updated_at)
    }));

    const responseData = {
      challenges: challengesWithFreshness,
      summary: {
        total: count || 0,
        fresh: challengesWithFreshness.filter(c => c.is_fresh).length,
        stale: challengesWithFreshness.filter(c => !c.is_fresh).length
      }
    };

    // CACHE THE RESULT
    const cacheData = {
      data: responseData,
      pagination: { total: count || 0, page, limit }
    };
    
    memoryCache.set(cacheKey, cacheData, CACHE_DURATIONS.CHALLENGES_LIST);

    console.log(`📋 Loaded ${data.length} challenges (${responseData.summary.fresh} fresh, ${responseData.summary.stale} stale)`);

    return paginatedResponse(res, responseData, count || 0, { limit, page });

  } catch (error) {
    console.error('Challenges list API error:', error);
    return handleAPIError(res, error);
  }
}

async function handleCreateChallenge(req, res) {
  try {
    console.log('🎯 Create challenge request:', {
      method: req.method,
      body: req.body,
      user: req.user?.username
    });

    validateRequest(req, {
      method: 'POST',
      body: {
        roomId: { required: true, type: 'number', min: 1 },
        name: { type: 'string', maxLength: 500 },
        custom_name: { type: 'string', maxLength: 255 }
      }
    });

    const { roomId, name, custom_name } = req.body;

    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw new Error('Room ID must be a positive integer');
    }

    console.log(`🔍 Creating challenge for room ID: ${roomId}`);

    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      return handleAPIError(res, new Error('API usage critical - temporarily limiting requests'));
    }

    // Check if challenge already exists
    const { data: existingChallenge, error: checkError } = await supabase
      .from('challenges')
      .select('id, room_id, name, custom_name, is_active')
      .eq('room_id', roomId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing challenge:', checkError);
      throw new Error('Database error while checking existing challenge');
    }

    if (existingChallenge) {
      console.log(`⚠️ Challenge already exists:`, existingChallenge);
      return res.status(409).json({
        success: false,
        error: 'Challenge already exists',
        existing_challenge: existingChallenge
      });
    }

    // Get current season
    let currentSeasonId = null;
    try {
      const baseUrl = req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const seasonResponse = await trackedFetch(`${baseUrl}/api/seasons/current`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, 'internal-api');

      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        if (seasonData.success && seasonData.data?.season) {
          currentSeasonId = seasonData.data.season.id;
          console.log(`✅ Found current season: ${currentSeasonId}`);
        }
      }
    } catch (seasonError) {
      console.warn('⚠️ Could not fetch current season:', seasonError.message);
    }

    // Prepare challenge data
    const challengeData = {
      room_id: roomId,
      name: name || `Challenge ${roomId}`,
      custom_name: custom_name || null,
      host: 'Unknown', // Will be updated by cron
      room_type: 'playlisted',
      participant_count: 0,
      is_active: true,
      season_id: currentSeasonId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Inserting challenge data:', challengeData);

    // Create challenge in database
    const { data: challenge, error: createError } = await supabaseAdmin
      .from('challenges')
      .insert(challengeData)
      .select(`
        *,
        seasons (
          id,
          name,
          start_date,
          end_date,
          is_current
        )
      `)
      .single();

    if (createError) {
      console.error('❌ Error creating challenge:', createError);
      throw new Error(`Failed to create challenge: ${createError.message}`);
    }

    console.log('✅ Challenge created successfully:', challenge.id);

    const usageStats = apiTracker.getUsageStats();

    console.log('🎉 Challenge creation completed successfully');

    return handleAPIResponse(res, {
      challenge: {
        ...challenge,
        data_info: {
          message: 'Challenge created. Data will be fetched automatically within 5 minutes.',
          next_cron_update: 'Within 5 minutes'
        }
      },
      message: 'Challenge created successfully. Cron job will fetch data within 5 minutes.',
      apiUsage: {
        percentage: usageStats.usage?.functions?.percentage || '0',
        remaining: usageStats.usage?.functions?.remaining || 100000
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Create challenge error:', error);
    
    if (error.message?.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        error: 'Challenge with this room ID already exists'
      });
    }
    
    if (error.message?.includes('validation')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    return handleAPIError(res, error);
  }
}

export default handler;