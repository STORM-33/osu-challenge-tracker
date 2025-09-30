import { syncConfig } from './sync-config';

// Simple function to check if challenge is stale (server-side only)
export function isStaleChallenge(challenge) {
  if (!challenge || !challenge.is_active) return false;
  
  const updatedAt = challenge.updated_at;
  if (!updatedAt) return true;
  
  const timestamp = new Date(updatedAt).getTime();
  const age = Date.now() - timestamp;
  
  return age > syncConfig.STALENESS_THRESHOLD_MS;
}

// Mark challenge as updated (for compatibility - does nothing now)
export function markChallengeUpdated(roomId) {
  console.log(`✅ Challenge ${roomId} updated`);
}