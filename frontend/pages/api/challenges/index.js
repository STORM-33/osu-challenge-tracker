import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
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
    // Get query parameters
    const { 
      active,
      season_id,
      limit = 50, 
      offset = 0,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    console.log('=== API DEBUG ===');
    console.log('Query parameters:', { active, season_id, limit, offset, search, sortBy, sortOrder });

    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedOffset = parseInt(offset) || 0;

    // Build query with season information
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
          beatmap_cover_url
        )
      `, { count: 'exact' });

    // Filter by active status
    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }

    // Filter by season
    if (season_id) {
      query = query.eq('season_id', parseInt(season_id));
    }

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,custom_name.ilike.%${search}%,host.ilike.%${search}%`);
    }

    // Sorting
    const validSortFields = ['created_at', 'updated_at', 'name', 'participant_count', 'start_date'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const ascending = sortOrder === 'asc';
    
    query = query
      .order(sortField, { ascending })
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

    console.log('About to execute filtered query...');
    const { data, error, count } = await query;

    console.log('Filtered query result:', { 
      dataLength: data?.length || 0, 
      count, 
      error: error?.message 
    });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch challenges',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!data || data.length === 0) {
      console.log('No data found, returning empty result');
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

    console.log('Returning challenges:', data);
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

    // Validate roomId format
    if (!/^\d+$/.test(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID format' });
    }

    // Check if challenge already exists
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

    // Get current season for new challenges
    let currentSeasonId = null;
    try {
      const seasonResponse = await fetch(`${req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL}/api/seasons/current`);
      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        if (seasonData.success && seasonData.season) {
          currentSeasonId = seasonData.season.id;
        }
      }
    } catch (seasonError) {
      console.warn('Could not fetch current season:', seasonError);
    }

    // Create challenge - removed is_featured field
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

    // Trigger update to fetch data from osu! API
    try {
      const updateResponse = await fetch(`${req.headers.origin}/api/update-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: roomId.toString() })
      });

      if (!updateResponse.ok) {
        console.error('Failed to trigger challenge update');
      }
    } catch (updateError) {
      console.error('Error triggering challenge update:', updateError);
    }

    res.status(201).json({
      success: true,
      challenge,
      message: 'Challenge created successfully. Data will be updated shortly.'
    });

  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}