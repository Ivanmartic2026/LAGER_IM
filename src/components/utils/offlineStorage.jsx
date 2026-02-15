// Offline storage utility for critical data
const STORAGE_KEYS = {
  ARTICLES: 'offline_articles',
  ORDERS: 'offline_orders',
  WAREHOUSES: 'offline_warehouses',
  SUPPLIERS: 'offline_suppliers',
  LAST_SYNC: 'offline_last_sync',
};

const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

class OfflineStorage {
  isOnline() {
    return navigator.onLine;
  }

  getLastSync(key) {
    const syncData = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    if (!syncData) return null;
    const syncs = JSON.parse(syncData);
    return syncs[key] ? new Date(syncs[key]) : null;
  }

  setLastSync(key) {
    const syncData = localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || '{}';
    const syncs = JSON.parse(syncData);
    syncs[key] = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(syncs));
  }

  isCacheValid(key) {
    const lastSync = this.getLastSync(key);
    if (!lastSync) return false;
    return Date.now() - lastSync.getTime() < CACHE_DURATION;
  }

  // Get data with offline fallback
  async get(key, fetchFn) {
    // iOS: Skip caching - fetch directly
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const data = await fetchFn();
      return { data, fromCache: false };
    }

    const storageKey = STORAGE_KEYS[key.toUpperCase()];
    
    // Try to fetch fresh data if online
    if (this.isOnline()) {
      try {
        const data = await fetchFn();
        localStorage.setItem(storageKey, JSON.stringify(data));
        this.setLastSync(key);
        return { data, fromCache: false };
      } catch (error) {
        console.warn(`Failed to fetch ${key}, using cache:`, error);
      }
    }

    // Fallback to cache
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      return { 
        data: JSON.parse(cached), 
        fromCache: true,
        lastSync: this.getLastSync(key)
      };
    }

    throw new Error(`No cached data available for ${key}`);
  }

  // Save data to cache
  set(key, data) {
    const storageKey = STORAGE_KEYS[key.toUpperCase()];
    localStorage.setItem(storageKey, JSON.stringify(data));
    this.setLastSync(key);
  }

  // Clear specific cache
  clear(key) {
    const storageKey = STORAGE_KEYS[key.toUpperCase()];
    localStorage.removeItem(storageKey);
  }

  // Clear all caches
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Get cache info
  getCacheInfo() {
    return Object.entries(STORAGE_KEYS)
      .filter(([k]) => k !== 'LAST_SYNC')
      .map(([name, key]) => {
        const data = localStorage.getItem(key);
        const lastSync = this.getLastSync(name.toLowerCase());
        return {
          name,
          size: data ? new Blob([data]).size : 0,
          lastSync,
          isValid: this.isCacheValid(name.toLowerCase()),
          count: data ? JSON.parse(data).length : 0
        };
      });
  }
}

export const offlineStorage = new OfflineStorage();