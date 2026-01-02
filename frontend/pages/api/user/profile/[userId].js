import { withOptionalAuth } from '../../../../lib/auth-middleware';
import { challengeQueries, supabase } from '../../../../lib/supabase';
import { handleAPIResponse, handleAPIError } from '../../../../lib/api-utils';
import { memoryCache, createCacheKey, CACHE_DURATIONS } from '../../../../lib/memory-cache';
import { generateETag, checkETag } from '../../../../lib/api-utils';

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
        scoreLimit = 5;
        break;
      case 'best':
        scoreLimit = null;
        break;
      case 'stats':
        scoreLimit = null;
        break;
      default:
        scoreLimit = 5;
    }
  }

  try {
    // CREATE CACHE KEY - Different cache for different tabs and limits
    const cacheKey = createCacheKey('user_profile', targetUserId, {
      tab: tab || 'recent',
      limit: scoreLimit || 'all'
    });

    // TRY MEMORY CACHE FIRST
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      const etag = generateETag(cached);
      if (checkETag(req, etag)) {
        return res.status(304).end();
      }
      
      return handleAPIResponse(res, cached, { 
        cache: true, 
        cacheTime: 600,
        enableETag: true,
        req 
      });
    }

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

    // Use batch function to get ranks for user scores
    let scoresWithCalculatedRanks = userScores;
    
    if (userScores && userScores.length > 0) {
      try {
        const playlistIds = userScores.map(score => score.playlist_id);
        
        const { data: rankData, error: rankError } = await supabase
          .rpc('get_user_ranks_batch', {
            p_user_id: targetUserId,
            p_playlist_ids: playlistIds
          });

        if (!rankError && rankData) {
          const rankMap = new Map();
          rankData.forEach(rank => {
            rankMap.set(rank.playlist_id, {
              calculated_rank: rank.user_rank,
              total_players: rank.total_players
            });
          });

          scoresWithCalculatedRanks = userScores.map(score => {
            const rankInfo = rankMap.get(score.playlist_id);
            return {
              ...score,
              calculated_rank: rankInfo?.calculated_rank || score.rank_position,
              total_players: rankInfo?.total_players || null
            };
          });
        } else {
          scoresWithCalculatedRanks = userScores.map(score => ({
            ...score,
            calculated_rank: score.rank_position
          }));
        }
      } catch (batchError) {
        console.error('Error in batch rank calculation:', batchError);
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
      // For best tab, filter for top 10 finishes
      const allUserScores = await challengeQueries.getUserScores(targetUserId);
      
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
          console.error('Error calculating ranks for best tab:', error);
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
          return rankA - rankB;
        });

      finalScores = bestPerformances;
    } else {
      // For other tabs, apply limit if specified
      finalScores = scoreLimit ? scoresWithCalculatedRanks.slice(0, scoreLimit) : scoresWithCalculatedRanks;
    }

    // PREPARE RESPONSE DATA
    const responseData = {
      user: profileUser,
      scores: finalScores,
      totalScores: scoresWithCalculatedRanks.length,
      bestPerformances: bestPerformances,
      stats: enhancedUserStats,
      streaks: userStreaks,
      isPublicProfile: true,
      pagination: {
        limit: scoreLimit,
        total: scoresWithCalculatedRanks.length,
        hasMore: scoreLimit ? scoresWithCalculatedRanks.length > scoreLimit : false,
        tab: tab || 'recent'
      }
    };

    // CACHE THE RESULT
    memoryCache.set(cacheKey, responseData, CACHE_DURATIONS.USER_PROFILE);

    // Return successful response
    return handleAPIResponse(res, responseData, { 
      cache: true, 
      cacheTime: 600,
      enableETag: true,
      req 
    });

  } catch (error) {
    console.error('Error loading user profile:', error);
    return handleAPIError(res, error);
  }
}

async function getEnhancedUserStats(userId) {
  try {
    const allUserScores = await challengeQueries.getUserScores(userId);
    
    if (!allUserScores || allUserScores.length === 0) {
      return getDefaultStats();
    }

    const playlistIds = allUserScores.map(score => score.playlist_id);
    const { data: rankData, error: rankError } = await supabase
      .rpc('get_user_ranks_batch', {
        p_user_id: userId,
        p_playlist_ids: playlistIds
      });

    let scoresWithRanks = allUserScores;
    let ranksArray = [];

    if (!rankError && rankData) {
      const rankMap = new Map();
      rankData.forEach(rank => {
        rankMap.set(rank.playlist_id, {
          calculated_rank: rank.user_rank,
          total_players: rank.total_players
        });
      });

      scoresWithRanks = allUserScores.map(score => {
        const rankInfo = rankMap.get(score.playlist_id);
        return {
          ...score,
          calculated_rank: rankInfo?.calculated_rank || score.rank_position,
          total_players: rankInfo?.total_players || null
        };
      });

      ranksArray = rankData;
    }

    const stats = calculateStatsFromSameData(scoresWithRanks, ranksArray);
    
    return stats;

  } catch (error) {
    console.error('Error fetching enhanced user stats:', error);
    return getDefaultStats();
  }
}

function calculateStatsFromSameData(scoresWithRanks, ranksArray) {
  const totalScores = scoresWithRanks.length;
  
  if (totalScores === 0) {
    return getDefaultStats();
  }

  // For medal/achievement calculations, only count ENDED challenges
  const now = new Date();
  const completedPlaylistIds = new Set(
    scoresWithRanks
      .filter(score => {
        const endDate = score.playlists?.challenges?.end_date;
        // Only include if challenge has an end_date and it's in the past
        return endDate && new Date(endDate) < now;
      })
      .map(s => s.playlist_id)
  );

  // Filter ranks to only completed challenges (for medal/achievement stats)
  const completedRanks = ranksArray.filter(rank => completedPlaylistIds.has(rank.playlist_id));
  const validCompletedRanks = completedRanks.filter(rank => rank.user_rank > 0);

  // All ranks (for general display stats like avgRank)
  const validRanks = ranksArray.filter(rank => rank.user_rank > 0);

  // Medal-triggering stats: use COMPLETED challenges only
  const firstPlaceCount = validCompletedRanks.filter(rank => rank.user_rank === 1).length;
  const podiumCount = validCompletedRanks.filter(rank => rank.user_rank <= 3).length;
  const top10Count = validCompletedRanks.filter(rank => rank.user_rank <= 10).length;

  // Rank distribution (completed challenges only)
  const rankDistribution = {
    first: firstPlaceCount,
    topThree: validCompletedRanks.filter(rank => rank.user_rank >= 2 && rank.user_rank <= 3).length,
    topTen: validCompletedRanks.filter(rank => rank.user_rank >= 4 && rank.user_rank <= 10).length,
    other: validCompletedRanks.filter(rank => rank.user_rank > 10).length
  };

  // =================================================================
  // General stats: can use all data (including active challenges)
  // =================================================================
  
  // Basic aggregations
  const totalScorePoints = scoresWithRanks.reduce((sum, score) => sum + parseInt(score.score || 0), 0);
  const avgScore = Math.round(totalScorePoints / totalScores);
  const avgAccuracy = (scoresWithRanks.reduce((sum, score) => sum + (score.accuracy || 0), 0) / totalScores).toFixed(2);
  
  // Rank-based stats (all challenges for general display)
  const avgRank = validRanks.length > 0 ? Math.round(validRanks.reduce((sum, rank) => sum + rank.user_rank, 0) / validRanks.length) : null;

  // Score-based stats
  const perfectScoreCount = scoresWithRanks.filter(score => score.accuracy === 100.0).length;
  const highAccuracyCount = scoresWithRanks.filter(score => score.accuracy >= 98.0).length;
  
  // Monthly activity
  const monthlyActivity = {};
  scoresWithRanks.forEach(score => {
    if (score.submitted_at) {
      const date = new Date(score.submitted_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyActivity[monthKey] = (monthlyActivity[monthKey] || 0) + 1;
    }
  });

  // Best/worst values (all challenges)
  const bestRank = validRanks.length > 0 ? Math.min(...validRanks.map(r => r.user_rank)) : null;
  const worstRank = validRanks.length > 0 ? Math.max(...validRanks.map(r => r.user_rank)) : null;
  const bestAccuracy = Math.max(...scoresWithRanks.map(s => s.accuracy || 0)).toFixed(2);
  const highestScore = Math.max(...scoresWithRanks.map(s => s.score || 0));
  
  const lastSubmission = scoresWithRanks
    .filter(s => s.submitted_at)
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0]?.submitted_at || null;

  return {
    totalChallenges: 0,
    totalScores,
    avgAccuracy,
    avgScore,
    avgRank,
    bestRank,
    worstRank,
    bestAccuracy,
    highestScore,
    participationRate: 0,
    improvementTrend: 'stable',
    lastSubmission,
    firstPlaceCount,
    perfectScoreCount,
    rankDistribution,
    totalScorePoints,
    monthlyActivity,
    podiumCount,
    top10Count,
    highAccuracyCount
  };
}

function getDefaultStats() {
  return {
    totalChallenges: 0,
    totalScores: 0,
    avgAccuracy: "0.00",
    avgScore: 0,
    avgRank: null,
    bestRank: null,
    worstRank: null,
    bestAccuracy: null,
    highestScore: null,
    participationRate: 0,
    improvementTrend: 'stable',
    lastSubmission: null,
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

export default withOptionalAuth(handler);