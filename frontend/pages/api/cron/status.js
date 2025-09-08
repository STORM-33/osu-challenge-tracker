import { supabase } from '../../../lib/supabase';
import { handleAPIResponse, handleAPIError } from '../../../lib/api-utils';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get recent cron job executions from logs or create a simple status check
    const { data: recentChallenges, error } = await supabase
      .from('challenges')
      .select('room_id, updated_at, is_active')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const now = Date.now();
    const staleThreshold = 20 * 60 * 1000; // 20 minutes
    
    const challengeStatus = recentChallenges.map(challenge => {
      const lastUpdate = new Date(challenge.updated_at).getTime();
      const timeSinceUpdate = now - lastUpdate;
      
      return {
        room_id: challenge.room_id,
        last_updated: challenge.updated_at,
        minutes_since_update: Math.floor(timeSinceUpdate / 60000),
        is_stale: timeSinceUpdate > staleThreshold
      };
    });

    const staleChallenges = challengeStatus.filter(c => c.is_stale).length;
    const avgMinutesSinceUpdate = challengeStatus.length > 0 
      ? Math.floor(challengeStatus.reduce((sum, c) => sum + c.minutes_since_update, 0) / challengeStatus.length)
      : 0;

    return handleAPIResponse(res, {
      cron_status: 'operational',
      total_active_challenges: challengeStatus.length,
      stale_challenges: staleChallenges,
      avg_minutes_since_update: avgMinutesSinceUpdate,
      last_check: new Date().toISOString(),
      challenges: challengeStatus
    });

  } catch (error) {
    console.error('Cron status error:', error);
    return handleAPIError(res, error);
  }
}
