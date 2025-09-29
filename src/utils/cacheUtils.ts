// Cache management utilities

export const clearAllCaches = async (): Promise<void> => {
  try {
    // Clear all cache storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared successfully');
    }

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Unregister service worker to force refresh
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      console.log('Service workers unregistered');
    }
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
};

export const clearApiCache = async (): Promise<void> => {
  try {
    if ('caches' in window) {
      await caches.delete('api-cache');
      await caches.delete('dynamic-cache');
      console.log('API caches cleared');
    }
  } catch (error) {
    console.error('Error clearing API cache:', error);
  }
};

export const forceRefresh = (): void => {
  // Force a hard refresh to bypass all caches
  window.location.reload();
};

// Check if app needs update
export const checkForUpdates = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return registration.waiting !== null;
    }
  }
  return false;
};