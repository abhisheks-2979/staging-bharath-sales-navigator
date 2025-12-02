import { Preferences } from '@capacitor/preferences';

// Capacitor Preferences for offline storage (works in both PWA and APK)
// STORAGE STRATEGY: Only cache essential data needed for offline operations
// - PRODUCTS, VARIANTS, SCHEMES, CATEGORIES: Active items for order entry
// - BEATS, RETAILERS: User's active beats and retailers
// - BEAT_PLANS: Only today + next 3 days (not historical)
// - VISITS: Only current date visits
// - ORDERS: ONLY pending orders in sync queue (not all historical orders)
// - SYNC_QUEUE: Pending actions to sync when online

// Object store names
export const STORES = {
  ORDERS: 'orders',
  VARIANTS: 'variants', 
  RETAILERS: 'retailers',
  VISITS: 'visits',
  SYNC_QUEUE: 'syncQueue',
  PRODUCTS: 'products',
  BEATS: 'beats',
  CATEGORIES: 'categories',
  SCHEMES: 'schemes',
  BEAT_PLANS: 'beatPlans',
  COMPETITION_MASTER: 'competitionMaster',
  COMPETITION_SKUS: 'competitionSkus',
  COMPETITION_DATA: 'competitionData',
  ATTENDANCE: 'attendance',
  RETAILER_VISIT_LOGS: 'retailerVisitLogs'
} as const;

class OfflineStorage {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    console.log('[OfflineStorage] ✅ Capacitor Preferences ready - data persists across app restarts');
    this.initialized = true;
  }

  private async ensureReady(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  // Helper to get store key
  private getStoreKey(storeName: string): string {
    return `offline_${storeName}`;
  }

  // Helper to get data from Preferences
  private async getStoreData<T>(storeName: string): Promise<T[]> {
    try {
      const key = this.getStoreKey(storeName);
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error(`[OfflineStorage] Error reading ${storeName}:`, error);
      return [];
    }
  }

  // Helper to save data to Preferences
  private async setStoreData(storeName: string, data: any[]): Promise<void> {
    try {
      const key = this.getStoreKey(storeName);
      await Preferences.set({ key, value: JSON.stringify(data) });
    } catch (error) {
      console.error(`[OfflineStorage] Error writing ${storeName}:`, error);
      throw error;
    }
  }

  // Generic CRUD operations
  async save<T>(storeName: string, data: T): Promise<void> {
    await this.ensureReady();
    
    try {
      const items = await this.getStoreData<T>(storeName);
      const dataWithId = data as any;
      
      // Auto-generate ID if not present
      if (!dataWithId.id) {
        dataWithId.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      }
      
      const existingIndex = items.findIndex((item: any) => item.id === dataWithId.id);
      
      if (existingIndex >= 0) {
        items[existingIndex] = dataWithId;
      } else {
        items.push(dataWithId);
      }
      
      await this.setStoreData(storeName, items);
      console.log(`[OfflineStorage] ✅ Saved to ${storeName}`);
    } catch (error) {
      console.error(`[OfflineStorage] ❌ Failed to save to ${storeName}:`, error);
      throw error;
    }
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    await this.ensureReady();
    
    try {
      const items = await this.getStoreData<T>(storeName);
      const item = items.find((item: any) => item.id === id);
      return item || null;
    } catch (error) {
      console.error(`[OfflineStorage] Error getting item from ${storeName}:`, error);
      return null;
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.ensureReady();
    
    try {
      const items = await this.getStoreData<T>(storeName);
      console.log(`[OfflineStorage] Retrieved ${items.length} items from ${storeName}`);
      return items;
    } catch (error) {
      console.error(`[OfflineStorage] Error getting all from ${storeName}:`, error);
      return [];
    }
  }

  async delete(storeName: string, id: string | number): Promise<void> {
    await this.ensureReady();
    
    try {
      const items = await this.getStoreData(storeName);
      const filtered = items.filter((item: any) => item.id !== id);
      await this.setStoreData(storeName, filtered);
    } catch (error) {
      console.error(`[OfflineStorage] Error deleting from ${storeName}:`, error);
      throw error;
    }
  }

  async clear(storeName: string): Promise<void> {
    await this.ensureReady();
    
    try {
      await this.setStoreData(storeName, []);
      console.log(`[OfflineStorage] Cleared ${storeName}`);
    } catch (error) {
      console.error(`[OfflineStorage] Error clearing ${storeName}:`, error);
      throw error;
    }
  }

  // Sync queue operations for offline actions
  async addToSyncQueue(action: string, data: any): Promise<void> {
    const syncItem = {
      action,
      data,
      timestamp: Date.now(),
      createdAt: Date.now(),
      retryCount: 0
    };
    
    await this.save(STORES.SYNC_QUEUE, syncItem);
  }

  async getSyncQueue(): Promise<any[]> {
    return this.getAll(STORES.SYNC_QUEUE);
  }

  async clearSyncQueue(): Promise<void> {
    return this.clear(STORES.SYNC_QUEUE);
  }

  async deleteOldSyncedItems(maxAgeMs: number = 3 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.ensureReady();
    const now = Date.now();
    const cutoffTime = now - maxAgeMs;

    try {
      const items = await this.getStoreData<any>(STORES.SYNC_QUEUE);
      const recentItems = items.filter((item: any) => 
        !item.timestamp || item.timestamp >= cutoffTime
      );
      
      const deletedCount = items.length - recentItems.length;
      
      if (deletedCount > 0) {
        await this.setStoreData(STORES.SYNC_QUEUE, recentItems);
        console.log(`[OfflineStorage] 🗑️ Deleted ${deletedCount} old synced items (older than 3 days)`);
      }
    } catch (error) {
      console.error('[OfflineStorage] Error deleting old items:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();
