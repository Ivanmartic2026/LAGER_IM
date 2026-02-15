import { useQuery } from "@tanstack/react-query";
import { offlineStorage } from "@/components/utils/offlineStorage";
import { useState } from "react";

export function useOfflineQuery(key, fetchFn, options = {}) {
  const [fromCache, setFromCache] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const query = useQuery({
    queryKey: [key],
    queryFn: async () => {
      try {
        const result = await offlineStorage.get(key, fetchFn);
        setFromCache(result.fromCache);
        setLastSync(result.lastSync);
        return result.data;
      } catch (error) {
        console.error('useOfflineQuery error:', error);
        // Try direct fetch as fallback
        const data = await fetchFn();
        return data;
      }
    },
    staleTime: 30000,
    ...options,
  });

  return {
    ...query,
    fromCache,
    lastSync,
    refetch: query.refetch,
  };
}