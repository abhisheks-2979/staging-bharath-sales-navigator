import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const requestAllPermissions = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Not a native platform, skipping permission requests');
    return { camera: true, location: true, storage: true };
  }

  try {
    // Request Camera Permission
    const cameraPermission = await Camera.requestPermissions();
    console.log('Camera permission:', cameraPermission);

    // Request Location Permission
    const locationPermission = await Geolocation.requestPermissions();
    console.log('Location permission:', locationPermission);

    // Request Storage/Filesystem Permission
    const storagePermission = await Filesystem.requestPermissions();
    console.log('Storage permission:', storagePermission);

    return {
      camera: cameraPermission.camera === 'granted',
      location: locationPermission.location === 'granted',
      storage: storagePermission.publicStorage === 'granted'
    };
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return { camera: false, location: false, storage: false };
  }
};

export const checkPermissions = async () => {
  if (!Capacitor.isNativePlatform()) {
    return { camera: true, location: true, storage: true };
  }

  try {
    const cameraPermission = await Camera.checkPermissions();
    const locationPermission = await Geolocation.checkPermissions();
    const storagePermission = await Filesystem.checkPermissions();

    return {
      camera: cameraPermission.camera === 'granted',
      location: locationPermission.location === 'granted',
      storage: storagePermission.publicStorage === 'granted'
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { camera: false, location: false, storage: false };
  }
};
