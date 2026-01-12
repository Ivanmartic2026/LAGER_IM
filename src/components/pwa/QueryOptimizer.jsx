import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized QueryClient configuration for PWA
 * - Longer cache times to reduce network requests
 * - Stale while revalidate pattern
 * - Better offline support
 */
export const createOptimizedQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes - keep data fresh longer
        gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer
        retry: 2, // Retry failed requests
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnMount: 'stale', // Only refetch if data is stale
        refetchOnReconnect: 'stale', // Refetch on reconnect only if stale
        networkMode: 'online', // Wait for online before fetching
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
        networkMode: 'online',
      },
    },
  });
};