import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, HardDrive, AlertCircle } from 'lucide-react';
import { requestCameraPermission, requestLocationPermission, requestStoragePermission } from '@/utils/permissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  requireCamera?: boolean;
  requireLocation?: boolean;
  requireStorage?: boolean;
}

export const PermissionGuard = ({ 
  children, 
  requireCamera = false, 
  requireLocation = false,
  requireStorage = false 
}: PermissionGuardProps) => {
  const [permissions, setPermissions] = useState({
    camera: !requireCamera,
    location: !requireLocation,
    storage: !requireStorage
  });
  const [requesting, setRequesting] = useState(false);

  const checkAndRequestPermissions = async () => {
    setRequesting(true);
    const results = {
      camera: true,
      location: true,
      storage: true
    };

    if (requireCamera) {
      results.camera = await requestCameraPermission();
    }
    if (requireLocation) {
      results.location = await requestLocationPermission();
    }
    if (requireStorage) {
      results.storage = await requestStoragePermission();
    }

    setPermissions(results);
    setRequesting(false);
  };

  useEffect(() => {
    if (requireCamera || requireLocation || requireStorage) {
      checkAndRequestPermissions();
    }
  }, [requireCamera, requireLocation, requireStorage]);

  const allGranted = permissions.camera && permissions.location && permissions.storage;

  if (!allGranted && !requesting) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Permissions Required</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            {requireCamera && !permissions.camera && (
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <span>Camera access is required</span>
              </div>
            )}
            {requireLocation && !permissions.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Location access is required</span>
              </div>
            )}
            {requireStorage && !permissions.storage && (
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span>Storage access is required</span>
              </div>
            )}
          </div>
          <Button 
            onClick={checkAndRequestPermissions} 
            className="mt-4"
            size="sm"
          >
            Grant Permissions
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (requesting) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Requesting permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
