import { useQuery } from "@tanstack/react-query";
import { offlineStorage } from "@/components/utils/offlineStorage";
import { useState } from "react";

export function useOfflineQuery(key, fetchFn, options = {}) {
  const [fromCache, setFromCache] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const query = useQuery({
    queryKey: [key],
    queryFn: async () => {
      const result = await offlineStorage.get(key, fetchFn);
      setFromCache(result.fromCache);
      setLastSync(result.lastSync);
      return result.data;
    },
    staleTime: 30000,
    ...options,
  });

  return {
    ...query,
    fromCache,
    lastSync,
  };
}