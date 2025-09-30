import useSWR from 'swr';
import { useState, useCallback } from 'react';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('API request failed');
    error.status = res.status;
    try {
      const data = await res.json();
      error.message = data.error?.message || 'An error occurred';
    } catch (e) {
      error.message = res.statusText || 'An error occurred';
    }
    throw error;
  }
  const data = await res.json();
  return data.data || data;
};

export function useAPI(endpoint, options = {}) {
  const {
    refreshInterval = null,
    revalidateOnFocus = false,
    initialData = null,
    enabled = true
  } = options;

  const { data, error, mutate, isValidating } = useSWR(
    enabled ? endpoint : null,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      fallbackData: initialData,
      dedupingInterval: 60000,
      focusThrottleInterval: 60000,
      errorRetryInterval: 30000,
    }
  );

  const refresh = useCallback(() => mutate(), [mutate]);

  return {
    data,
    error,
    loading: !error && !data && enabled,
    isValidating,
    refresh
  };
}

// Simple hook for challenges - no sync logic
export function useChallenge(roomId) {
  return useAPI(roomId ? `/api/challenges/${roomId}` : null, {
    refreshInterval: 300000 // Refresh every 5 minutes
  });
}

// Simple hook for challenges list - no sync logic
export function useChallenges(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, value.toString());
    }
  });
  
  const endpoint = `/api/challenges?${params.toString()}`;
  
  return useAPI(endpoint, {
    refreshInterval: 300000 // Refresh every 5 minutes
  });
}