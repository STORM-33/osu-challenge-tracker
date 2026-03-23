import { supabaseAdmin } from '../../../lib/supabase-admin';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';
import { syncConfig, isStale } from '../../../lib/sync-config';
import { invalidateChallengeCache } from '../../../lib/memory-cache';
import pLimit from 'p-limit';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // 1. VERIFY CRON AUTHENTICATION
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Support multiple authentication methods for flexibility
    const authHeader = req.headers.authorization;
    const cronSecret = req.headers['x-cron-secret'];
    
    // Check both Bearer token and custom header
    const isAuthorized = 
      (authHeader && authHeader === `Bearer ${syncConfig.CRON_SECRET}`) ||
      (cronSecret && cronSecret === process.env.CRON_SECRET);

    if (!isAuthorized) {
      console.warn('🚨 Unauthorized cron request attempt', {
        hasAuth: !!authHeader,
        hasCronSecret: !!cronSecret,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('⏰ CRON: Starting automated challenge updates (5-min cycle)');

    // 2. GET ALL ACTIVE CHALLENGES
    const { data: activeChallenges, error: fetchError } = await supabaseAdmin
      .from('challenges')
      .select('id, room_id, name, updated_at, is_active')
      .eq('is_active', true)
      .order('updated_at', { ascending: true }); // Oldest first

    if (fetchError) {
      throw new Error(`Failed to fetch challenges: ${fetchError.message}`);
    }

    if (!activeChallenges || activeChallenges.length === 0) {
      console.log('📋 CRON: No active challenges found');
      return handleAPIResponse(res, {
        success: true,
        challenges_checked: 0,
        challenges_updated: 0,
        message: 'No active challenges'
      });
    }

    console.log(`📋 CRON: Found ${activeChallenges.length} active challenges`);

    // 4. FILTER STALE CHALLENGES (updated more than 5 min ago)
    const staleChallenges = activeChallenges.filter(challenge => 
      isStale(challenge.updated_at)
    );

    if (staleChallenges.length === 0) {
      console.log('✅ CRON: All challenges are up to date');
      return handleAPIResponse(res, {
        success: true,
        challenges_checked: activeChallenges.length,
        challenges_updated: 0,
        message: 'All challenges are fresh'
      });
    }

    console.log(`🔄 CRON: ${staleChallenges.length} challenges need updating`);

    // 5. UPDATE CHALLENGES IN PARALLEL (with concurrency limit)
    const limit = pLimit(syncConfig.MAX_CONCURRENT_UPDATES);
    const updateResults = [];

    const updatePromises = staleChallenges.map(challenge =>
      limit(async () => {
        try {
          console.log(`🔄 CRON: Updating challenge ${challenge.room_id}...`);
          
          // Call the update-challenge endpoint
          const updateResult = await updateChallenge(challenge.room_id);
          
          // Invalidate cache after successful update
          if (updateResult.success) {
            invalidateChallengeCache(challenge.room_id);
          }
          
          return {
            room_id: challenge.room_id,
            success: true,
            ...updateResult
          };
        } catch (error) {
          console.error(`❌ CRON: Failed to update ${challenge.room_id}:`, error.message);
          return {
            room_id: challenge.room_id,
            success: false,
            error: error.message
          };
        }
      })
    );

    const results = await Promise.allSettled(updatePromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        updateResults.push(result.value);
      } else {
        updateResults.push({
          room_id: staleChallenges[index].room_id,
          success: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    // 6. SUMMARIZE RESULTS
    const successCount = updateResults.filter(r => r.success).length;
    const failureCount = updateResults.filter(r => !r.success).length;
    const totalTime = Date.now() - startTime;

    console.log(`✅ CRON: Completed in ${totalTime}ms - ${successCount} successful, ${failureCount} failed`);

    return handleAPIResponse(res, {
      success: true,
      challenges_checked: activeChallenges.length,
      challenges_updated: staleChallenges.length,
      successful_updates: successCount,
      failed_updates: failureCount,
      execution_time_ms: totalTime,
      results: updateResults
    });

  } catch (error) {
    console.error('❌ CRON: Fatal error:', error);
    return handleAPIError(res, error);
  }
}

// Helper function to update a single challenge
async function updateChallenge(roomId) {
  // Import and call the update logic directly
  const updateChallengeModule = await import('../update-challenge');
  const updateHandler = updateChallengeModule.default;
  
  // Create mock request/response
  const mockReq = {
    method: 'POST',
    body: { roomId: parseInt(roomId) }
  };
  
  let responseData = null;
  let responseStatus = 200;
  
  const mockRes = {
    status: (code) => {
      responseStatus = code;
      return mockRes;
    },
    json: (data) => {
      responseData = data;
      return mockRes;
    },
    setHeader: () => mockRes
  };
  
  await updateHandler(mockReq, mockRes);
  
  if (responseStatus >= 400) {
    throw new Error(responseData?.error || 'Update failed');
  }
  
  return {
    success: true,
    data: responseData
  };
}