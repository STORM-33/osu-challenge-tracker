import { withOptionalAuth } from '../../../../lib/auth-middleware';
import { challengeQueries, supabase } from '../../../../lib/supabase';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: { message: 'Method not allowed' } 
    });
  }

  const { userId, limit, tab } = req.query;

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
  
  // Determine score limit based on tab
  let scoreLimit;
  if (limit) {
    scoreLimit = parseInt(limit);
  } else {
    switch (tab) {
      case 'recent':
        scoreLimit = 5; // Only need 5 most recent
        break;
      case 'best':
        scoreLimit = null; // No limit - need all scores to find top performances
        break;
      case 'stats':
        scoreLimit = null; // No limit - need all for statistics
        break;
      default:
        scoreLimit = 5; // Default for main profile view
    }
  }

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
    const [userScores, enhancedUserStats, userStreaks] = await Promise.all([
      challengeQueries.getUserScores(targetUserId),
      getEnhancedUserStats(targetUserId),
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

    // Apply score limiting based on request
    let finalScores;
    let bestPerformances = null;
    
    if (tab === 'best') {
      // For best tab, we need ALL scores first, then filter for top 10 finishes
      // The current scoresWithCalculatedRanks might be limited, so we need to reload all scores
      console.log('🏆 Processing best tab - loading ALL user scores for filtering...');
      
      // Get ALL user scores for best tab processing
      const allUserScores = await challengeQueries.getUserScores(targetUserId);
      
      // Apply rank calculation to ALL scores
      let allScoresWithRanks = allUserScores;
      if (allUserScores && allUserScores.length > 0) {
        try {
          const allPlaylistIds = allUserScores.map(score => score.playlist_id);
          const { data: allRankData, error: allRankError } = await supabase
            .rpc('get_user_ranks_batch', {
              p_user_id: targetUserId,
              p_playlist_ids: allPlaylistIds
            });

          if (!allRankError && allRankData) {
            const rankMap = new Map();
            allRankData.forEach(rank => {
              rankMap.set(rank.playlist_id, {
                calculated_rank: rank.user_rank,
                total_players: rank.total_players
              });
            });

            allScoresWithRanks = allUserScores.map(score => {
              const rankInfo = rankMap.get(score.playlist_id);
              return {
                ...score,
                calculated_rank: rankInfo?.calculated_rank || score.rank_position,
                total_players: rankInfo?.total_players || null
              };
            });
          }
        } catch (error) {
          console.error('Error calculating ranks for all scores:', error);
        }
      }
      
      // Filter and sort by top ranks (top 10 finishes)
      bestPerformances = allScoresWithRanks
        .filter(score => {
          const rank = score.calculated_rank || score.rank_position;
          return rank && rank <= 10;
        })
        .sort((a, b) => {
          const rankA = a.calculated_rank || a.rank_position;
          const rankB = b.calculated_rank || b.rank_position;
          return rankA - rankB; // Sort by rank (1st place first)
        });
      
      console.log(`🏆 Found ${bestPerformances.length} top 10 finishes out of ${allScoresWithRanks.length} total scores`);
      finalScores = bestPerformances;
    } else {
      // For other tabs, apply limit if specified
      finalScores = scoreLimit ? scoresWithCalculatedRanks.slice(0, scoreLimit) : scoresWithCalculatedRanks;
    }

    // Return successful response with enhanced stats
    res.status(200).json({
      success: true,
      user: profileUser,
      scores: finalScores,
      totalScores: scoresWithCalculatedRanks.length,
      bestPerformances: bestPerformances, // Separate field for best performances
      stats: enhancedUserStats,
      streaks: userStreaks,
      isPublicProfile: true,
      pagination: {
        limit: scoreLimit,
        total: scoresWithCalculatedRanks.length,
        hasMore: scoreLimit ? scoresWithCalculatedRanks.length > scoreLimit : false,
        tab: tab || 'recent'
      },
      debug: {
        tab,
        requestedLimit: scoreLimit,
        finalScoresCount: finalScores?.length || 0,
        bestPerformancesCount: bestPerformances?.length || 0,
        enhancedStatsTop10: enhancedUserStats?.top10Count || 0
      }
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

// Enhanced user statistics function with all missing fields
async function getEnhancedUserStats(userId) {
  try {
    // Get basic user stats from existing function
    const basicStats = await challengeQueries.getUserStats(userId);
    
    // Get additional statistics that were missing
    const [
      firstPlaceCount,
      perfectScoreCount,
      rankDistribution,
      totalScorePoints,
      monthlyActivity,
      podiumCount,
      top10Count,
      highAccuracyCount
    ] = await Promise.all([
      getFirstPlaceCount(userId),
      getPerfectScoreCount(userId),
      getRankDistribution(userId),
      getTotalScorePoints(userId),
      getMonthlyActivity(userId),
      getPodiumFinishes(userId),
      getTop10Finishes(userId),
      getHighAccuracyCount(userId)
    ]);

    // Combine all stats
    return {
      ...basicStats,
      firstPlaceCount,
      perfectScoreCount,
      rankDistribution,
      totalScorePoints,
      monthlyActivity,
      podiumCount,
      top10Count,
      highAccuracyCount
    };

  } catch (error) {
    console.error('Error fetching enhanced user stats:', error);
    // Return basic stats with defaults for missing fields
    const basicStats = await challengeQueries.getUserStats(userId);
    return {
      ...basicStats,
      firstPlaceCount: 0,
      perfectScoreCount: 0,
      rankDistribution: { first: 0, topThree: 0, topTen: 0, other: 0 },
      totalScorePoints: 0,
      monthlyActivity: {},
      podiumCount: 0,
      top10Count: 0,
      highAccuracyCount: 0
    };
  }
}

// Get count of first place finishes
async function getFirstPlaceCount(userId) {
  try {
    const { data, error } = await supabase
      .rpc('get_user_ranks_batch', {
        p_user_id: userId,
        p_playlist_ids: await getUserPlaylistIds(userId)
      });

    if (error) throw error;

    // Count ranks that are 1
    const firstPlaces = data?.filter(rank => rank.user_rank === 1).length || 0;
    return firstPlaces;
  } catch (error) {
    console.error('Error getting first place count:', error);
    return 0;
  }
}

// Get count of perfect scores (100% accuracy)
async function getPerfectScoreCount(userId) {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('id')
      .eq('user_id', userId)
      .eq('accuracy', 100.00);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error getting perfect score count:', error);
    return 0;
  }
}

// Get rank distribution breakdown
async function getRankDistribution(userId) {
  try {
    const playlistIds = await getUserPlaylistIds(userId);
    const { data, error } = await supabase
      .rpc('get_user_ranks_batch', {
        p_user_id: userId,
        p_playlist_ids: playlistIds
      });

    if (error) throw error;

    const distribution = {
      first: 0,
      topThree: 0,
      topTen: 0,
      other: 0
    };

    data?.forEach(rank => {
      const position = rank.user_rank;
      if (position === 1) {
        distribution.first++;
      } else if (position <= 3) {
        distribution.topThree++;
      } else if (position <= 10) {
        distribution.topTen++;
      } else {
        distribution.other++;
      }
    });

    return distribution;
  } catch (error) {
    console.error('Error getting rank distribution:', error);
    return { first: 0, topThree: 0, topTen: 0, other: 0 };
  }
}

// Get total score points across all challenges
async function getTotalScorePoints(userId) {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('score')
      .eq('user_id', userId);

    if (error) throw error;
    
    const total = data?.reduce((sum, score) => sum + parseInt(score.score), 0) || 0;
    return total;
  } catch (error) {
    console.error('Error getting total score points:', error);
    return 0;
  }
}

// Get monthly activity breakdown
async function getMonthlyActivity(userId) {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('submitted_at')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const monthlyBreakdown = {};
    
    data?.forEach(score => {
      if (score.submitted_at) {
        const date = new Date(score.submitted_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyBreakdown[monthKey] = (monthlyBreakdown[monthKey] || 0) + 1;
      }
    });

    return monthlyBreakdown;
  } catch (error) {
    console.error('Error getting monthly activity:', error);
    return {};
  }
}

// Get podium finishes (top 3)
async function getPodiumFinishes(userId) {
  try {
    const playlistIds = await getUserPlaylistIds(userId);
    const { data, error } = await supabase
      .rpc('get_user_ranks_batch', {
        p_user_id: userId,
        p_playlist_ids: playlistIds
      });

    if (error) throw error;

    const podiumFinishes = data?.filter(rank => rank.user_rank <= 3).length || 0;
    return podiumFinishes;
  } catch (error) {
    console.error('Error getting podium finishes:', error);
    return 0;
  }
}

// Get top 10 finishes
async function getTop10Finishes(userId) {
  try {
    const playlistIds = await getUserPlaylistIds(userId);
    const { data, error } = await supabase
      .rpc('get_user_ranks_batch', {
        p_user_id: userId,
        p_playlist_ids: playlistIds
      });

    if (error) throw error;

    const top10Finishes = data?.filter(rank => rank.user_rank <= 10).length || 0;
    return top10Finishes;
  } catch (error) {
    console.error('Error getting top 10 finishes:', error);
    return 0;
  }
}

// Get high accuracy count (98%+)
async function getHighAccuracyCount(userId) {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('id')
      .eq('user_id', userId)
      .gte('accuracy', 98.00);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error getting high accuracy count:', error);
    return 0;
  }
}

// Helper function to get all playlist IDs for a user
async function getUserPlaylistIds(userId) {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('playlist_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map(score => score.playlist_id) || [];
  } catch (error) {
    console.error('Error getting user playlist IDs:', error);
    return [];
  }
}

export default withOptionalAuth(handler);