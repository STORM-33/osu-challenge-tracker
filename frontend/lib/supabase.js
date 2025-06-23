import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import admin client for server-side operations
let supabaseAdmin = null;
if (typeof window === 'undefined') {
  // Only import on server side
  try {
    const { supabaseAdmin: admin } = require('./supabase-admin');
    supabaseAdmin = admin;
  } catch (error) {
    console.warn('Could not load admin client:', error.message);
  }
  console.log('admin loaded')
}

// Helper functions for common queries
export const challengeQueries = {
  // Get all active challenges with season information
  getActiveChallenges: async () => {
    const { data, error } = await supabase
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
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get challenges by season
  getChallengesBySeason: async (seasonId) => {
    const { data, error } = await supabase
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
      `)
      .eq('season_id', seasonId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get single challenge with all details
  getChallengeDetails: async (roomId) => {
    const { data, error } = await supabase
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
          *,
          scores (
            *,
            users (
              username,
              avatar_url,
              country
            )
          )
        )
      `)
      .eq('room_id', roomId)
      .single();

    if (error) throw error;
    
    // Sort scores for each playlist
    if (data?.playlists) {
      data.playlists = data.playlists.map(playlist => ({
        ...playlist,
        scores: playlist.scores?.sort((a, b) => b.score - a.score) || []
      }));
    }
    
    return data;
  },

  getChallengeLeaderboard: async (challengeId) => {
    const { data, error } = await supabase
      .rpc('get_challenge_leaderboard', { challenge_id: challengeId });

    if (error) throw error;
    return data || [];
  },

  // Get user scores
  getUserScores: async (userId) => {
    const { data, error } = await supabase
      .from('scores')
      .select(`
        *,
        playlists (
          *,
          challenges (
            name,
            custom_name,
            room_id,
            seasons (
              name
            )
          )
        )
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get user streak data using the PostgreSQL function
getUserStreaks: async (userId) => {
  console.log('🔥 getUserStreaks called with userId:', userId);
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_streaks_final', { user_id_param: userId });

    if (error) {
      console.error('❌ Error calling get_user_streaks_final function:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('📈 No streak data returned, returning zeros');
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastParticipatedDate: null,
        totalChallengesParticipated: 0,
        totalChallengesAvailable: 0,
        missedChallenges: 0
      };
    }

    const streakData = data[0];
    console.log('📈 Streak data from PostgreSQL function:', streakData);

    return {
      currentStreak: streakData.current_streak || 0,
      longestStreak: streakData.longest_streak || 0,
      lastParticipatedDate: streakData.last_participated_date,
      totalChallengesParticipated: streakData.total_challenges_participated || 0,
      totalChallengesAvailable: streakData.total_challenges_available || 0,
      missedChallenges: streakData.missed_challenges || 0
    };

  } catch (error) {
    console.error('🚨 Error in getUserStreaks:', error);
    // Return safe defaults on error
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastParticipatedDate: null,
      totalChallengesParticipated: 0,
      totalChallengesAvailable: 0,
      missedChallenges: 0
    };
  }
},

  // Get user stats
  // Enhanced getUserStats function for lib/supabase.js
// Replace the existing getUserStats function with this improved version

getUserStats: async (userId) => {
  try {
    // Get comprehensive user statistics with a single optimized query
    const { data: userStats, error: statsError } = await supabase
      .rpc('get_user_comprehensive_stats', { user_id_param: userId });

    if (statsError) {
      console.error('Error fetching user stats:', statsError);
      throw statsError;
    }

    // Fallback to individual queries if RPC function doesn't exist yet
    if (!userStats || userStats.length === 0) {
      console.log('RPC function not available, falling back to individual queries');
      return await challengeQueries.getUserStatsLegacy(userId);
    }

    const stats = userStats[0];
    
    return {
      // Basic stats
      totalChallenges: stats.total_challenges || 0,
      totalScores: stats.total_scores || 0,
      
      // Averages
      avgAccuracy: stats.avg_accuracy ? parseFloat(stats.avg_accuracy).toFixed(2) : '0.00',
      avgScore: stats.avg_score ? Math.round(stats.avg_score) : 0,
      avgRank: stats.avg_rank ? Math.round(stats.avg_rank) : null,
      
      // Best/worst stats
      bestRank: stats.best_rank || null,
      worstRank: stats.worst_rank || null,
      bestAccuracy: stats.best_accuracy ? parseFloat(stats.best_accuracy).toFixed(2) : null,
      highestScore: stats.highest_score || null,
      
      // Additional insights
      participationRate: stats.participation_rate || 0,
      improvementTrend: stats.improvement_trend || null,
      lastSubmission: stats.last_submission || null
    };

  } catch (error) {
    console.error('Error in getUserStats:', error);
    throw error;
  }
},

// Legacy fallback function (keep existing logic as backup)
getUserStatsLegacy: async (userId) => {
  // Your existing getUserStats logic here as fallback
  const { data: allUserScores, error: userScoresError } = await supabase
    .from('scores')
    .select(`
      accuracy,
      score,
      playlist_id
    `)
    .eq('user_id', userId);

  if (userScoresError) throw userScoresError;

  const { count: challengeCount, error: countError } = await supabase
    .from('user_challenges')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) throw countError;

  if (!allUserScores || allUserScores.length === 0) {
    return {
      totalChallenges: challengeCount || 0,
      avgAccuracy: '0.00',
      bestRank: null,
      avgScore: 0,
      avgRank: null,
      totalScores: 0
    };
  }

  const avgAccuracy = allUserScores.reduce((acc, s) => acc + s.accuracy, 0) / allUserScores.length;
  const avgScore = allUserScores.reduce((acc, s) => acc + s.score, 0) / allUserScores.length;

  let bestRank = null;
  let totalRank = 0;
  let validRanks = 0;
  
  for (const userScore of allUserScores.slice(0, 10)) { // Limit to last 10 scores for performance
    const { data: playlistScores, error: playlistError } = await supabase
      .from('scores')
      .select('score, user_id')
      .eq('playlist_id', userScore.playlist_id)
      .order('score', { ascending: false });

    if (!playlistError && playlistScores) {
      const userRank = playlistScores.findIndex(s => s.user_id === userId) + 1;
      
      if (userRank > 0) {
        totalRank += userRank;
        validRanks++;
        
        if (bestRank === null || userRank < bestRank) {
          bestRank = userRank;
        }
      }
    }
  }

  return {
    totalChallenges: challengeCount || 0,
    totalScores: allUserScores.length,
    avgAccuracy: avgAccuracy.toFixed(2),
    avgScore: Math.round(avgScore),
    avgRank: validRanks > 0 ? Math.round(totalRank / validRanks) : null,
    bestRank
  };
}
};

// Season helper functions
export const seasonQueries = {
  // Get current season
  getCurrentSeason: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_current', true)
      .single();

    if (error) throw error;
    return data;
  },

  // Get all seasons
  getAllSeasons: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Create new season
  createSeason: async (seasonData) => {
    // Only admin can create seasons (this should be called server-side)
    const { data, error } = await supabase
      .from('seasons')
      .insert(seasonData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Auth helper functions
export const auth = {
  getCurrentUser: async () => {
    console.log('🔍 auth.getCurrentUser() called');
    
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        console.log('❌ Server-side environment, no user');
        return null;
      }

      // Call our auth status API (which can read HttpOnly cookies)
      console.log('📡 Calling auth status API...');
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include' // Important: include cookies in request
      });

      if (!response.ok) {
        console.error('❌ Auth status API failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('📡 Auth status response:', data);

      if (!data.authenticated || !data.user) {
        console.log('❌ User not authenticated');
        return null;
      }

      console.log('✅ User authenticated successfully:', data.user.username, 'Admin:', data.user.admin);
      return data.user;

    } catch (error) {
      console.error('🚨 Error in getCurrentUser:', error);
      return null;
    }
  },

  // Check if user is admin
  isAdmin: async () => {
    const user = await auth.getCurrentUser();
    return user?.admin || false;
  },

  // Sign out
  signOut: async () => {
    console.log('🚪 Signing out...');
    
    try {
      // Call logout API which will clear the HttpOnly cookie
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('⚠️ Logout API failed, clearing manually');
      }
      
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('🚨 Signout error:', error);
      throw error;
    }
  }
};