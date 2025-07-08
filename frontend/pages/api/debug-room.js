import { trackedOsuAPI } from '../../lib/osu-api';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId, includeScores = 'true' } = req.query;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    // Log initial usage
    trackedOsuAPI.logUsage('Before room fetch');

    const roomInfo = await trackedOsuAPI.getRoom(roomId);

    // Log usage after room fetch
    trackedOsuAPI.logUsage('After room fetch');

    let scoresInfo = null;
    
    // Fetch scores if requested and if playlists exist
    if (includeScores === 'true' && roomInfo.playlist && roomInfo.playlist.length > 0) {
      try {
        const firstPlaylist = roomInfo.playlist[0];
        console.log(`Fetching scores for playlist ${firstPlaylist.id}...`);
        
        // Get first few scores to debug the structure
        const scoresResponse = await trackedOsuAPI.getRoomScores(roomId, firstPlaylist.id, 5);
        
        trackedOsuAPI.logUsage('After scores fetch');
        
        scoresInfo = {
          playlistId: firstPlaylist.id,
          totalScores: scoresResponse.scores?.length || 0,
          hasMoreScores: !!scoresResponse.cursor_string,
          rawScoresResponse: scoresResponse,
          // Detailed analysis of first score if available
          firstScoreAnalysis: scoresResponse.scores && scoresResponse.scores.length > 0 ? {
            allKeys: Object.keys(scoresResponse.scores[0]),
            dateTimeFields: Object.keys(scoresResponse.scores[0]).filter(key => 
              key.includes('date') || key.includes('time') || key.includes('at') || key.includes('created') || key.includes('submitted')
            ),
            scoreStructure: scoresResponse.scores[0],
            // Check specific timestamp fields
            timestamps: {
              created_at: scoresResponse.scores[0].created_at,
              ended_at: scoresResponse.scores[0].ended_at,
              started_at: scoresResponse.scores[0].started_at,
              submitted_at: scoresResponse.scores[0].submitted_at,
            }
          } : null,
          // Sample of all scores with just key fields
          scoresSample: scoresResponse.scores?.slice(0, 3).map(score => ({
            id: score.id,
            user_id: score.user_id,
            username: score.user?.username,
            total_score: score.total_score,
            score: score.score,
            accuracy: score.accuracy,
            created_at: score.created_at,
            ended_at: score.ended_at,
            started_at: score.started_at,
            position: score.position,
            allDateFields: Object.keys(score).filter(key => 
              key.includes('date') || key.includes('time') || key.includes('at')
            ).reduce((obj, key) => {
              obj[key] = score[key];
              return obj;
            }, {})
          })) || []
        };
        
      } catch (scoresError) {
        console.error('Error fetching scores:', scoresError);
        scoresInfo = {
          error: 'Failed to fetch scores',
          details: scoresError.message
        };
      }
    }

    // Return comprehensive debug information
    res.status(200).json({
      success: true,
      roomId,
      // Room information
      roomInfo: {
        id: roomInfo.id,
        name: roomInfo.name,
        host: roomInfo.host?.username,
        playlistCount: roomInfo.playlist?.length || 0,
        rawResponse: roomInfo
      },
      // Playlist structure
      playlistInfo: roomInfo.playlist?.[0] ? {
        id: roomInfo.playlist[0].id,
        beatmap_id: roomInfo.playlist[0].beatmap_id,
        structure: Object.keys(roomInfo.playlist[0]),
        sample: roomInfo.playlist[0]
      } : null,
      // Scores analysis
      scoresInfo,
      // API usage tracking
      apiUsage: trackedOsuAPI.getCurrentUsage(),
      // Quick summary for easy reading
      summary: {
        roomExists: !!roomInfo.id,
        hasPlaylists: (roomInfo.playlist?.length || 0) > 0,
        scoresChecked: includeScores === 'true',
        scoresFound: scoresInfo?.totalScores || 0,
        timestampFieldsFound: scoresInfo?.firstScoreAnalysis?.dateTimeFields || []
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    
    // Log usage even on error
    trackedOsuAPI.logUsage('After error');
    
    res.status(500).json({ 
      error: 'Failed to fetch room data',
      details: error.message,
      // Include API usage stats even on error for debugging
      apiUsage: trackedOsuAPI.getCurrentUsage()
    });
  }
}

export default handler;