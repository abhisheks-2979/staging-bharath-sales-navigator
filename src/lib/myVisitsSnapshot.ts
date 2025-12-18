import { Preferences } from '@capacitor/preferences';

// My Visits Snapshot Cache
// Saves the full page state when data loads successfully from network
// Loads instantly on app restart or slow/no network

interface SnapshotData {
  beatPlans: any[];
  visits: any[];
  retailers: any[];
  orders: any[];
  progressStats: {
    planned: number;
    productive: number;
    unproductive: number;
    totalOrders: number;
    totalOrderValue: number;
  };
  currentBeatName: string;
  timestamp: number;
}

const SNAPSHOT_KEY_PREFIX = 'myvisits_snapshot_';

// Get snapshot key for user+date
const getSnapshotKey = (userId: string, date: string): string => {
  return `${SNAPSHOT_KEY_PREFIX}${userId}_${date}`;
};

// Save snapshot when data loads successfully from network
export const saveMyVisitsSnapshot = async (
  userId: string,
  date: string,
  data: {
    beatPlans: any[];
    visits: any[];
    retailers: any[];
    orders: any[];
    progressStats: {
      planned: number;
      productive: number;
      unproductive: number;
      totalOrders: number;
      totalOrderValue: number;
    };
    currentBeatName: string;
  }
): Promise<void> => {
  try {
    const snapshot: SnapshotData = {
      ...data,
      timestamp: Date.now()
    };
    
    const key = getSnapshotKey(userId, date);
    await Preferences.set({
      key,
      value: JSON.stringify(snapshot)
    });
    
    console.log('📸 [SNAPSHOT] Saved My Visits snapshot for', date, 'retailers:', data.retailers.length);
  } catch (error) {
    console.error('[SNAPSHOT] Failed to save:', error);
  }
};

// Load snapshot instantly on app start
export const loadMyVisitsSnapshot = async (
  userId: string,
  date: string
): Promise<SnapshotData | null> => {
  try {
    const key = getSnapshotKey(userId, date);
    const { value } = await Preferences.get({ key });
    
    if (value) {
      const snapshot: SnapshotData = JSON.parse(value);
      
      // Snapshots are valid for 7 days
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - snapshot.timestamp < sevenDaysMs) {
        console.log('📸 [SNAPSHOT] Loaded My Visits snapshot for', date, 'retailers:', snapshot.retailers.length);
        return snapshot;
      } else {
        console.log('📸 [SNAPSHOT] Snapshot expired for', date);
        // Clean up expired snapshot
        await Preferences.remove({ key });
      }
    }
    
    return null;
  } catch (error) {
    console.error('[SNAPSHOT] Failed to load:', error);
    return null;
  }
};

// Update a specific visit's status in the snapshot (for real-time cache updates)
export const updateVisitStatusInSnapshot = async (
  userId: string,
  date: string,
  retailerId: string,
  newStatus: 'productive' | 'unproductive' | 'planned',
  noOrderReason?: string
): Promise<void> => {
  try {
    const snapshot = await loadMyVisitsSnapshot(userId, date);
    if (!snapshot) {
      console.log('📸 [SNAPSHOT] No snapshot to update for', date);
      return;
    }

    // Find and update the visit in the snapshot
    const existingVisitIndex = snapshot.visits.findIndex(
      (v: any) => v.retailer_id === retailerId
    );

    if (existingVisitIndex >= 0) {
      snapshot.visits[existingVisitIndex] = {
        ...snapshot.visits[existingVisitIndex],
        status: newStatus,
        no_order_reason: noOrderReason || null,
        updated_at: new Date().toISOString()
      };
    } else {
      // Add a new visit entry if it doesn't exist
      snapshot.visits.push({
        id: `visit-${retailerId}-${Date.now()}`,
        retailer_id: retailerId,
        user_id: userId,
        status: newStatus,
        no_order_reason: noOrderReason || null,
        planned_date: date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Update progress stats
    if (newStatus === 'unproductive') {
      // Move from planned to unproductive
      if (snapshot.progressStats.planned > 0) {
        snapshot.progressStats.planned -= 1;
      }
      snapshot.progressStats.unproductive += 1;
    } else if (newStatus === 'productive') {
      // Move from planned to productive
      if (snapshot.progressStats.planned > 0) {
        snapshot.progressStats.planned -= 1;
      }
      snapshot.progressStats.productive += 1;
    }

    // Save updated snapshot
    const key = getSnapshotKey(userId, date);
    await Preferences.set({
      key,
      value: JSON.stringify({ ...snapshot, timestamp: Date.now() })
    });

    console.log('📸 [SNAPSHOT] Updated visit status in snapshot:', retailerId, '->', newStatus);
  } catch (error) {
    console.error('[SNAPSHOT] Failed to update visit status:', error);
  }
};

// Clear old snapshots (keep only last 7 days)
export const cleanupOldSnapshots = async (userId: string): Promise<void> => {
  try {
    const { keys } = await Preferences.keys();
    const userPrefix = `${SNAPSHOT_KEY_PREFIX}${userId}_`;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    for (const key of keys) {
      if (key.startsWith(userPrefix)) {
        const { value } = await Preferences.get({ key });
        if (value) {
          try {
            const snapshot: SnapshotData = JSON.parse(value);
            if (snapshot.timestamp < sevenDaysAgo) {
              await Preferences.remove({ key });
              console.log('📸 [SNAPSHOT] Cleaned up old snapshot:', key);
            }
          } catch {
            // Invalid JSON, remove it
            await Preferences.remove({ key });
          }
        }
      }
    }
  } catch (error) {
    console.error('[SNAPSHOT] Cleanup failed:', error);
  }
};
