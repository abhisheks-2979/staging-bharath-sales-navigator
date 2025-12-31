import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { visitStatusCache } from '@/lib/visitStatusCache';
import { updateVisitStatusInSnapshot } from '@/lib/myVisitsSnapshot';
import { supabase } from '@/integrations/supabase/client';
import { isSlowConnection } from '@/utils/internetSpeedCheck';

/**
 * Submit No Order with LOCAL-FIRST pattern
 * Updates local state immediately, syncs to server in background
 * This ensures instant UI feedback even on slow connections
 */
export async function submitNoOrderLocalFirst(params: {
  visitId: string | undefined;
  retailerId: string;
  userId: string;
  reason: string;
  today: string;
}): Promise<{ success: boolean; visitId: string }> {
  const { visitId, retailerId, userId, reason, today } = params;
  const slowConnection = isSlowConnection();
  const isOnline = navigator.onLine && !slowConnection;

  // Generate a visit ID if we don't have one
  const effectiveVisitId = visitId?.startsWith('offline_') || visitId?.startsWith('temp_') || !visitId
    ? `offline_noorder_${retailerId}_${Date.now()}`
    : visitId;

  console.log('⚡ NO ORDER LOCAL-FIRST: Immediate local update', {
    effectiveVisitId,
    retailerId,
    reason,
    isOnline,
    slowConnection
  });

  // STEP 1: Update local UI state IMMEDIATELY (most critical for instant feedback)
  const visitData = {
    id: effectiveVisitId,
    retailer_id: retailerId,
    user_id: userId,
    planned_date: today,
    status: 'unproductive',
    no_order_reason: reason,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Update all local caches in parallel for speed
  await Promise.allSettled([
    offlineStorage.save(STORES.VISITS, visitData),
    visitStatusCache.set(
      effectiveVisitId,
      retailerId,
      userId,
      today,
      'unproductive',
      undefined,
      reason
    ),
    updateVisitStatusInSnapshot(userId, today, retailerId, 'unproductive', reason)
  ]);

  // STEP 2: Dispatch events for instant UI update
  window.dispatchEvent(new CustomEvent('visitStatusChanged', {
    detail: {
      visitId: effectiveVisitId,
      status: 'unproductive',
      retailerId,
      noOrderReason: reason
    }
  }));
  window.dispatchEvent(new Event('visitDataChanged'));
  console.log('✅ NO ORDER: Local state updated, events dispatched');

  // STEP 3: Queue for sync if offline/slow, or sync in background if online
  if (!isOnline) {
    // Queue for later sync
    await offlineStorage.addToSyncQueue('UPDATE_VISIT_NO_ORDER', {
      visitId: effectiveVisitId,
      retailerId,
      userId,
      noOrderReason: reason,
      plannedDate: today,
      timestamp: new Date().toISOString()
    });
    console.log('📴 NO ORDER: Queued for sync (offline/slow)');
  } else {
    // Sync in background (non-blocking) using setTimeout
    setTimeout(async () => {
      try {
        await syncNoOrderToServer({
          visitId: effectiveVisitId,
          retailerId,
          userId,
          reason,
          today
        });
      } catch (error) {
        console.warn('Background no-order sync failed, will retry:', error);
        // Queue for retry
        await offlineStorage.addToSyncQueue('UPDATE_VISIT_NO_ORDER', {
          visitId: effectiveVisitId,
          retailerId,
          userId,
          noOrderReason: reason,
          plannedDate: today,
          timestamp: new Date().toISOString()
        });
      }
    }, 0);
  }

  return { success: true, visitId: effectiveVisitId };
}

/**
 * Background sync to server - called non-blocking
 */
async function syncNoOrderToServer(params: {
  visitId: string;
  retailerId: string;
  userId: string;
  reason: string;
  today: string;
}): Promise<void> {
  const { visitId, retailerId, userId, reason, today } = params;
  const isOfflineId = visitId.startsWith('offline_') || visitId.startsWith('temp_');

  // Set a timeout for all server operations
  const TIMEOUT_MS = 8000;

  const serverOperation = async () => {
    let serverVisitId = visitId;

    if (isOfflineId) {
      // Need to find or create a real visit
      const { data: existingVisit } = await supabase
        .from('visits')
        .select('id')
        .eq('retailer_id', retailerId)
        .eq('user_id', userId)
        .eq('planned_date', today)
        .maybeSingle();

      if (existingVisit) {
        serverVisitId = existingVisit.id;
        // Update existing visit
        await supabase
          .from('visits')
          .update({
            status: 'unproductive',
            no_order_reason: reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', serverVisitId);
      } else {
        // Create new visit
        const { data: newVisit, error: createError } = await supabase
          .from('visits')
          .insert({
            retailer_id: retailerId,
            user_id: userId,
            planned_date: today,
            status: 'unproductive',
            no_order_reason: reason,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;
        serverVisitId = newVisit.id;
      }
    } else {
      // Update existing visit by ID
      const { error } = await supabase
        .from('visits')
        .update({
          status: 'unproductive',
          no_order_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', serverVisitId);

      if (error) throw error;
    }

    // Update local cache with server visit ID if it changed
    if (serverVisitId !== visitId) {
      const localVisit = await offlineStorage.getById(STORES.VISITS, visitId);
      if (localVisit) {
        await offlineStorage.delete(STORES.VISITS, visitId);
        await offlineStorage.save(STORES.VISITS, {
          ...(localVisit as any),
          id: serverVisitId
        });
      }
    }

    console.log('✅ NO ORDER: Server sync complete, visitId:', serverVisitId);
  };

  // Race against timeout
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Server sync timeout')), TIMEOUT_MS)
  );

  await Promise.race([serverOperation(), timeoutPromise]);
}
