import { supabaseAdmin } from '../../../lib/supabase-admin';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';
import apiTracker from '../../../lib/api-tracker';
import { syncConfig, isStale } from '../../../lib/sync-config';
import { invalidateChallengeCache } from '../../../lib/memory-cache';
import pLimit from 'p-limit';

export default async function handler(req, res) {
  const startTime = Date.now();
  const cronRunTime = new Date().toISOString();
  
  try {
    // 1. VERIFY CRON AUTHENTICATION
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${syncConfig.CRON_SECRET}`) {
      console.warn('🚨 Unauthorized cron request attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`⏰ CRON: Starting at ${cronRunTime} (Threshold: ${syncConfig.STALENESS_THRESHOLD_MS}ms)`);

    // 2. CHECK API LIMITS
    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      console.warn('🚨 CRON: API limits critical, skipping update cycle');
      return res.status(429).json({
        success: false,
        reason: 'api_limits_critical',
        message: 'API usage too high, skipping this cycle'
      });
    }

    // 3. GET ALL ACTIVE CHALLENGES - WITH CACHE BUSTING
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

    // 4. DEBUG: Log each challenge's staleness check
    const debugInfo = activeChallenges.map(challenge => {
      const updatedAt = challenge.updated_at;
      const updatedAtDate = new Date(updatedAt);
      const now = Date.now();
      const ageMs = now - updatedAtDate.getTime();
      const ageMinutes = Math.floor(ageMs / 60000);
      const isStaleResult = isStale(updatedAt);
      
      console.log(`🔍 CRON: Challenge ${challenge.room_id}:`);
      console.log(`   - updated_at (raw): ${updatedAt}`);
      console.log(`   - updated_at (parsed): ${updatedAtDate.toISOString()}`);
      console.log(`   - cron run time: ${cronRunTime}`);
      console.log(`   - age: ${ageMs}ms (${ageMinutes} minutes)`);
      console.log(`   - threshold: ${syncConfig.STALENESS_THRESHOLD_MS}ms`);
      console.log(`   - isStale(): ${isStaleResult}`);
      console.log(`   - should update: ${ageMs > syncConfig.STALENESS_THRESHOLD_MS}`);
      
      return {
        room_id: challenge.room_id,
        updated_at_raw: updatedAt,
        updated_at_parsed: updatedAtDate.toISOString(),
        age_ms: ageMs,
        age_minutes: ageMinutes,
        threshold_ms: syncConfig.STALENESS_THRESHOLD_MS,
        is_stale: isStaleResult,
        should_update: ageMs > syncConfig.STALENESS_THRESHOLD_MS
      };
    });

    // 5. FILTER STALE CHALLENGES
    const staleChallenges = activeChallenges.filter(challenge => 
      isStale(challenge.updated_at)
    );

    if (staleChallenges.length === 0) {
      console.log('✅ CRON: All challenges are up to date (but check debug info above!)');
      return handleAPIResponse(res, {
        success: true,
        challenges_checked: activeChallenges.length,
        challenges_updated: 0,
        message: 'All challenges are fresh',
        debug: debugInfo,
        cron_run_time: cronRunTime
      });
    }

    console.log(`🔄 CRON: ${staleChallenges.length} challenges need updating`);

    // 6. UPDATE CHALLENGES IN PARALLEL (with concurrency limit)
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

    // 7. SUMMARIZE RESULTS
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
      api_usage: apiTracker.getUsageStats(),
      results: updateResults,
      debug: debugInfo,
      cron_run_time: cronRunTime
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