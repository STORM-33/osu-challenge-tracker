export const syncConfig = {
  // How old data must be before cron updates it (5 minutes)
  STALENESS_THRESHOLD_MS: parseInt(process.env.STALENESS_THRESHOLD_MS) || 5 * 60 * 1000, // Changed from 4 to 5
  
  // Maximum concurrent updates in cron job
  MAX_CONCURRENT_UPDATES: parseInt(process.env.MAX_CONCURRENT_UPDATES) || 5,
  
  // Batch size for processing
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 10,
  
  // Cron secret for authentication
  CRON_SECRET: process.env.CRON_SECRET || 'your-secure-cron-secret',
};

// Helper to ensure UTC interpretation of timestamps
function ensureUTC(dateString) {
  if (!dateString) return null;
  // If it already has timezone info, use as-is
  if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
    return new Date(dateString);
  }
  // Otherwise, treat as UTC by appending 'Z'
  return new Date(dateString + 'Z');
}

export function isStale(updatedAt) {
  if (!updatedAt) return true;
  
  const timestamp = ensureUTC(updatedAt).getTime();
  return Date.now() - timestamp > syncConfig.STALENESS_THRESHOLD_MS;
}

export default syncConfig;