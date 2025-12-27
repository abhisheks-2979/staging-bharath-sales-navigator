import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'applied_schemes:';

/**
 * Hook to manage applied schemes for an order
 * Persists to localStorage for offline support
 */
export function useAppliedSchemes(visitId: string, retailerId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${visitId || 'temp'}:${retailerId || 'unknown'}`;
  
  const [appliedSchemeIds, setAppliedSchemeIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever appliedSchemeIds changes
  useEffect(() => {
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
