import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'applied_schemes:';

/**
 * Hook to manage applied schemes for an order
 * Persists to localStorage for offline support
 * Each retailer/visit combination has independent scheme state
 */
export function useAppliedSchemes(visitId: string, retailerId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${visitId || 'temp'}:${retailerId || 'unknown'}`;
  
  const [appliedSchemeIds, setAppliedSchemeIds] = useState<string[]>([]);
  const isInitialSync = useRef(true);
  const previousStorageKey = useRef<string | null>(null);

  // Re-sync state when storage key changes (different retailer/visit)
  useEffect(() => {
    // Only sync if the key actually changed
    if (previousStorageKey.current === storageKey) return;
    previousStorageKey.current = storageKey;
    isInitialSync.current = true;
    
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setAppliedSchemeIds(parsed);
      console.log('[useAppliedSchemes] Synced for key:', storageKey, 'Schemes:', parsed.length);
    } catch {
      setAppliedSchemeIds([]);
    }
  }, [storageKey]);

  // Persist to localStorage whenever appliedSchemeIds changes
  useEffect(() => {
    // Skip first save after sync to prevent overwriting
    if (isInitialSync.current) {
      isInitialSync.current = false;
      return;
    }
    
    try {
      if (appliedSchemeIds.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(appliedSchemeIds));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('[useAppliedSchemes] Error saving to localStorage:', error);
    }
  }, [appliedSchemeIds, storageKey]);

  const applyScheme = useCallback((schemeId: string) => {
    setAppliedSchemeIds(prev => {
      if (prev.includes(schemeId)) return prev;
      const updated = [...prev, schemeId];
      console.log('[useAppliedSchemes] Applied scheme:', schemeId, 'Total:', updated.length);
      return updated;
    });
  }, []);

  const removeScheme = useCallback((schemeId: string) => {
    setAppliedSchemeIds(prev => {
      const updated = prev.filter(id => id !== schemeId);
      console.log('[useAppliedSchemes] Removed scheme:', schemeId, 'Remaining:', updated.length);
      return updated;
    });
  }, []);

  const clearSchemes = useCallback(() => {
    setAppliedSchemeIds([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    console.log('[useAppliedSchemes] Cleared all schemes');
  }, [storageKey]);

  const isSchemeApplied = useCallback((schemeId: string) => {
    return appliedSchemeIds.includes(schemeId);
  }, [appliedSchemeIds]);

  return {
    appliedSchemeIds,
    applyScheme,
    removeScheme,
    clearSchemes,
    isSchemeApplied
  };
}
