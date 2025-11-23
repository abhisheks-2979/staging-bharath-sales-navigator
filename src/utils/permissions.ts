import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * Request camera permission (works in both web and native)
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await Camera.requestPermissions();
      const granted = result.camera === 'granted';
      console.log('Native camera permission:', granted ? 'granted' : 'denied');
      return granted;
    } else {
      // Web: Request camera access via getUserMedia
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' },
          audio: false 
        });
        // Stop the stream immediately, we just needed to check permission
        stream.getTracks().forEach(track => track.stop());
        console.log('Web camera permission: granted');
        return true;
      } catch (error) {
        console.error('Web camera permission denied:', error);
        return false;
      }
    }
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * Request location permission (works in both web and native)
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await Geolocation.requestPermissions();
      const granted = result.location === 'granted';
      console.log('Native location permission:', granted ? 'granted' : 'denied');
      return granted;
    } else {
      // Web: Request location via getCurrentPosition
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          console.log('Geolocation not supported');
          resolve(false);
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Web location permission: granted');
            resolve(true);
          },
          (error) => {
            console.error('Web location permission denied:', error);
            resolve(false);
          },
          { timeout: 10000 }
        );
      });
    }
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Request storage permission (native only, web always has storage)
 */
export const requestStoragePermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.requestPermissions();
      const granted = result.publicStorage === 'granted';
      console.log('Native storage permission:', granted ? 'granted' : 'denied');
      return granted;
    } else {
      // Web always has localStorage/IndexedDB
      console.log('Web storage: always available');
      return true;
    }
  } catch (error) {
    console.error('Error requesting storage permission:', error);
    return false;
  }
};

/**
 * Request all permissions at once
 */
export const requestAllPermissions = async () => {
  console.log('Requesting all permissions...');
  
  const camera = await requestCameraPermission();
  const location = await requestLocationPermission();
  const storage = await requestStoragePermission();

  const result = { camera, location, storage };
  console.log('All permissions result:', result);
  
  return result;
};

/**
 * Check if permissions are already granted
 */
export const checkPermissions = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      const cameraPermission = await Camera.checkPermissions();
      const locationPermission = await Geolocation.checkPermissions();
      const storagePermission = await Filesystem.checkPermissions();

      return {
        camera: cameraPermission.camera === 'granted',
        location: locationPermission.location === 'granted',
        storage: storagePermission.publicStorage === 'granted'
      };
    } else {
      // Web: Check via Permissions API if available
      if (navigator.permissions) {
        try {
          const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const locationStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          
          return {
            camera: cameraStatus.state === 'granted',
            location: locationStatus.state === 'granted',
            storage: true // Always available in web
          };
        } catch (error) {
          console.log('Permissions API not fully supported, returning optimistic defaults');
          return { camera: true, location: true, storage: true };
        }
      }
      
      // Fallback: assume permissions need to be requested
      return { camera: false, location: false, storage: true };
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { camera: false, location: false, storage: true };
  }
};
