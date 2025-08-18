// IndexedDB setup for offline storage
const DB_NAME = 'OfflineAppDB';
const DB_VERSION = 1;

// Object store names
export const STORES = {
  ORDERS: 'orders',
  VARIANTS: 'variants', 
  RETAILERS: 'retailers',
  VISITS: 'visits',
  SYNC_QUEUE: 'syncQueue'
} as const;

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const ordersStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
          ordersStore.createIndex('retailerId', 'retailerId', { unique: false });
          ordersStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.VARIANTS)) {
          const variantsStore = db.createObjectStore(STORES.VARIANTS, { keyPath: 'id' });
          variantsStore.createIndex('productId', 'productId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.RETAILERS)) {
          const retailersStore = db.createObjectStore(STORES.RETAILERS, { keyPath: 'id' });
          retailersStore.createIndex('beatId', 'beatId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.VISITS)) {
          const visitsStore = db.createObjectStore(STORES.VISITS, { keyPath: 'id' });
          visitsStore.createIndex('retailerId', 'retailerId', { unique: false });
          visitsStore.createIndex('visitDate', 'visitDate', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Generic CRUD operations
  async save<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
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
      retryCount: 0
    };
    
    await this.save(STORES.SYNC_QUEUE, syncItem);
  }

  async getSyncQueue(): Promise<any[]> {
    return this.getAll(STORES.SYNC_QUEUE);
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize on first import
offlineStorage.init().catch(console.error);