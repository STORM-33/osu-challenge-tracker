import { supabaseAdmin } from '../../../lib/supabase-admin';
import { trackedOsuAPI } from '../../../lib/osu-api';
import globalUpdateTracker from '../../../lib/global-update-tracker';
import apiTracker from '../../../lib/api-tracker';
import syncManager from '../../../lib/sync-manager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId, testType = 'full' } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: 'roomId is required' });
  }

  const diagnostics = {
    roomId,
    testType,
    timestamp: new Date().toISOString(),
    results: {},
    recommendations: []
  };

  try {
    console.log(`🔍 Starting performance diagnostics for room ${roomId}`);

    // TEST 1: Global Update Tracker Performance
    console.log('Testing global update tracker...');
    const globalUpdateStart = performance.now();
    
    try {
      const needsUpdateResult = globalUpdateTracker.needsUpdate({
        room_id: roomId,
        is_active: true,
        updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 mins ago
      });
      
      const globalUpdateTime = performance.now() - globalUpdateStart;
      diagnostics.results.globalUpdateTracker = {
        timeMs: Math.round(globalUpdateTime),
        needsUpdate: needsUpdateResult,
        status: globalUpdateTime > 100 ? 'SLOW' : globalUpdateTime > 50 ? 'MODERATE' : 'FAST'
      };
      
      if (globalUpdateTime > 100) {
        diagnostics.recommendations.push('Global update tracker is slow - consider caching optimization');
      }
    } catch (error) {
      diagnostics.results.globalUpdateTracker = { error: error.message };
    }

    // TEST 2: Database Performance
    console.log('Testing database performance...');
    const dbTests = {};
    
    // Simple query test
    const simpleQueryStart = performance.now();
    try {
      await supabaseAdmin.from('challenges').select('id, room_id, updated_at').eq('room_id', roomId).single();
      dbTests.simpleQuery = Math.round(performance.now() - simpleQueryStart);
    } catch (error) {
      dbTests.simpleQuery = { error: error.message };
    }

    // Complex query test (what happens during sync)
    const complexQueryStart = performance.now();
    try {
      await supabaseAdmin
        .from('challenges')
        .select(`
          *,
          playlists (
            id,
            playlist_id,
            beatmap_title,
            scores (
              id,
              score,
              user_id,
              mods_detailed
            )
          )
        `)
        .eq('room_id', roomId)
        .single();
      dbTests.complexQuery = Math.round(performance.now() - complexQueryStart);
    } catch (error) {
      dbTests.complexQuery = { error: error.message };
    }

    // Lock operations test
    const lockTestStart = performance.now();
    try {
      const testRequestId = 'diagnostic_' + Date.now();
      const { data: lockData, error: lockError } = await supabaseAdmin
        .from('api_locks')
        .insert({
          lock_id: `test_lock_${roomId}_${testRequestId}`,
          request_id: testRequestId,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60000).toISOString(),
          resource_type: 'challenge_update',
          resource_id: roomId.toString()
        })
        .select()
        .single();
      
      if (!lockError) {
        // Clean up test lock
        await supabaseAdmin
          .from('api_locks')
          .delete()
          .eq('lock_id', `test_lock_${roomId}_${testRequestId}`);
      }
      
      dbTests.lockOperations = Math.round(performance.now() - lockTestStart);
    } catch (error) {
      dbTests.lockOperations = { error: error.message };
    }

    diagnostics.results.database = dbTests;

    if (dbTests.simpleQuery > 100) {
      diagnostics.recommendations.push('Simple database queries are slow - check database connection/indexing');
    }
    if (dbTests.complexQuery > 1000) {
      diagnostics.recommendations.push('Complex queries are very slow - consider query optimization or database indexing');
    }
    if (dbTests.lockOperations > 200) {
      diagnostics.recommendations.push('Lock operations are slow - distributed locking may be a bottleneck');
    }

    // TEST 3: API Tracker Performance
    console.log('Testing API tracker performance...');
    const apiTrackerStart = performance.now();
    try {
      const limitStatus = apiTracker.checkLimits();
      const usageStats = apiTracker.getUsageStats();
      const apiTrackerTime = performance.now() - apiTrackerStart;
      
      diagnostics.results.apiTracker = {
        timeMs: Math.round(apiTrackerTime),
        limitStatus,
        currentUsage: usageStats.usage?.functions?.percentage || '0',
        status: apiTrackerTime > 200 ? 'SLOW' : apiTrackerTime > 100 ? 'MODERATE' : 'FAST'
      };
      
      if (apiTrackerTime > 200) {
        diagnostics.recommendations.push('API tracker is slow - memory management may be causing delays');
      }
    } catch (error) {
      diagnostics.results.apiTracker = { error: error.message };
    }

    // TEST 4: Sync Manager Performance
    console.log('Testing sync manager performance...');
    const syncManagerStart = performance.now();
    try {
      const canSyncResult = await syncManager.canSync('challenge', roomId.toString());
      const syncStatus = syncManager.getSyncStatus('challenge', roomId.toString());
      const stalenessCheck = await syncManager.checkStaleness('challenge', roomId.toString());
      const syncManagerTime = performance.now() - syncManagerStart;
      
      diagnostics.results.syncManager = {
        timeMs: Math.round(syncManagerTime),
        canSync: canSyncResult.canSync,
        reason: canSyncResult.reason,
        isStale: stalenessCheck.isStale,
        inProgress: syncStatus.inProgress,
        status: syncManagerTime > 300 ? 'SLOW' : syncManagerTime > 150 ? 'MODERATE' : 'FAST'
      };
      
      if (syncManagerTime > 300) {
        diagnostics.recommendations.push('Sync manager checks are slow - multiple database queries may be the cause');
      }
    } catch (error) {
      diagnostics.results.syncManager = { error: error.message };
    }

    // TEST 5: OSU API Performance (if full test)
    if (testType === 'full') {
      console.log('Testing OSU API performance...');
      const osuAPIStart = performance.now();
      try {
        const roomData = await trackedOsuAPI.getRoom(roomId);
        const osuAPITime = performance.now() - osuAPIStart;
        
        const playlistCount = roomData.playlist?.length || 0;
        const estimatedScoresCalls = playlistCount; // One call per playlist for scores
        
        diagnostics.results.osuAPI = {
          timeMs: Math.round(osuAPITime),
          playlistCount,
          estimatedScoresCalls,
          estimatedTotalAPITime: Math.round(osuAPITime * (1 + estimatedScoresCalls)),
          status: osuAPITime > 2000 ? 'SLOW' : osuAPITime > 1000 ? 'MODERATE' : 'FAST'
        };
        
        if (osuAPITime > 2000) {
          diagnostics.recommendations.push('OSU API is responding slowly - this may be external network/API issue');
        }
        if (estimatedScoresCalls > 10) {
          diagnostics.recommendations.push(`Challenge has ${estimatedScoresCalls} playlists - consider parallel API calls optimization`);
        }
      } catch (error) {
        diagnostics.results.osuAPI = { error: error.message };
      }
    }

    // TEST 6: Database Transaction Test (simulate atomic update)
    if (testType === 'full') {
      console.log('Testing database transaction performance...');
      const transactionStart = performance.now();
      try {
        // Simulate the atomic update with smaller test data
        const testChallengeData = {
          room_id: 999999, // Test room ID
          name: 'Diagnostic Test Challenge',
          host: 'test-host',
          room_type: 'playlists',
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
          participant_count: 1,
          is_active: false,
          background_image_url: null,
          updated_at: new Date().toISOString()
        };

        const testPlaylistsData = [{
          playlist_id: 999999,
          beatmap_id: 123456,
          beatmap_title: 'Test Beatmap',
          beatmap_artist: 'Test Artist',
          beatmap_version: 'Test Version',
          beatmap_difficulty: 5.0,
          beatmap_cover_url: null,
          beatmap_card_url: null,
          beatmap_list_url: null,
          beatmap_slimcover_url: null
        }];

        const testScoresData = [{
          playlist_id: 999999,
          user_osu_id: 123456,
          score: 1000000,
          accuracy: 95.5,
          max_combo: 500,
          mods: 'HD,DT',
          mods_detailed: [{ acronym: 'HD', settings: {} }, { acronym: 'DT', settings: {} }],
          rank_position: 1,
          submitted_at: new Date().toISOString()
        }];

        const testUsersData = [{
          osu_id: 123456,
          username: 'test-user',
          avatar_url: null,
          country: 'US',
          updated_at: new Date().toISOString()
        }];

        // Use a transaction to test without actually committing
        const { error: transactionError } = await supabaseAdmin.rpc(
          'update_challenge_atomic_with_mods',
          {
            challenge_data: testChallengeData,
            playlists_data: testPlaylistsData,
            scores_data: testScoresData,
            participation_data: testUsersData
          }
        );

        // Clean up test data
        await supabaseAdmin.from('challenges').delete().eq('room_id', 999999);
        await supabaseAdmin.from('users').delete().eq('osu_id', 123456);

        const transactionTime = performance.now() - transactionStart;
        
        diagnostics.results.databaseTransaction = {
          timeMs: Math.round(transactionTime),
          success: !transactionError,
          error: transactionError?.message,
          status: transactionTime > 5000 ? 'SLOW' : transactionTime > 2000 ? 'MODERATE' : 'FAST'
        };
        
        if (transactionTime > 5000) {
          diagnostics.recommendations.push('Database atomic transactions are slow - consider optimizing JSONB operations or database performance');
        }
      } catch (error) {
        diagnostics.results.databaseTransaction = { error: error.message };
      }
    }

    // Calculate total estimated sync time
    const estimatedSyncTime = 
      (diagnostics.results.globalUpdateTracker?.timeMs || 0) +
      (diagnostics.results.syncManager?.timeMs || 0) +
      (diagnostics.results.database?.lockOperations || 0) +
      (diagnostics.results.osuAPI?.estimatedTotalAPITime || 0) +
      (diagnostics.results.databaseTransaction?.timeMs || 0);

    diagnostics.estimatedTotalSyncTime = Math.round(estimatedSyncTime);

    // Overall assessment
    if (estimatedSyncTime > 30000) {
      diagnostics.overallStatus = 'CRITICAL';
      diagnostics.recommendations.unshift('Sync time is critically slow (>30s) - immediate optimization needed');
    } else if (estimatedSyncTime > 15000) {
      diagnostics.overallStatus = 'SLOW';
      diagnostics.recommendations.unshift('Sync time is slow (>15s) - optimization recommended');
    } else if (estimatedSyncTime > 8000) {
      diagnostics.overallStatus = 'MODERATE';
    } else {
      diagnostics.overallStatus = 'GOOD';
    }

    // Top bottleneck identification
    const bottlenecks = [
      { component: 'OSU API', time: diagnostics.results.osuAPI?.estimatedTotalAPITime || 0 },
      { component: 'Database Transaction', time: diagnostics.results.databaseTransaction?.timeMs || 0 },
      { component: 'Sync Manager', time: diagnostics.results.syncManager?.timeMs || 0 },
      { component: 'API Tracker', time: diagnostics.results.apiTracker?.timeMs || 0 },
      { component: 'Global Update Tracker', time: diagnostics.results.globalUpdateTracker?.timeMs || 0 },
      { component: 'Database Queries', time: diagnostics.results.database?.complexQuery || 0 }
    ].sort((a, b) => b.time - a.time);

    diagnostics.topBottlenecks = bottlenecks.filter(b => b.time > 100).slice(0, 3);

    console.log(`🔍 Diagnostics complete for room ${roomId}`);
    console.log(`📊 Estimated total sync time: ${diagnostics.estimatedTotalSyncTime}ms`);
    console.log(`⚠️ Top bottlenecks:`, diagnostics.topBottlenecks);

    res.status(200).json({
      success: true,
      diagnostics
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      diagnostics
    });
  }
}