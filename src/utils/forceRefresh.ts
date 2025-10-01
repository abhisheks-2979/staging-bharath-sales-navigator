/**
 * Force a complete cache clear and hard refresh
 * Use this when facing persistent caching issues
 */
export const forceCompleteRefresh = async () => {
  try {
    // 1. Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    
    // 2. Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    // 3. Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // 4. Force hard reload (bypass cache)
    window.location.reload();
  } catch (error) {
    console.error('Error during force refresh:', error);
    // Fallback: just hard reload
    window.location.reload();
  }
};

/**
 * Check if a force refresh is needed based on error patterns
 */
export const shouldForceRefresh = (error: Error): boolean => {
  const cacheRelatedErrors = [
    'Cannot read properties of null',
    'useState',
    'Invalid hook call',
    'Hooks can only be called inside',
    'multiple copies of React'
  ];
  
  return cacheRelatedErrors.some(pattern => 
    error.message?.includes(pattern) || error.stack?.includes(pattern)
  );
};
