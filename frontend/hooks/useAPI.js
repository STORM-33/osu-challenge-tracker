import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

// Custom fetcher with error handling
const fetcher = async (url) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('API request failed');
    error.status = res.status;
    
    try {
      const data = await res.json();
      error.message = data.error?.message || 'An error occurred';
      error.code = data.error?.code;
    } catch (e) {
      // Failed to parse error response
    }
    
    throw error;
  }
  
  const data = await res.json();
  return data.data || data;
};

// Custom hook for API calls with loading states
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
      onError: (err) => {
        console.error(`API Error (${endpoint}):`, err);
      }
    }
  );

  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  return {
    data,
    error,
    loading: !error && !data && enabled,
    isValidating,
    refresh
  };
}

// Hook for paginated data
export function usePaginatedAPI(baseEndpoint, options = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(options.defaultLimit || 50);
  
  const endpoint = `${baseEndpoint}?page=${page}&limit=${limit}`;
  const { data, error, loading, refresh } = useAPI(endpoint, options);

  const nextPage = useCallback(() => {
    if (data?.pagination?.hasNext) {
      setPage(p => p + 1);
    }
  }, [data]);

  const prevPage = useCallback(() => {
    if (data?.pagination?.hasPrev) {
      setPage(p => p - 1);
    }
  }, [data]);

  const goToPage = useCallback((newPage) => {
    const maxPage = data?.pagination?.totalPages || 1;
    if (newPage >= 1 && newPage <= maxPage) {
      setPage(newPage);
    }
  }, [data]);

  return {
    data: data?.data,
    pagination: data?.pagination,
    error,
    loading,
    refresh,
    nextPage,
    prevPage,
    goToPage,
    setLimit
  };
}

// Hook for form submissions
export function useAPIForm(endpoint, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const submit = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(endpoint, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Submission failed');
      }

      const result = await response.json();
      setData(result.data || result);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (options.onError) {
        options.onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    submit,
    loading,
    error,
    data,
    reset
  };
}

// Hook for real-time data updates
export function useRealtimeAPI(endpoint, options = {}) {
  const { data, error, loading, refresh } = useAPI(endpoint, {
    ...options,
    refreshInterval: options.refreshInterval || 60000 // Default 1 minute
  });

  // Optional: Add WebSocket support for real-time updates
  useEffect(() => {
    if (!options.websocket) return;

    const ws = new WebSocket(options.websocket);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'refresh') {
        refresh();
      }
    };

    return () => ws.close();
  }, [options.websocket, refresh]);

  return { data, error, loading, refresh };
}