export const syncConfig = {
  // How old data must be before cron updates it (5 minutes)
  STALENESS_THRESHOLD_MS: parseInt(process.env.STALENESS_THRESHOLD_MS) || 4 * 60 * 1000,
  
  // Maximum concurrent updates in cron job
  MAX_CONCURRENT_UPDATES: parseInt(process.env.MAX_CONCURRENT_UPDATES) || 5,
  
  // Batch size for processing
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 10,
  
  // Cron secret for authentication
  CRON_SECRET: process.env.CRON_SECRET || 'your-secure-cron-secret',
};

export function isStale(updatedAt) {
  if (!updatedAt) return true;
  const timestamp = new Date(updatedAt).getTime();
  return Date.now() - timestamp > syncConfig.STALENESS_THRESHOLD_MS;
}

export default syncConfig;