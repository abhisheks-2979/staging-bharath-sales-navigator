// IndexedDB setup for offline storage
// STORAGE STRATEGY: Only cache essential data needed for offline operations
// - PRODUCTS, VARIANTS, SCHEMES, CATEGORIES: Active items for order entry
// - BEATS, RETAILERS: User's active beats and retailers
// - BEAT_PLANS: Only today + next 3 days (not historical)
// - VISITS: Only current date visits
// - ORDERS: ONLY pending orders in sync queue (not all historical orders)
// - SYNC_QUEUE: Pending actions to sync when online
const DB_NAME = 'OfflineAppDB';
const DB_VERSION = 4; // Increased for new competition stores

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
  COMPETITION_DATA: 'competitionData'
} as const;

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.db) {
      return Promise.resolve();
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        console.log('[OfflineStorage] Initializing IndexedDB for persistent storage...');
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('[OfflineStorage] Failed to open database:', request.error);
          this.initPromise = null;
          reject(request.error);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          console.log('[OfflineStorage] ✅ Database initialized successfully - data will persist across app restarts');
          this.initPromise = null;
          resolve();
        };

      request.onupgradeneeded = (event) => {
        console.log('[OfflineStorage] Upgrading database schema...');
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const ordersStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
          ordersStore.createIndex('retailerId', 'retailerId', { unique: false });
          ordersStore.createIndex('createdAt', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.VARIANTS)) {
          const variantsStore = db.createObjectStore(STORES.VARIANTS, { keyPath: 'id' });
          variantsStore.createIndex('productId', 'productId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.RETAILERS)) {
          const retailersStore = db.createObjectStore(STORES.RETAILERS, { keyPath: 'id' });
          retailersStore.createIndex('beatId', 'beatId', { unique: false });
          retailersStore.createIndex('userId', 'user_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.VISITS)) {
          const visitsStore = db.createObjectStore(STORES.VISITS, { keyPath: 'id' });
          visitsStore.createIndex('retailerId', 'retailerId', { unique: false });
          visitsStore.createIndex('visitDate', 'planned_date', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.BEATS)) {
          const beatsStore = db.createObjectStore(STORES.BEATS, { keyPath: 'id' });
          beatsStore.createIndex('beatId', 'beat_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.SCHEMES)) {
          const schemesStore = db.createObjectStore(STORES.SCHEMES, { keyPath: 'id' });
          schemesStore.createIndex('productId', 'productId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.BEAT_PLANS)) {
          const beatPlansStore = db.createObjectStore(STORES.BEAT_PLANS, { keyPath: 'id' });
          beatPlansStore.createIndex('userId', 'user_id', { unique: false });
          beatPlansStore.createIndex('planDate', 'plan_date', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.COMPETITION_MASTER)) {
          db.createObjectStore(STORES.COMPETITION_MASTER, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.COMPETITION_SKUS)) {
          const competitionSkusStore = db.createObjectStore(STORES.COMPETITION_SKUS, { keyPath: 'id' });
          competitionSkusStore.createIndex('competitorId', 'competitor_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.COMPETITION_DATA)) {
          const competitionDataStore = db.createObjectStore(STORES.COMPETITION_DATA, { keyPath: 'id' });
          competitionDataStore.createIndex('retailerId', 'retailer_id', { unique: false });
          competitionDataStore.createIndex('visitId', 'visit_id', { unique: false });
        }
        console.log('[OfflineStorage] ✅ Database schema upgraded successfully');
      };
      } catch (error) {
        console.error('[OfflineStorage] Error during initialization:', error);
        this.initPromise = null;
        reject(error);
      }
    });

    return this.initPromise;
  }

  // Verify database is ready
  private async ensureReady(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database initialization failed');
    }
  }

  // Generic CRUD operations
  async save<T>(storeName: string, data: T): Promise<void> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => {
          console.log(`[OfflineStorage] ✅ Saved to ${storeName}`);
          resolve();
        };
        request.onerror = () => {
          console.error(`[OfflineStorage] ❌ Failed to save to ${storeName}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`[OfflineStorage] ❌ Transaction error in ${storeName}:`, error);
        reject(error);
      }
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          console.log(`[OfflineStorage] Retrieved ${request.result?.length || 0} items from ${storeName}`);
          resolve(request.result || []);
        };
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async delete(storeName: string, id: string | number): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
        const store = transaction.objectStore(STORES.SYNC_QUEUE);
        const request = store.getAll();

        request.onsuccess = () => {
          const allItems = request.result || [];
          let deletedCount = 0;

          allItems.forEach((item: any) => {
            if (item.timestamp && item.timestamp < cutoffTime) {
              store.delete(item.id);
              deletedCount++;
            }
          });

          if (deletedCount > 0) {
            console.log(`[OfflineStorage] 🗑️ Deleted ${deletedCount} old synced items (older than 3 days)`);
          }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize on first import with proper error handling
offlineStorage.init()
  .then(() => {
    console.log('[OfflineStorage] 🚀 Ready - All data will persist in APK/PWA');
  })
  .catch((error) => {
    console.error('[OfflineStorage] ⚠️ Initialization failed:', error);
    console.error('[OfflineStorage] App data may not persist properly');
  });
