// Utility for caching Firebase data to improve loading times
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export const cacheFirebaseData = async <T>(key: string, data: T): Promise<void> => {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error caching data:', error);
  }
};

export const getFirebaseCache = async <T>(key: string): Promise<T | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(key);
    if (!cachedData) return null;
    
    const cacheItem: CacheItem<T> = JSON.parse(cachedData);
    
    // Check if cache is still valid
    if (Date.now() - cacheItem.timestamp < CACHE_DURATION) {
      return cacheItem.data;
    }
    
    // Cache expired
    return null;
  } catch (error) {
    console.error('Error retrieving cached data:', error);
    return null;
  }
};

export const clearFirebaseCache = async (key?: string): Promise<void> => {
  try {
    if (key) {
      await AsyncStorage.removeItem(key);
    } else {
      // Clear all cache keys that start with 'firebase_'
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith('firebase_'));
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Helper function to generate cache keys
export const getCacheKey = (collection: string, query?: string): string => {
  return `firebase_${collection}${query ? `_${query}` : ''}`;
};