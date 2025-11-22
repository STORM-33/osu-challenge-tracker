import { supabaseAdmin } from '../../../lib/supabase-admin';
import { validateRequest, handleAPIError, handleAPIResponse } from '../../../lib/api-utils';

const SCHEDULER_SECRET = process.env.SCHEDULER_SHARED_SECRET;

if (!SCHEDULER_SECRET || SCHEDULER_SECRET.length < 32) {
  throw new Error('SCHEDULER_SHARED_SECRET must be set and at least 32 characters');
}

/**
 * Verify scheduler authentication
 */
function verifySchedulerAuth(req) {
  const providedSecret = req.headers['x-scheduler-secret'];
  
  if (!providedSecret) {
    throw new Error('Authentication required');
  }

  if (providedSecret !== SCHEDULER_SECRET) {
    throw new Error('Invalid authentication');
  }
}

/**
 * Main handler - routes to appropriate method
 */
export default async function handler(req, res) {
  console.log('Scheduled challenges API:', {
    method: req.method,
    timestamp: new Date().toISOString()
  });

  try {
    // Verify authentication for all requests
    verifySchedulerAuth(req);

    switch (req.method) {
      case 'POST':
        return await handleCreate(req, res);
      case 'GET':
        return await handleList(req, res);
      case 'PATCH':
        return await handleUpdate(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('🚨 Scheduled challenges error:', error);
    
    if (error.message === 'Authentication required' || error.message === 'Invalid authentication') {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
    
    return handleAPIError(res, error);
  }
}

/**
 * POST - Create a new scheduled challenge
 * NOTE: No longer requires osu_token in request body
 */
async function handleCreate(req, res) {
  console.log('Creating scheduled challenge');

  try {
    // Validate request - osu_token is now OPTIONAL for backward compatibility
    validateRequest(req, {
      method: 'POST',
      body: {
        osu_id: { required: true, type: 'number' },
        scheduled_time: { required: true, type: 'string' },
        room_data: { required: true, type: 'object' },
        // osu_token is now optional (for backward compatibility)
        osu_token: { required: false, type: 'string' },
        // Optional fields
        chat_messages: { required: false, type: 'array' },
        season_id: { required: false, type: 'number' }
      }
    });

    const {
      osu_id,
      scheduled_time,
      room_data,
      osu_token, // Optional - legacy support
      chat_messages,
      season_id
    } = req.body;

    console.log(`Schedule request from osu_id ${osu_id}:`, {
      room_name: room_data.name,
      scheduled_time,
      playlist_items: room_data.playlist.length,
      has_chat_messages: !!chat_messages?.length,
      uses_stored_token: !osu_token // New workflow if no token provided
    });

    // Verify user exists and is admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, osu_id, username, admin')
      .eq('osu_id', osu_id)
      .single();

    if (userError || !user) {
      console.log('❌ User not found:', osu_id);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.admin) {
      console.log('❌ User is not admin:', user.username);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduled_time);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled time must be in the future'
      });
    }

    // NEW: If no token provided, check if user has stored token
    if (!osu_token) {
      console.log('ℹ️ No token provided, checking for stored token...');
      
      const { data: storedToken, error: tokenError } = await supabaseAdmin
        .from('user_osu_tokens')
        .select('id')
        .eq('osu_id', osu_id)
        .single();

      if (tokenError || !storedToken) {
        console.log('❌ User has no stored token');
        return res.status(400).json({
          success: false,
          error: 'No stored token found. Please set your osu! token first using POST /api/admin/user-token',
          code: 'NO_STORED_TOKEN'
        });
      }

      console.log('✅ User has stored token, will use it at execution time');
    }

    // Legacy encryption handling (only if token provided)
    let encrypted_token = null;
    if (osu_token) {
      console.log('⚠️ Using legacy token workflow (token provided in request)');
      const { encryptToken, maskToken } = require('../../../lib/token-encryption');
      console.log('Encrypting provided token:', maskToken(osu_token));
      encrypted_token = encryptToken(osu_token);
    }

    // Insert into database
    const { data: schedule, error: insertError } = await supabaseAdmin
      .from('scheduled_challenges')
      .insert({
        osu_id,
        scheduled_time: scheduledDate.toISOString(),
        room_data,
        encrypted_token, // NULL for new workflow, encrypted for legacy
        chat_messages: chat_messages || [],
        season_id: season_id || null,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw insertError;
    }

    console.log('✅ Schedule created:', {
      id: schedule.id,
      scheduled_for: schedule.scheduled_time,
      workflow: encrypted_token ? 'legacy' : 'new'
    });

    // Return response (without encrypted token)
    const { encrypted_token: _, ...scheduleWithoutToken } = schedule;

    return handleAPIResponse(res, {
      message: 'Challenge scheduled successfully',
      schedule: scheduleWithoutToken,
      scheduled_by: {
        username: user.username,
        osu_id: user.osu_id
      }
    }, { cache: false });

  } catch (error) {
    console.error('🚨 Create schedule error:', error);
    return handleAPIError(res, error);
  }
}

/**
 * GET - List scheduled challenges (optionally filtered by osu_id)
 */
async function handleList(req, res) {
  console.log('Listing scheduled challenges');

  try {
    const { osu_id, status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('scheduled_challenges')
      .select(`
        id,
        osu_id,
        scheduled_time,
        room_data,
        chat_messages,
        status,
        created_room_id,
        error_message,
        retry_count,
        created_at,
        updated_at,
        executed_at,
        season_id
      `, { count: 'exact' });

    // Filter by osu_id if provided
    if (osu_id) {
      query = query.eq('osu_id', parseInt(osu_id));
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Order by scheduled_time (upcoming first for pending, recent first for completed)
    if (status === 'pending') {
      query = query.order('scheduled_time', { ascending: true });
    } else {
      query = query.order('scheduled_time', { ascending: false });
    }

    // Pagination
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedOffset = parseInt(offset) || 0;
    
    query = query.range(parsedOffset, parsedOffset + parsedLimit - 1);

    const { data: schedules, error, count } = await query;

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${schedules?.length || 0} schedules (total: ${count})`);

    return handleAPIResponse(res, {
      schedules: schedules || [],
      pagination: {
        total: count || 0,
        limit: parsedLimit,
        offset: parsedOffset,
        hasNext: (parsedOffset + parsedLimit) < (count || 0),
        hasPrev: parsedOffset > 0
      }
    }, { cache: false });

  } catch (error) {
    console.error('🚨 List schedules error:', error);
    return handleAPIError(res, error);
  }
}

/**
 * PATCH - Update a scheduled challenge (only if status='pending')
 */
async function handleUpdate(req, res) {
  console.log('Updating scheduled challenge');

  try {
    validateRequest(req, {
      method: 'PATCH',
      body: {
        id: { required: true, type: 'number' },
        // At least one field must be provided
        scheduled_time: { required: false, type: 'string' },
        room_data: { required: false, type: 'object' },
        chat_messages: { required: false, type: 'array' },
        season_id: { required: false, type: 'number' } // NEW: Now supported
      }
    });

    const { id, ...updates } = req.body;

    // Check if schedule exists and is pending
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('scheduled_challenges')
      .select('id, status, scheduled_time, osu_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot update schedule with status '${existing.status}'`
      });
    }

    // If updating scheduled_time, ensure it's in the future
    if (updates.scheduled_time) {
      const newScheduledDate = new Date(updates.scheduled_time);
      if (newScheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled time must be in the future'
        });
      }
      updates.scheduled_time = newScheduledDate.toISOString();
    }

    // Update
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('scheduled_challenges')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Schedule updated:', id);

    const { encrypted_token: _, ...scheduleWithoutToken } = updated;

    return handleAPIResponse(res, {
      message: 'Schedule updated successfully',
      schedule: scheduleWithoutToken
    }, { cache: false });

  } catch (error) {
    console.error('🚨 Update schedule error:', error);
    return handleAPIError(res, error);
  }
}

/**
 * DELETE - Cancel a scheduled challenge (only if status='pending')
 */
async function handleDelete(req, res) {
  console.log('Deleting scheduled challenge');

  try {
    validateRequest(req, {
      method: 'DELETE',
      body: {
        id: { required: true, type: 'number' }
      }
    });

    const { id } = req.body;

    // Check if schedule exists and is pending
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('scheduled_challenges')
      .select('id, status, room_data')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot delete schedule with status '${existing.status}'`
      });
    }

    // Mark as cancelled instead of deleting
    const { error: updateError } = await supabaseAdmin
      .from('scheduled_challenges')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Schedule cancelled:', {
      id,
      room_name: existing.room_data?.name
    });

    return handleAPIResponse(res, {
      message: 'Schedule cancelled successfully',
      id
    }, { cache: false });

  } catch (error) {
    console.error('🚨 Delete schedule error:', error);
    return handleAPIError(res, error);
  }
}