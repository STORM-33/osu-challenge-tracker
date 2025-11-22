import { supabaseAdmin } from '../../../lib/supabase-admin';
import { trackedOsuAPI } from '../../../lib/osu-api';
import { decryptToken, parseToken, isTokenExpired, createTokenString, encryptToken, maskToken } from '../../../lib/token-encryption';
import { handleAPIError } from '../../../lib/api-utils';

const CRON_SECRET = process.env.CRON_SECRET;
const GRACE_PERIOD_MINUTES = 100; // How late we'll still execute

if (!CRON_SECRET) {
  throw new Error('CRON_SECRET must be set in environment');
}

export default async function handler(req, res) {
  const startTime = Date.now();
  
  console.log('⏰ === SCHEDULED CHALLENGES CRON START ===');
  console.log('📅 Time:', new Date().toISOString());

  // Verify cron secret - support multiple authentication methods
  const authHeader = req.headers.authorization;
  const cronSecret = req.headers['x-cron-secret'];
  const providedSecret = authHeader?.replace('Bearer ', '');

  // Check both Bearer token and custom header
  const isAuthorized = 
    (providedSecret && providedSecret === CRON_SECRET) ||
    (cronSecret && cronSecret === CRON_SECRET);

  if (!isAuthorized) {
    console.log('❌ Unauthorized cron request', {
      hasAuth: !!authHeader,
      hasCronSecret: !!cronSecret,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    // Get all pending schedules that are due
    const now = new Date();
    const gracePeriodAgo = new Date(now.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000);

    console.log('🔍 Looking for pending schedules...');
    console.log(`   Due between: ${gracePeriodAgo.toISOString()} and ${now.toISOString()}`);

    const { data: schedules, error: fetchError } = await supabaseAdmin
      .from('scheduled_challenges')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', now.toISOString())
      .gte('scheduled_time', gracePeriodAgo.toISOString())
      .order('scheduled_time', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📊 Found ${schedules?.length || 0} pending schedules to process`);

    if (!schedules || schedules.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`✅ No schedules to process (${duration}ms)`);
      return res.status(200).json({
        success: true,
        message: 'No schedules to process',
        processed: 0,
        duration: duration
      });
    }

    // Process each schedule
    const results = [];
    
    for (const schedule of schedules) {
      const result = await processSchedule(schedule);
      results.push(result);
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const duration = Date.now() - startTime;

    console.log('📊 Processing summary:', {
      total: results.length,
      successful,
      failed,
      duration: `${duration}ms`
    });

    console.log('⏰ === SCHEDULED CHALLENGES CRON END ===\n');

    return res.status(200).json({
      success: true,
      message: `Processed ${results.length} schedules`,
      summary: {
        total: results.length,
        successful,
        failed
      },
      results,
      duration
    });

  } catch (error) {
    console.error('🚨 Cron job error:', error);
    console.log('⏰ === SCHEDULED CHALLENGES CRON END (ERROR) ===\n');
    return handleAPIError(res, error);
  }
}

/**
 * Process a single scheduled challenge
 */
async function processSchedule(schedule) {
  const scheduleId = schedule.id;
  const scheduledFor = new Date(schedule.scheduled_time);
  const delay = Date.now() - scheduledFor.getTime();
  
  console.log(`\n🎯 Processing schedule #${scheduleId}:`);
  console.log(`   Room: ${schedule.room_data?.name}`);
  console.log(`   Scheduled for: ${scheduledFor.toISOString()}`);
  console.log(`   Delay: ${Math.round(delay / 1000)}s`);

  try {
    // Check if already being processed (race condition protection)
    const { data: current } = await supabaseAdmin
      .from('scheduled_challenges')
      .select('status')
      .eq('id', scheduleId)
      .single();

    if (current?.status !== 'pending') {
      console.log(`⚠️ Schedule #${scheduleId} already processed (status: ${current?.status})`);
      return {
        success: false,
        scheduleId,
        error: 'Already processed',
        skipped: true
      };
    }

    // Step 1: Get user's token (NEW WORKFLOW vs LEGACY)
    console.log('🔐 Step 1: Retrieving user token...');
    
    let tokenString;
    let tokenSource;
    
    // Check if schedule has embedded encrypted token (legacy)
    if (schedule.encrypted_token) {
      console.log('   Using legacy embedded token');
      tokenString = decryptToken(schedule.encrypted_token);
      tokenSource = 'embedded';
    } else {
      // NEW: Fetch from user_osu_tokens table
      console.log(`   Fetching stored token for osu_id: ${schedule.osu_id}`);
      
      const { data: userToken, error: tokenError } = await supabaseAdmin
        .from('user_osu_tokens')
        .select('encrypted_token')
        .eq('osu_id', schedule.osu_id)
        .single();

      if (tokenError || !userToken) {
        console.error('❌ No stored token found for user');
        
        await supabaseAdmin
          .from('scheduled_challenges')
          .update({
            status: 'failed',
            error_message: 'No stored token found for user. User must set token via POST /api/admin/user-token',
            executed_at: new Date().toISOString()
          })
          .eq('id', scheduleId);

        return {
          success: false,
          scheduleId,
          error: 'No stored token found'
        };
      }

      tokenString = decryptToken(userToken.encrypted_token);
      tokenSource = 'stored';
      console.log('✅ Retrieved stored token');
    }

    const { accessToken: originalAccessToken, refreshToken, expiresAt } = parseToken(tokenString);
    
    console.log(`   Token source: ${tokenSource}`);
    console.log(`   Token expires: ${expiresAt.toISOString()}`);
    console.log(`   Token masked: ${maskToken(tokenString)}`);

    let accessToken = originalAccessToken;
    let newRefreshToken = refreshToken;
    let tokenRefreshed = false;

    // Step 2: Refresh token if needed
    if (isTokenExpired(tokenString, 300)) { // 5 min buffer
      console.log('🔄 Token expired or expiring soon, refreshing...');
      
      try {
        const newTokens = await trackedOsuAPI.refreshUserToken(refreshToken);
        accessToken = newTokens.access_token;
        newRefreshToken = newTokens.refresh_token;
        tokenRefreshed = true;

        // Calculate new expiry (convert seconds to timestamp)
        const newExpiresAt = Math.floor(Date.now() / 1000) + newTokens.expires_in;
        const newTokenString = createTokenString(accessToken, newExpiresAt, newRefreshToken);
        const newEncryptedToken = encryptToken(newTokenString);

        // Update token in appropriate location
        if (tokenSource === 'embedded') {
          // Legacy: update in scheduled_challenges table
          await supabaseAdmin
            .from('scheduled_challenges')
            .update({ encrypted_token: newEncryptedToken })
            .eq('id', scheduleId);
          
          console.log('✅ Token refreshed and updated in schedule (legacy)');
        } else {
          // NEW: update in user_osu_tokens table
          await supabaseAdmin
            .from('user_osu_tokens')
            .update({ 
              encrypted_token: newEncryptedToken,
              updated_at: new Date().toISOString()
            })
            .eq('osu_id', schedule.osu_id);
          
          console.log('✅ Token refreshed and updated in user token storage');
        }

      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError.message);
        
        await supabaseAdmin
          .from('scheduled_challenges')
          .update({
            status: 'failed',
            error_message: `Token refresh failed: ${refreshError.message}`,
            retry_count: schedule.retry_count + 1,
            executed_at: new Date().toISOString()
          })
          .eq('id', scheduleId);

        return {
          success: false,
          scheduleId,
          error: 'Token refresh failed',
          details: refreshError.message
        };
      }
    } else {
      console.log('✅ Token is still valid');
    }

    // Step 3: Verify user is still admin
    console.log('👤 Step 3: Verifying admin status...');
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, osu_id, username, admin')
      .eq('osu_id', schedule.osu_id)
      .single();

    if (userError || !user) {
      console.log('❌ User not found');
      
      await supabaseAdmin
        .from('scheduled_challenges')
        .update({
          status: 'failed',
          error_message: 'User not found',
          executed_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      return {
        success: false,
        scheduleId,
        error: 'User not found'
      };
    }

    if (!user.admin) {
      console.log('❌ User no longer has admin privileges');
      
      await supabaseAdmin
        .from('scheduled_challenges')
        .update({
          status: 'failed',
          error_message: 'User no longer has admin privileges',
          executed_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      return {
        success: false,
        scheduleId,
        error: 'User not admin'
      };
    }

    console.log(`✅ User ${user.username} is still an admin`);

    // Step 4: Create the room with retry logic
    console.log('🎮 Step 4: Creating multiplayer room...');
    
    let room = null;
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        room = await trackedOsuAPI.createRoomWithUserToken(
          schedule.room_data,
          accessToken
        );

        console.log(`✅ Room created successfully: ${room.id}`);
        break;

      } catch (createError) {
        lastError = createError;
        console.error(`❌ Attempt ${attempt} failed:`, createError.message);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!room) {
      console.error(`❌ Failed to create room after ${maxRetries} attempts`);
      
      await supabaseAdmin
        .from('scheduled_challenges')
        .update({
          status: 'failed',
          error_message: `Room creation failed: ${lastError?.message || 'Unknown error'}`,
          retry_count: schedule.retry_count + 1,
          executed_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      return {
        success: false,
        scheduleId,
        error: 'Room creation failed',
        details: lastError?.message,
        attempts: maxRetries
      };
    }

    // Step 5: Send chat messages (if any)
    let chatSent = true;
    if (schedule.chat_messages && schedule.chat_messages.length > 0) {
      console.log('💬 Step 5: Sending chat messages...');
      
      try {
        await trackedOsuAPI.sendChatToRoom(
          room.id,
          schedule.osu_id,
          schedule.chat_messages,
          accessToken
        );
        console.log('✅ Chat messages sent successfully');
      } catch (chatError) {
        console.error('❌ Failed to send chat messages:', chatError.message);
        chatSent = false;
        // Don't fail the whole operation - room was created successfully
      }
    } else {
      console.log('ℹ️ No chat messages to send');
    }

    // Step 6: Mark as completed
    console.log('✅ Step 6: Marking as completed...');
    
    await supabaseAdmin
      .from('scheduled_challenges')
      .update({
        status: 'completed',
        created_room_id: room.id,
        error_message: chatSent ? null : 'Chat messages failed (room created successfully)',
        executed_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    console.log(`🎉 Schedule #${scheduleId} completed successfully!`);
    console.log(`   Room ID: ${room.id}`);
    console.log(`   Room URL: https://osu.ppy.sh/multiplayer/rooms/${room.id}`);

    return {
      success: true,
      scheduleId,
      roomId: room.id,
      roomName: room.name,
      chatSent,
      tokenRefreshed,
      tokenSource,
      delaySeconds: Math.round(delay / 1000)
    };

  } catch (error) {
    console.error(`🚨 Error processing schedule #${scheduleId}:`, error);
    
    // Try to mark as failed
    try {
      await supabaseAdmin
        .from('scheduled_challenges')
        .update({
          status: 'failed',
          error_message: error.message || 'Unknown error',
          retry_count: schedule.retry_count + 1,
          executed_at: new Date().toISOString()
        })
        .eq('id', scheduleId);
    } catch (updateError) {
      console.error('Failed to update schedule status:', updateError);
    }

    return {
      success: false,
      scheduleId,
      error: error.message || 'Unknown error'
    };
  }
}