import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, X, RotateCw, Settings, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { requestCameraPermissionWithDetails, openAppSettings, checkCameraPermission } from '@/utils/permissions';
import { Capacitor } from '@capacitor/core';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  title?: string;
  description?: string;
}

export const CameraCapture = ({ 
  isOpen, 
  onClose, 
  onCapture,
  title = "Capture Photo",
  description = "Position yourself in the frame and click capture"
}: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      checkAndRequestCamera();
    } else {
      stopCamera();
      setPermissionDenied(false);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const checkAndRequestCamera = async () => {
    setIsCheckingPermission(true);
    setPermissionDenied(false);
    
    try {
      // For PWA/Web: Directly try to get camera access which will trigger browser permission dialog
      if (!Capacitor.isNativePlatform()) {
        console.log('PWA mode: Requesting camera access directly...');
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          
          // Permission granted, set up stream
          setStream(mediaStream);
          setPermissionDenied(false);
          
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          
          console.log('PWA camera permission: granted');
          setIsCheckingPermission(false);
          return;
        } catch (error: any) {
          console.error('PWA camera access error:', error);
          
          if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
            setPermissionDenied(true);
            toast.error('Camera access denied. Please enable camera permission in browser settings.');
          } else if (error?.name === 'NotFoundError') {
            toast.error('No camera found on this device.');
            onClose();
          } else {
            toast.error('Could not access camera. Please check your device settings.');
            onClose();
          }
          setIsCheckingPermission(false);
          return;
        }
      }
      
      // Native app: Check current permission status first
      const currentStatus = await checkCameraPermission();
      
      if (currentStatus.granted) {
        // Permission already granted, start camera
        await startCamera();
        return;
      }
      
      if (currentStatus.denied && !currentStatus.canAskAgain) {
        // Permanently denied - show settings redirect
        setPermissionDenied(true);
        setIsCheckingPermission(false);
        return;
      }
      
      // Request permission - this will show native Android/iOS dialog
      const result = await requestCameraPermissionWithDetails();
      
      if (result.granted) {
        await startCamera();
      } else if (result.denied && !result.canAskAgain) {
        // Permission permanently denied
        setPermissionDenied(true);
        toast.error('Camera permission denied. Please enable it in app settings.');
      } else {
        // Permission denied but can ask again
        toast.error('Camera permission is required to take photos');
        onClose();
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      // Try to start camera anyway
      await startCamera();
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setPermissionDenied(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      // Check if it's a permission error
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        toast.error('Camera access denied. Please enable camera permission in settings.');
      } else {
        toast.error('Could not access camera. Please check your device.');
        onClose();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleOpenSettings = async () => {
    await openAppSettings();
    toast.info('Please enable camera permission in settings, then come back to the app.');
  };

  const handleRetryPermission = async () => {
    setPermissionDenied(false);
    await checkAndRequestCamera();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Ensure dimensions are set
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      canvas.width = vw;
      canvas.height = vh;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, vw, vh);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            setCapturedBlob(blob);
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImage(imageUrl);
          } else {
            // Fallback via dataURL
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
              const resp = await fetch(dataUrl);
              const b = await resp.blob();
              setCapturedBlob(b);
              const imageUrl = URL.createObjectURL(b);
              setCapturedImage(imageUrl);
            } catch (e) {
              console.error('Failed to capture photo:', e);
              toast.error('Failed to capture photo. Please try again.');
            }
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const retake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  const confirmCapture = () => {
    if (capturedBlob) {
      onCapture(capturedBlob);
      handleClose();
      return;
    }
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
          handleClose();
        } else {
          toast.error('Could not process image. Please retake.');
        }
      }, 'image/jpeg', 0.95);
    } else {
      toast.error('Camera not ready. Please try again.');
    }
  };

  const handleClose = () => {
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    setPermissionDenied(false);
    onClose();
  };

  // Render permission denied view
  if (permissionDenied) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Camera Permission Required
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Permission Denied</AlertTitle>
              <AlertDescription>
                Camera access has been denied. To use this feature, please enable camera permission in your device settings.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {Capacitor.isNativePlatform() && (
                <Button 
                  onClick={handleOpenSettings}
                  className="w-full gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Open App Settings
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={handleRetryPermission}
                className="w-full gap-2"
              >
                <Camera className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                variant="ghost"
                onClick={handleClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {Capacitor.isNativePlatform() 
                ? 'Tap "Open App Settings" to go to settings and enable camera permission for this app.'
                : 'Please check your browser settings to enable camera access for this website.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isCheckingPermission ? (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Checking camera permission...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Camera View */}
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {!capturedImage ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Camera overlay guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-64 border-4 border-primary/50 rounded-full" />
                    </div>
                  </>
                ) : (
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-2">
                {!capturedImage ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={toggleCamera}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      className="gap-2"
                      disabled={!stream}
                    >
                      <Camera className="h-4 w-4" />
                      Capture Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={retake}
                    >
                      Retake
                    </Button>
                    <Button
                      type="button"
                      onClick={confirmCapture}
                    >
                      Use This Photo
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
