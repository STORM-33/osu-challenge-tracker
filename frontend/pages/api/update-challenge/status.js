import { supabaseAdmin } from '../../../lib/supabase-admin';
import { handleAPIError, validateRequest } from '../../../lib/api-utils';

const getUpdateTrackingKey = (roomId) => `challenge_update_${roomId}`;

async function handler(req, res) {
  try {
    validateRequest(req, {
      method: 'GET',
      query: {
        roomId: { required: true, type: 'string' }
      }
    });

    const { roomId } = req.query;
    const roomIdNum = parseInt(roomId);
    
    if (isNaN(roomIdNum) || roomIdNum <= 0) {
      throw new Error('Invalid room ID - must be a positive number');
    }

    try {
      // Check global tracking table
      const { data: trackingData, error: trackingError } = await supabaseAdmin
        .from('api_tracking_data')
        .select('value, updated_at')
        .eq('key', getUpdateTrackingKey(roomIdNum))
        .single();

      if (trackingError && trackingError.code !== 'PGRST116') {
        console.warn(`Tracking query error for room ${roomIdNum}:`, trackingError);
      }

      let lastUpdate = null;
      let source = 'none';

      if (trackingData) {
        lastUpdate = trackingData.updated_at;
        source = 'global-tracking';
      } else {
        // Fallback to challenge table
        const { data: challengeData } = await supabaseAdmin
          .from('challenges')
          .select('updated_at, is_active')
          .eq('room_id', roomIdNum)
          .single();

        if (challengeData) {
          lastUpdate = challengeData.updated_at;
          source = challengeData.is_active ? 'challenge-table' : 'inactive';
        }
      }

      res.status(200).json({
        success: true,
        roomId: roomIdNum,
        lastUpdate,
        source,
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      console.error(`Database error checking status for room ${roomIdNum}:`, dbError);
      
      // Return success with no data rather than failing
      res.status(200).json({
        success: true,
        roomId: roomIdNum,
        lastUpdate: null,
        source: 'error',
        error: 'Database unavailable',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return handleAPIError(res, error);
  }
}

export default handler;