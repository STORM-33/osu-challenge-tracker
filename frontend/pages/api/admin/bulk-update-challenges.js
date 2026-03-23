import { supabaseAdmin } from '../../../lib/supabase-admin';
import { osuAPI } from '../../../lib/osu-api';
import { validateRequest, handleAPIError, handleAPIResponse } from '../../../lib/api-utils';
import { withAdminAuth } from '../../../lib/auth-middleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dryRun = false, limit = null } = req.body;

  try {
    // Get all challenges from database
    let query = supabaseAdmin
      .from('challenges')
      .select('id, room_id, name, is_active')
      .order('created_at', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }

    const { data: challenges, error: challengesError } = await query;

    if (challengesError) {
      return res.status(500).json({ error: 'Failed to fetch challenges', details: challengesError });
    }

    if (!challenges || challenges.length === 0) {
      return res.status(200).json({ message: 'No challenges found to update' });
    }

    console.log(`Found ${challenges.length} challenges to ${dryRun ? 'analyze' : 'update'}`);

    const results = [];
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalApiCalls = 0;

    for (const [index, challenge] of challenges.entries()) {
      console.log(`\n=== Processing ${index + 1}/${challenges.length}: ${challenge.name} (Room ${challenge.room_id}) ===`);
      
      try {
        if (dryRun) {
          // Just check if the room exists and count scores
          const roomData = await osuAPI.getRoom(challenge.room_id);
          totalApiCalls += 1;
          
          let estimatedScores = 0;
          if (roomData?.playlist) {
            for (const playlist of roomData.playlist) {
              // Just get first page to estimate total
              const scoresResponse = await osuAPI.getRoomScores(challenge.room_id, playlist.id, 1);
              estimatedScores += scoresResponse.total || 0;
              totalApiCalls += 1;
            }
          }
          
          results.push({
            challengeId: challenge.id,
            roomId: challenge.room_id,
            name: challenge.name,
            status: 'analyzed',
            playlistCount: roomData?.playlist?.length || 0,
            estimatedScores: estimatedScores
          });
          
        } else {
          // Actually update the challenge
          const updateResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/update-challenge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomId: challenge.room_id })
          });

          if (updateResponse.ok) {
            const updateData = await updateResponse.json();
            totalUpdated++;
            totalApiCalls += updateData.apiUsage?.estimatedExternalCalls || 0;
            
            results.push({
              challengeId: challenge.id,
              roomId: challenge.room_id,
              name: challenge.name,
              status: 'updated',
              apiUsage: updateData.apiUsage
            });
            
            console.log(`✅ Successfully updated challenge ${challenge.room_id}`);
          } else {
            totalFailed++;
            const errorData = await updateResponse.json();
            
            results.push({
              challengeId: challenge.id,
              roomId: challenge.room_id,
              name: challenge.name,
              status: 'failed',
              error: errorData.error
            });
            
            console.error(`❌ Failed to update challenge ${challenge.room_id}:`, errorData.error);
          }
        }

        // Small delay between requests to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        totalFailed++;
        results.push({
          challengeId: challenge.id,
          roomId: challenge.room_id,
          name: challenge.name,
          status: 'error',
          error: error.message
        });
        
        console.error(`❌ Error processing challenge ${challenge.room_id}:`, error.message);
      }
    }

    return handleAPIResponse(res, {
      summary: {
        totalChallenges: challenges.length,
        totalUpdated,
        totalFailed,
        totalApiCalls,
        dryRun
      },
      results
    }, { cache: false });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withAdminAuth(handler);