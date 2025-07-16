import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { validateRequest, handleAPIError, handleAPIResponse } from '../../../lib/api-utils';

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
  } else if (req.method === 'DELETE') {
    return withAdminAuth(handleDeleteChallenge)(req, res);
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
      status = '', // 'active', 'inactive', or '' for all
      season_id = '',
      hasCustomName = '', // 'true', 'false', or '' for all
      hasRuleset = '', // 'true', 'false', or '' for all
      dateFrom = '',
      dateTo = ''
    } = req.query;

    console.log('🔍 Query parameters:', {
      limit, offset, search, status, season_id, hasCustomName, hasRuleset, dateFrom, dateTo
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

    if (hasRuleset === 'true') {
      console.log('🔍 Filtering for challenges with rulesets');
      query = query.eq('has_ruleset', true);
    } else if (hasRuleset === 'false') {
      console.log('🔍 Filtering for challenges without rulesets');
      query = query.eq('has_ruleset', false);
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

    // For challenges with null end_date (active challenges), they'll be sorted last
    console.log('🔍 Sorting by end_date DESC (most recent first)');
    
    query = query
      .order('end_date', { ascending: false, nullsLast: true })
      .order('updated_at', { ascending: false }) // Secondary sort for consistency
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

    console.log('🚀 Executing main challenges query...');
    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Database error:', error);
      return handleAPIError(res, error);
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
        custom_name,
        has_ruleset
      `);

    let summary = {
      total: count || 0,
      active: 0,
      inactive: 0,
      withCustomNames: 0,
      withoutCustomNames: 0,
      withRulesets: 0,
      withoutRulesets: 0
    };

    if (!statsError && stats) {
      summary.active = stats.filter(c => c.is_active).length;
      summary.inactive = stats.filter(c => !c.is_active).length;
      summary.withCustomNames = stats.filter(c => c.custom_name !== null).length;
      summary.withoutCustomNames = stats.filter(c => c.custom_name === null).length;
      summary.withRulesets = stats.filter(c => c.has_ruleset === true).length;
      summary.withoutRulesets = stats.filter(c => c.has_ruleset === false).length;
      console.log('✅ Summary calculated:', summary);
    } else if (statsError) {
      console.error('⚠️ Stats error (non-critical):', statsError);
    }

    console.log('✅ Sending successful response');
    handleAPIResponse(res, {
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
      sorting: {
        field: 'end_date',
        order: 'desc',
        description: 'Sorted by end date (most recent first), active challenges last'
      },
      filters: {
        search,
        status,
        season_id,
        hasCustomName,
        hasRuleset,
        dateFrom,
        dateTo
      }
    }, { cache: false });

  } catch (error) {
    console.error('🚨 Unexpected error in handleGetAllChallenges:', error);
    return handleAPIError(res, error);
  }
}

// Delete challenge and all related data
async function handleDeleteChallenge(req, res) {
  try {
    // Validate request
    validateRequest(req, {
      method: 'DELETE',
      body: {
        roomId: { required: true, type: 'number' }
      }
    });

    const { roomId } = req.body;

    console.log(`🗑️ Admin ${req.user.username} attempting to delete challenge ${roomId}`);

    // First, get the challenge details for logging and verification
    const { data: challengeToDelete, error: fetchError } = await supabase
      .from('challenges')
      .select(`
        id,
        room_id,
        name,
        custom_name,
        participant_count,
        is_active,
        created_at
      `)
      .eq('room_id', roomId)
      .single();

    if (fetchError || !challengeToDelete) {
      console.log('❌ Challenge not found:', roomId);
      return res.status(404).json({ 
        success: false,
        error: 'Challenge not found' 
      });
    }

    // Get statistics about what will be deleted for logging
    const { data: playlistStats } = await supabase
      .from('playlists')
      .select('id')
      .eq('challenge_id', challengeToDelete.id);

    const playlistIds = playlistStats?.map(p => p.id) || [];
    
    let scoreCount = 0;
    let userCount = 0;
    
    if (playlistIds.length > 0) {
      // Get score count
      const { count: scores } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .in('playlist_id', playlistIds);
      
      // Get unique user count
      const { data: users } = await supabase
        .from('scores')
        .select('user_id')
        .in('playlist_id', playlistIds);
      
      scoreCount = scores || 0;
      userCount = new Set(users?.map(u => u.user_id) || []).size;
    }

    console.log(`📊 Challenge ${roomId} deletion impact:`, {
      challengeName: challengeToDelete.custom_name || challengeToDelete.name,
      playlists: playlistIds.length,
      scores: scoreCount,
      uniqueUsers: userCount,
      isActive: challengeToDelete.is_active
    });

    // Perform the deletion using a transaction-like approach
    // The CASCADE constraints should handle most of the cleanup, but we'll be explicit

    try {
      console.log('🗑️ Step 1: Deleting challenge_ruleset_winners...');
      await supabaseAdmin
        .from('challenge_ruleset_winners')
        .delete()
        .eq('challenge_id', challengeToDelete.id);

      console.log('🗑️ Step 2: Deleting scores...');
      if (playlistIds.length > 0) {
        await supabaseAdmin
          .from('scores')
          .delete()
          .in('playlist_id', playlistIds);
      }

      console.log('🗑️ Step 3: Deleting user_challenges...');
      await supabaseAdmin
        .from('user_challenges')
        .delete()
        .eq('challenge_id', challengeToDelete.id);

      console.log('🗑️ Step 4: Deleting playlists...');
      await supabaseAdmin
        .from('playlists')
        .delete()
        .eq('challenge_id', challengeToDelete.id);

      console.log('🗑️ Step 5: Deleting challenge...');
      const { error: deleteError } = await supabaseAdmin
        .from('challenges')
        .delete()
        .eq('id', challengeToDelete.id);

      if (deleteError) {
        throw deleteError;
      }

      console.log('✅ Challenge deleted successfully');

    } catch (deleteError) {
      console.error('❌ Error during deletion:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete challenge',
        details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
      });
    }

    // Log the deletion for audit purposes
    console.log(`🎯 Admin ${req.user.username} (ID: ${req.user.id}) deleted challenge:`, {
      roomId: challengeToDelete.room_id,
      challengeId: challengeToDelete.id,
      name: challengeToDelete.custom_name || challengeToDelete.name,
      wasActive: challengeToDelete.is_active,
      deletedPlaylists: playlistIds.length,
      deletedScores: scoreCount,
      affectedUsers: userCount,
      timestamp: new Date().toISOString()
    });

    handleAPIResponse(res, {
      message: `Challenge "${challengeToDelete.custom_name || challengeToDelete.name}" deleted successfully`,
      deletionStats: {
        challenge: challengeToDelete.custom_name || challengeToDelete.name,
        playlists: playlistIds.length,
        scores: scoreCount,
        affectedUsers: userCount
      }
    }, { cache: false });

  } catch (error) {
    console.error('🚨 Delete challenge error:', error);
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

    handleAPIResponse(res, {
      message: 'Challenge name updated successfully',
      challenge: updatedChallenge,
      changes: {
        field: 'custom_name',
        oldValue: existingChallenge.custom_name,
        newValue: customName.trim()
      }
    }, { cache: false });

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

    handleAPIResponse(res, {
      message: 'Challenge name reset to original',
      challenge: updatedChallenge,
      changes: {
        field: 'custom_name',
        oldValue: existingChallenge.custom_name,
        newValue: null
      }
    }, { cache: false });

  } catch (error) {
    console.error('Reset challenge name error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;