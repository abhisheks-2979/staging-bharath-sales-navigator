/**
 * Centralized permission management for camera, location, and storage
 */

export interface PermissionStatus {
  camera: boolean;
  location: boolean;
  storage: boolean;
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera API not supported');
      return false;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true 
    });
    
    // Stop the stream immediately - we just needed to request permission
    stream.getTracks().forEach(track => track.stop());
    
    console.log('✅ Camera permission granted');
    localStorage.setItem('permission_camera', 'granted');
    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    localStorage.setItem('permission_camera', 'denied');
    return false;
  }
}

/**
 * Request location permission
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    if (!navigator.geolocation) {
      console.warn('Geolocation API not supported');
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          console.log('✅ Location permission granted');
          localStorage.setItem('permission_location', 'granted');
          resolve(true);
        },
        (error) => {
          console.error('Location permission denied:', error);
          localStorage.setItem('permission_location', 'denied');
          resolve(false);
        },
        { timeout: 5000 }
      );
    });
  } catch (error) {
    console.error('Error requesting location permission:', error);
    localStorage.setItem('permission_location', 'denied');
    return false;
  }
}

/**
 * Request storage permission (for PWA/mobile)
 * In browsers, this is usually automatic. For Capacitor, we may need native permissions.
 */
export async function requestStoragePermission(): Promise<boolean> {
  try {
    // Check if storage estimate API is available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      console.log('Storage available:', estimate.quota, 'Used:', estimate.usage);
      localStorage.setItem('permission_storage', 'granted');
      return true;
    }
    
    // For older browsers, assume storage is available
    console.log('✅ Storage permission granted (legacy)');
    localStorage.setItem('permission_storage', 'granted');
    return true;
  } catch (error) {
    console.error('Storage permission check failed:', error);
    localStorage.setItem('permission_storage', 'denied');
    return false;
  }
}

/**
 * Request all permissions at once
 */
export async function requestAllPermissions(): Promise<PermissionStatus> {
  console.log('🔐 Requesting all permissions...');
  
  const [camera, location, storage] = await Promise.all([
    requestCameraPermission(),
    requestLocationPermission(),
    requestStoragePermission(),
  ]);

  const status: PermissionStatus = {
    camera,
    location,
    storage,
  };

  console.log('Permission status:', status);
  return status;
}

/**
 * Check if all permissions have been granted
 */
export function checkPermissionStatus(): PermissionStatus {
  return {
    camera: localStorage.getItem('permission_camera') === 'granted',
    location: localStorage.getItem('permission_location') === 'granted',
    storage: localStorage.getItem('permission_storage') === 'granted',
  };
}

/**
 * Check if permissions have been requested before
 */
export function hasRequestedPermissions(): boolean {
  return localStorage.getItem('permissions_requested') === 'true';
}

/**
 * Mark permissions as requested
 */
export function markPermissionsRequested(): void {
  localStorage.setItem('permissions_requested', 'true');
}
