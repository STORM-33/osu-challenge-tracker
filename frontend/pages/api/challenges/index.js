import { withAPITracking } from '../../../middleware';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { trackedFetch } from '../../../lib/api-tracker';
import apiTracker from '../../../lib/api-tracker';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetChallenges(req, res);
  } else if (req.method === 'POST') {
    return withAdminAuth(handleCreateChallenge)(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetChallenges(req, res) {
  try {
    const { 
      active,
      season_id,
      limit = 50, 
      offset = 0,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedOffset = parseInt(offset) || 0;

    let query = supabase
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
          beatmap_title,
          beatmap_artist,
          beatmap_version,
          beatmap_difficulty,
          beatmap_cover_url,
          beatmap_card_url,
          beatmap_list_url,
          beatmap_slimcover_url
        )
      `, { count: 'exact' });

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

    const validSortFields = ['created_at', 'updated_at', 'name', 'participant_count', 'start_date'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const ascending = sortOrder === 'asc';
    
    query = query
      .order(sortField, { ascending })
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch challenges',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({
        success: true,
        challenges: [],
        pagination: {
          total: count || 0,
          limit: parsedLimit,
          offset: parsedOffset,
          hasNext: false,
          hasPrev: false,
          totalPages: 0,
          currentPage: 1
        }
      });
    }

    res.status(200).json({
      success: true,
      challenges: data,
      pagination: {
        total: count || 0,
        limit: parsedLimit,
        offset: parsedOffset,
        hasNext: (parsedOffset + parsedLimit) < (count || 0),
        hasPrev: parsedOffset > 0,
        totalPages: Math.ceil((count || 0) / parsedLimit),
        currentPage: Math.floor(parsedOffset / parsedLimit) + 1
      }
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleCreateChallenge(req, res) {
  try {
    const { roomId, name, custom_name } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    if (!/^\d+$/.test(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID format' });
    }

    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      return res.status(429).json({ 
        error: 'API usage critical - temporarily limiting requests',
        usage: apiTracker.getUsageStats().usage
      });
    }

    const { data: existingChallenge } = await supabase
      .from('challenges')
      .select('id, room_id, name, custom_name')
      .eq('room_id', parseInt(roomId))
      .single();

    if (existingChallenge) {
      return res.status(409).json({ 
        error: 'Challenge already exists',
        challenge: existingChallenge
      });
    }

    let currentSeasonId = null;
    try {
      const seasonResponse = await trackedFetch(`${req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL}/api/seasons/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }, 'internal-api');

      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        if (seasonData.success && seasonData.season) {
          currentSeasonId = seasonData.season.id;
        }
      }
    } catch (seasonError) {
      console.warn('Could not fetch current season:', seasonError);
    }

    const { data: challenge, error: createError } = await supabaseAdmin
      .from('challenges')
      .insert({
        room_id: parseInt(roomId),
        name: name || `Challenge ${roomId}`,
        custom_name: custom_name || null,
        host: 'Unknown',
        room_type: 'playlisted',
        participant_count: 0,
        is_active: true,
        season_id: currentSeasonId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Challenge creation error:', createError);
      return res.status(500).json({ 
        error: 'Failed to create challenge',
        details: process.env.NODE_ENV === 'development' ? createError.message : undefined
      });
    }

    try {
      const updateResponse = await trackedFetch(`${req.headers.origin}/api/update-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: roomId.toString() })
      }, 'internal-api');

      if (!updateResponse.ok) {
        console.error('Failed to trigger challenge update');
      }
    } catch (updateError) {
      console.error('Error triggering challenge update:', updateError);
    }

    const usageStats = apiTracker.getUsageStats();

    res.status(201).json({
      success: true,
      challenge,
      message: 'Challenge created successfully. Data will be updated shortly.',
      apiUsage: {
        percentage: usageStats.usage.percentage,
        remaining: usageStats.usage.remaining
      }
    });

  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withAPITracking(handler, { memoryMB: 256 });