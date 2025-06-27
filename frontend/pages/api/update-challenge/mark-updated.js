import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAPITracking } from '../../../middleware';
import { handleAPIError, validateRequest } from '../../../lib/api-utils';

const getUpdateTrackingKey = (roomId) => `challenge_update_${roomId}`;

async function handler(req, res) {
  try {
    validateRequest(req, {
      method: 'POST',
      body: {
        roomId: { required: true, type: 'number' },
        timestamp: { required: false, type: 'number' },
        source: { required: false, type: 'string' }
      }
    });

    const { roomId, timestamp = Date.now(), source = 'api' } = req.body;
    
    if (isNaN(roomId) || roomId <= 0) {
      throw new Error('Invalid room ID - must be a positive number');
    }

    const trackingKey = getUpdateTrackingKey(roomId);
    const updateTime = new Date(timestamp).toISOString();

    try {
      // Update global tracking table
      const { error: upsertError } = await supabaseAdmin
        .from('api_tracking_data')
        .upsert({
          key: trackingKey,
          value: { 
            roomId, 
            lastUpdate: timestamp,
            updatedBy: source,
            source: 'mark-updated-api'
          },
          updated_at: updateTime
        });

      if (upsertError) {
        console.error(`Failed to update tracking for room ${roomId}:`, upsertError);
        throw upsertError;
      }

      console.log(`📝 Updated global tracking for room ${roomId} (source: ${source})`);

      res.status(200).json({
        success: true,
        roomId,
        timestamp,
        source,
        message: 'Global tracking updated successfully',
        updatedAt: updateTime
      });

    } catch (dbError) {
      console.error(`Database error updating tracking for room ${roomId}:`, dbError);
      
      // Still return success to prevent client errors
      res.status(200).json({
        success: false,
        roomId,
        error: 'Database unavailable',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Mark updated error:', error);
    return handleAPIError(res, error);
  }
}

export default withAPITracking(handler, { memoryMB: 128 });