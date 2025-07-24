import { useState, useEffect } from 'react';

const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY = 'challenges_last_update';

export function useSmartSync(syncType = 'challenges') {
  const [shouldSync, setShouldSync] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storageKey = `${STORAGE_KEY}_${syncType}`;
    const lastUpdate = localStorage.getItem(storageKey);
    const now = Date.now();
    
    const shouldTriggerSync = !lastUpdate || (now - parseInt(lastUpdate)) > SYNC_INTERVAL;
    
    if (shouldTriggerSync) {
      console.log(`🔄 Smart sync: ${syncType} data is stale, triggering update`);
      setShouldSync(true);
      setLastSyncTime(now);
      localStorage.setItem(storageKey, now.toString());
    } else {
      const timeSinceLastUpdate = now - parseInt(lastUpdate);
      const minutesAgo = Math.floor(timeSinceLastUpdate / 60000);
      console.log(`✅ Smart sync: ${syncType} data is fresh (${minutesAgo}min ago), no update needed`);
      setShouldSync(false);
      setLastSyncTime(parseInt(lastUpdate));
    }
  }, [syncType]);

  const markSyncComplete = () => {
    if (typeof window !== 'undefined') {
      const now = Date.now();
      const storageKey = `${STORAGE_KEY}_${syncType}`;
      localStorage.setItem(storageKey, now.toString());
      setLastSyncTime(now);
      setShouldSync(false);
    }
  };

  return {
    shouldSync,
    lastSyncTime,
    markSyncComplete,
    timeSinceLastSync: lastSyncTime ? Date.now() - lastSyncTime : null
  };
}