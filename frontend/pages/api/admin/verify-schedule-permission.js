import { supabaseAdmin } from '../../../lib/supabase-admin';
import { validateRequest, handleAPIError, handleAPIResponse } from '../../../lib/api-utils';

const SCHEDULER_SECRET = process.env.SCHEDULER_SHARED_SECRET;

if (!SCHEDULER_SECRET || SCHEDULER_SECRET.length < 32) {
  throw new Error('SCHEDULER_SHARED_SECRET must be set and at least 32 characters');
}

export default async function handler(req, res) {
  console.log('Schedule permission check:', {
    method: req.method,
    hasSecret: !!req.headers['x-scheduler-secret'],
    timestamp: new Date().toISOString()
  });

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Verify shared secret
    const providedSecret = req.headers['x-scheduler-secret'];
    
    if (!providedSecret) {
      console.log('❌ No scheduler secret provided');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_SECRET'
      });
    }

    if (providedSecret !== SCHEDULER_SECRET) {
      console.log('❌ Invalid scheduler secret');
      return res.status(403).json({
        success: false,
        error: 'Invalid authentication',
        code: 'INVALID_SECRET'
      });
    }

    // Validate request body
    validateRequest(req, {
      method: 'POST',
      body: {
        osu_id: { required: true, type: 'number' }
      }
    });

    const { osu_id } = req.body;

    console.log(`Checking admin status for osu_id: ${osu_id}`);

    // Check if user exists and is admin
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, osu_id, username, admin')
      .eq('osu_id', osu_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        console.log(`❌ User not found: ${osu_id}`);
        return handleAPIResponse(res, {
          allowed: false,
          reason: 'User not found in Challengers database',
          osu_id
        });
      }
      
      throw error;
    }

    const isAdmin = user.admin === true;

    console.log(`${isAdmin ? '✅' : '❌'} Admin check for ${user.username}: ${isAdmin}`);

    return handleAPIResponse(res, {
      allowed: isAdmin,
      reason: isAdmin 
        ? 'User is a Challengers admin' 
        : 'User is not a Challengers admin',
      user: {
        id: user.id,
        osu_id: user.osu_id,
        username: user.username,
        admin: user.admin
      }
    });

  } catch (error) {
    console.error('🚨 Permission verification error:', error);
    return handleAPIError(res, error);
  }
}