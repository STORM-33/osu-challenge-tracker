import { withAPITracking } from '../../../middleware';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { validateRequest, handleAPIError } from '../../../lib/api-utils';

async function handler(req, res) {
  console.log('🔍 Admin challenges API called:', {
    method: req.method,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  if (req.method === 'GET') {
    return withAdminAuth(handleGetAllChallenges)(req, res);
  } else if (req.method === 'PUT') {
    return withAdminAuth(handleUpdateChallengeName)(req, res);
  } else if (req.method === 'POST' && req.body.action === 'reset_name') {
    return withAdminAuth(handleResetChallengeName)(req, res);
  } else {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
}

// Get all challenges for admin name management
async function handleGetAllChallenges(req, res) {
  console.log('📊 Getting all challenges for admin:', {
    user: req.user?.username || 'unknown',
    filters: req.query
  });

  try {
    const { 
      limit = 50, 
      offset = 0,
      search = '',
      sortBy = 'updated_at',
      sortOrder = 'desc',
      status = '', // 'active', 'inactive', or '' for all
      season_id = '',
      hasCustomName = '', // 'true', 'false', or '' for all
      dateFrom = '',
      dateTo = ''
    } = req.query;

    console.log('🔍 Query parameters:', {
      limit, offset, search, sortBy, sortOrder, status, season_id, hasCustomName, dateFrom, dateTo
    });

    // Validation
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedOffset = parseInt(offset) || 0;

    console.log('✅ Building Supabase query...');

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
        )
      `, { count: 'exact' });

    // Apply filters
    if (status === 'active') {
      console.log('🔍 Filtering for active challenges');
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      console.log('🔍 Filtering for inactive challenges');
      query = query.eq('is_active', false);
    }

    if (season_id) {
      console.log('🔍 Filtering by season:', season_id);
      query = query.eq('season_id', parseInt(season_id));
    }

    if (hasCustomName === 'true') {
      console.log('🔍 Filtering for challenges with custom names');
      query = query.not('custom_name', 'is', null);
    } else if (hasCustomName === 'false') {
      console.log('🔍 Filtering for challenges without custom names');
      query = query.is('custom_name', null);
    }

    if (search) {
      console.log('🔍 Applying search filter:', search);
      // Search in room_id, name, custom_name, and host
      query = query.or(`
        room_id.eq.${parseInt(search) || 0},
        name.ilike.%${search}%,
        custom_name.ilike.%${search}%,
        host.ilike.%${search}%
      `);
    }

    // Date filtering
    if (dateFrom) {
      console.log('🔍 Filtering from date:', dateFrom);
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      console.log('🔍 Filtering to date:', dateTo);
      query = query.lte('created_at', dateTo);
    }

    // Sorting
    const validSortFields = [
      'created_at', 'updated_at', 'name', 'custom_name', 
      'participant_count', 'start_date', 'room_id', 'host'
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'updated_at';
    const ascending = sortOrder === 'asc';
    
    console.log('🔍 Sorting by:', sortField, ascending ? 'ASC' : 'DESC');
    
    query = query
      .order(sortField, { ascending })
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

    console.log('🚀 Executing main challenges query...');
    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch challenges',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    console.log('✅ Challenges fetched:', {
      count: data?.length || 0,
      total: count || 0
    });

    // Get summary statistics
    console.log('📊 Fetching summary statistics...');
    const { data: stats, error: statsError } = await supabase
      .from('challenges')
      .select(`
        id,
        is_active,
        custom_name
      `);

    let summary = {
      total: count || 0,
      active: 0,
      inactive: 0,
      withCustomNames: 0,
      withoutCustomNames: 0
    };

    if (!statsError && stats) {
      summary.active = stats.filter(c => c.is_active).length;
      summary.inactive = stats.filter(c => !c.is_active).length;
      summary.withCustomNames = stats.filter(c => c.custom_name !== null).length;
      summary.withoutCustomNames = stats.filter(c => c.custom_name === null).length;
      console.log('✅ Summary calculated:', summary);
    } else if (statsError) {
      console.error('⚠️ Stats error (non-critical):', statsError);
    }

    console.log('✅ Sending successful response');
    res.status(200).json({
      success: true,
      challenges: data || [],
      pagination: {
        total: count || 0,
        limit: parsedLimit,
        offset: parsedOffset,
        hasNext: (parsedOffset + parsedLimit) < (count || 0),
        hasPrev: parsedOffset > 0,
        totalPages: Math.ceil((count || 0) / parsedLimit),
        currentPage: Math.floor(parsedOffset / parsedLimit) + 1
      },
      summary,
      filters: {
        search,
        status,
        season_id,
        hasCustomName,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('🚨 Unexpected error in handleGetAllChallenges:', error);
    return handleAPIError(res, error);
  }
}

// Update challenge name
async function handleUpdateChallengeName(req, res) {
  try {
    // Validate request
    validateRequest(req, {
      method: 'PUT',
      body: {
        roomId: { required: true, type: 'number' },
        customName: { required: true, type: 'string', minLength: 1, maxLength: 500 }
      }
    });

    const { roomId, customName } = req.body;

    // Check if challenge exists
    const { data: existingChallenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, room_id, name, custom_name')
      .eq('room_id', roomId)
      .single();

    if (fetchError || !existingChallenge) {
      return res.status(404).json({ 
        success: false,
        error: 'Challenge not found' 
      });
    }

    // Update the challenge
    const { data: updatedChallenge, error: updateError } = await supabaseAdmin
      .from('challenges')
      .update({
        custom_name: customName.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('room_id', roomId)
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

    if (updateError) {
      console.error('Challenge update error:', updateError);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update challenge name',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      });
    }

    // Log the change for audit purposes
    console.log(`🎯 Admin ${req.user.username} (ID: ${req.user.id}) updated challenge ${roomId} name:`, {
      oldName: existingChallenge.name,
      oldCustomName: existingChallenge.custom_name,
      newCustomName: customName.trim(),
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Challenge name updated successfully',
      challenge: updatedChallenge,
      changes: {
        field: 'custom_name',
        oldValue: existingChallenge.custom_name,
        newValue: customName.trim()
      }
    });

  } catch (error) {
    console.error('Update challenge name error:', error);
    return handleAPIError(res, error);
  }
}

// Reset challenge name to original
async function handleResetChallengeName(req, res) {
  try {
    // Validate request
    validateRequest(req, {
      method: 'POST',
      body: {
        roomId: { required: true, type: 'number' },
        action: { required: true }
      }
    });

    const { roomId } = req.body;

    // Check if challenge exists
    const { data: existingChallenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, room_id, name, custom_name')
      .eq('room_id', roomId)
      .single();

    if (fetchError || !existingChallenge) {
      return res.status(404).json({ 
        success: false,
        error: 'Challenge not found' 
      });
    }

    if (!existingChallenge.custom_name) {
      return res.status(400).json({ 
        success: false,
        error: 'Challenge already uses original name' 
      });
    }

    // Reset to original name (set custom_name to null)
    const { data: updatedChallenge, error: updateError } = await supabaseAdmin
      .from('challenges')
      .update({
        custom_name: null,
        updated_at: new Date().toISOString()
      })
      .eq('room_id', roomId)
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

    if (updateError) {
      console.error('Challenge reset error:', updateError);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to reset challenge name',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      });
    }

    // Log the reset for audit purposes
    console.log(`🔄 Admin ${req.user.username} (ID: ${req.user.id}) reset challenge ${roomId} name:`, {
      originalName: existingChallenge.name,
      removedCustomName: existingChallenge.custom_name,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Challenge name reset to original',
      challenge: updatedChallenge,
      changes: {
        field: 'custom_name',
        oldValue: existingChallenge.custom_name,
        newValue: null
      }
    });

  } catch (error) {
    console.error('Reset challenge name error:', error);
    return handleAPIError(res, error);
  }
}

export default withAPITracking(handler, { memoryMB: 256 });