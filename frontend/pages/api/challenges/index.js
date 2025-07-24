import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { withAdminAuth } from '../../../lib/auth-middleware';
import { trackedFetch } from '../../../lib/api-tracker';
import { handleAPIResponse, handleAPIError, validateRequest, getPaginationParams, paginatedResponse } from '../../../lib/api-utils';
import syncManager from '../../../lib/sync-manager';
import apiTracker from '../../../lib/api-tracker';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetChallenges(req, res);
  } else if (req.method === 'POST') {
    return withAdminAuth(handleCreateChallenge)(req, res);
  } else {
    return handleAPIError(res, new Error('Method not allowed'));
  }
}

async function handleGetChallenges(req, res) {
  try {
    validateRequest(req, {
      method: 'GET',
      query: {
        active: { type: 'string', enum: ['true', 'false'] },
        season_id: { type: 'number', min: 1 },
        search: { type: 'string', maxLength: 100 },
        sortBy: { type: 'string', enum: ['created_at', 'updated_at', 'name', 'participant_count', 'start_date'] },
        sortOrder: { type: 'string', enum: ['asc', 'desc'] },
        auto_sync: { type: 'string', enum: ['true', 'false'] } // New parameter for background sync
      }
    });

    const { 
      active,
      season_id,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      auto_sync = 'false' 
    } = req.query;

    const { limit, offset, page } = getPaginationParams(req, 100, 50);

    console.log(`📋 Fetching challenges list (active: ${active}, auto_sync: ${auto_sync})`);

    // 1. IMMEDIATELY fetch existing data from database
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
          beatmap_difficulty,
          beatmap_cover_url,
          beatmap_card_url,
          beatmap_list_url,
          beatmap_slimcover_url
        )
      `, { count: 'exact' });

    // Apply filters
    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }

    if (season_id) {
      query = query.eq('season_id', parseInt(season_id));
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,custom_name.ilike.%${search}%,host.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    const ascending = sortOrder === 'asc';
    query = query
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return paginatedResponse(res, [], count || 0, { limit, page });
    }

    // 2. Add sync metadata to each challenge
    const challengesWithSyncInfo = await Promise.all(
      data.map(async (challenge) => {
        // Get sync status for this challenge
        const syncStatus = syncManager.getSyncStatus('challenge', challenge.room_id.toString());
        const stalenessCheck = await syncManager.checkStaleness('challenge', challenge.room_id.toString());
        const canSyncResult = await syncManager.canSync('challenge', challenge.room_id.toString());

        return {
          ...challenge,
          sync_metadata: {
            last_synced: stalenessCheck.lastUpdated,
            is_stale: stalenessCheck.isStale,
            time_since_update: stalenessCheck.timeSinceUpdate,
            sync_in_progress: syncStatus.inProgress,
            can_sync: canSyncResult.canSync,
            sync_reason: canSyncResult.reason,
            next_sync_available_in: canSyncResult.nextSyncIn || syncStatus.canSyncIn || 0,
            job_id: syncStatus.jobId || null
          }
        };
      })
    );

    // 3. AUTO-TRIGGER background syncs for stale active challenges (if enabled)
    const backgroundSyncResults = [];
    if (auto_sync === 'true' && active === 'true') {
      console.log(`🔄 Auto-sync enabled, checking ${challengesWithSyncInfo.length} active challenges`);
      
      // Find challenges that need syncing (limit to avoid overwhelming)
      const staleChallenges = challengesWithSyncInfo
        .filter(c => c.is_active && c.sync_metadata.is_stale && c.sync_metadata.can_sync)
        .slice(0, 3); // Limit to 3 simultaneous background syncs

      if (staleChallenges.length > 0) {
        console.log(`🚀 Auto-triggering background sync for ${staleChallenges.length} stale challenges`);
        
        for (const challenge of staleChallenges) {
          try {
            const queueResult = await syncManager.queueSync('challenge', challenge.room_id.toString(), { 
              priority: 2 // Auto-list syncs get higher priority than auto-detail syncs
            });
            
            if (queueResult.success) {
              backgroundSyncResults.push({
                roomId: challenge.room_id,
                jobId: queueResult.jobId,
                triggered: true
              });
              
              // Update the sync metadata to reflect the new job
              const updatedChallenge = challengesWithSyncInfo.find(c => c.room_id === challenge.room_id);
              if (updatedChallenge) {
                updatedChallenge.sync_metadata.sync_in_progress = true;
                updatedChallenge.sync_metadata.job_id = queueResult.jobId;
                updatedChallenge.sync_metadata.background_sync_triggered = true;
              }
            } else {
              backgroundSyncResults.push({
                roomId: challenge.room_id,
                triggered: false,
                reason: queueResult.reason
              });
            }
          } catch (syncError) {
            console.warn(`⚠️ Failed to auto-trigger sync for challenge ${challenge.room_id}:`, syncError.message);
            backgroundSyncResults.push({
              roomId: challenge.room_id,
              triggered: false,
              error: syncError.message
            });
          }
        }
      }
    }

    // 4. Prepare response with pagination and sync info
    const responseData = {
      challenges: challengesWithSyncInfo,
      sync_summary: {
        auto_sync_enabled: auto_sync === 'true',
        background_syncs_triggered: backgroundSyncResults.filter(r => r.triggered).length,
        total_stale: challengesWithSyncInfo.filter(c => c.sync_metadata?.is_stale).length,
        total_syncing: challengesWithSyncInfo.filter(c => c.sync_metadata?.sync_in_progress).length,
        sync_results: backgroundSyncResults
      }
    };

    console.log(`📋 Challenges list loaded: ${challengesWithSyncInfo.length} challenges, ${backgroundSyncResults.filter(r => r.triggered).length} background syncs triggered`);

    return paginatedResponse(res, responseData, count || 0, { limit, page });

  } catch (error) {
    console.error('Enhanced challenges list API error:', error);
    return handleAPIError(res, error);
  }
}

async function handleCreateChallenge(req, res) {
  try {
    console.log('🎯 Create challenge request:', {
      method: req.method,
      body: req.body,
      user: req.user?.username
    });

    // Fixed validation - make name optional and custom_name optional
    validateRequest(req, {
      method: 'POST',
      body: {
        roomId: { required: true, type: 'number', min: 1 },
        name: { type: 'string', maxLength: 500 }, // Optional
        custom_name: { type: 'string', maxLength: 255 } // Optional
      }
    });

    const { roomId, name, custom_name } = req.body;

    // Validate room ID format
    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw new Error('Room ID must be a positive integer');
    }

    console.log(`🔍 Creating challenge for room ID: ${roomId}`);

    const limitStatus = apiTracker.checkLimits();
    if (limitStatus === 'critical') {
      return handleAPIError(res, new Error('API usage critical - temporarily limiting requests'));
    }

    // Check if challenge already exists
    const { data: existingChallenge, error: checkError } = await supabase
      .from('challenges')
      .select('id, room_id, name, custom_name, is_active')
      .eq('room_id', roomId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error checking existing challenge:', checkError);
      throw new Error('Database error while checking existing challenge');
    }

    if (existingChallenge) {
      console.log(`⚠️ Challenge already exists:`, existingChallenge);
      return res.status(409).json({
        success: false,
        error: 'Challenge already exists',
        existing_challenge: existingChallenge
      });
    }

    // Get current season
    let currentSeasonId = null;
    try {
      const baseUrl = req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const seasonResponse = await trackedFetch(`${baseUrl}/api/seasons/current`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, 'internal-api');

      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        if (seasonData.success && seasonData.season) {
          currentSeasonId = seasonData.season.id;
          console.log(`✅ Found current season: ${currentSeasonId}`);
        }
      }
    } catch (seasonError) {
      console.warn('⚠️ Could not fetch current season:', seasonError.message);
    }

    // Prepare challenge data
    const challengeData = {
      room_id: roomId,
      name: name || `Challenge ${roomId}`,
      custom_name: custom_name || null,
      host: 'Unknown', // Will be updated when synced
      room_type: 'playlisted',
      participant_count: 0,
      is_active: true,
      season_id: currentSeasonId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Inserting challenge data:', challengeData);

    // Create challenge in database
    const { data: challenge, error: createError } = await supabaseAdmin
      .from('challenges')
      .insert(challengeData)
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

    if (createError) {
      console.error('❌ Error creating challenge:', createError);
      throw new Error(`Failed to create challenge: ${createError.message}`);
    }

    console.log('✅ Challenge created successfully:', challenge.id);

    // Trigger initial sync in background
    let backgroundSyncTriggered = false;
    let syncJobId = null;
    
    try {
      const queueResult = await syncManager.queueSync('challenge', roomId.toString(), { 
        priority: 5, // New challenges get highest priority
        force: true // Force sync for new challenges
      });
      
      if (queueResult.success) {
        backgroundSyncTriggered = true;
        syncJobId = queueResult.jobId;
        console.log(`✅ Initial background sync queued for new challenge ${roomId} (job: ${syncJobId})`);
      } else {
        console.warn(`⚠️ Could not queue sync for new challenge ${roomId}: ${queueResult.reason}`);
      }
    } catch (syncError) {
      console.warn(`⚠️ Failed to queue initial sync for new challenge ${roomId}:`, syncError.message);
    }

    const usageStats = apiTracker.getUsageStats();

    console.log('🎉 Challenge creation completed successfully');

    return handleAPIResponse(res, {
      challenge: {
        ...challenge,
        sync_metadata: {
          background_sync_triggered: backgroundSyncTriggered,
          job_id: syncJobId,
          sync_in_progress: backgroundSyncTriggered,
          is_new_challenge: true
        }
      },
      message: backgroundSyncTriggered 
        ? 'Challenge created successfully. Data is being fetched in the background.'
        : 'Challenge created successfully. Please manually trigger sync to fetch data.',
      apiUsage: {
        percentage: usageStats.usage?.functions?.percentage || '0',
        remaining: usageStats.usage?.functions?.remaining || 100000
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Create challenge error:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        error: 'Challenge with this room ID already exists'
      });
    }
    
    if (error.message?.includes('validation')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    return handleAPIError(res, error);
  }
}

export default handler;