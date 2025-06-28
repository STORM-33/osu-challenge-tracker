import { withOptionalAuth } from '../../../../lib/auth-middleware';
import { challengeQueries, supabase } from '../../../../lib/supabase';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed' } 
    });
  }

  const { userId } = req.query;

  // Validate userId parameter
  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({ 
      success: false,
      error: { 
        message: 'Invalid user ID parameter',
        code: 'INVALID_USER_ID'
      } 
    });
  }

  const targetUserId = parseInt(userId);

  try {
    // Get the target user's basic info
    const { data: profileUser, error: userError } = await supabase
      .from('users')
      .select('id, osu_id, username, avatar_url, country, global_rank, country_rank, pp, created_at')
      .eq('id', targetUserId)
      .single();

    if (userError || !profileUser) {
      return res.status(404).json({ 
        success: false,
        error: { 
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        } 
      });
    }

    // Load user scores, stats, and streaks for the target user
    const [userScores, userStats, userStreaks] = await Promise.all([
      challengeQueries.getUserScores(targetUserId),
      challengeQueries.getUserStats(targetUserId),
      challengeQueries.getUserStreaks(targetUserId)
    ]);

    // Use batch function to get ranks for user scores (same as original profile logic)
    let scoresWithCalculatedRanks = userScores;
    
    if (userScores && userScores.length > 0) {
      try {
        // Extract playlist IDs for batch ranking
        const playlistIds = userScores.map(score => score.playlist_id);
        
        // Single database call to get all ranks
        const { data: rankData, error: rankError } = await supabase
          .rpc('get_user_ranks_batch', {
            p_user_id: targetUserId,
            p_playlist_ids: playlistIds
          });

        if (!rankError && rankData) {
          // Create a map for quick lookup
          const rankMap = new Map();
          rankData.forEach(rank => {
            rankMap.set(rank.playlist_id, {
              calculated_rank: rank.user_rank,
              total_players: rank.total_players
            });
          });

          // Apply ranks to scores
          scoresWithCalculatedRanks = userScores.map(score => {
            const rankInfo = rankMap.get(score.playlist_id);
            return {
              ...score,
              calculated_rank: rankInfo?.calculated_rank || score.rank_position,
              total_players: rankInfo?.total_players || null
            };
          });
        } else {
          console.warn('Batch rank calculation failed, using fallback ranks:', rankError);
          // Fallback to original ranks
          scoresWithCalculatedRanks = userScores.map(score => ({
            ...score,
            calculated_rank: score.rank_position
          }));
        }
      } catch (batchError) {
        console.error('Error in batch rank calculation:', batchError);
        // Fallback to original ranks
        scoresWithCalculatedRanks = userScores.map(score => ({
          ...score,
          calculated_rank: score.rank_position
        }));
      }
    }

    // Return successful response
    res.status(200).json({
      success: true,
      user: profileUser,
      scores: scoresWithCalculatedRanks.slice(0, 5), // Limit to 5 recent scores
      stats: userStats,
      streaks: userStreaks,
      isPublicProfile: true
    });

  } catch (error) {
    console.error('Error loading user profile:', error);
    res.status(500).json({ 
      success: false,
      error: { 
        message: 'Internal server error while loading profile',
        code: 'INTERNAL_ERROR'
      } 
    });
  }
}

export default withOptionalAuth(handler);