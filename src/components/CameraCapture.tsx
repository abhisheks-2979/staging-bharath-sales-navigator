import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      // Request camera permission before starting
      try {
        const { requestCameraPermission } = await import('@/utils/permissions');
        const granted = await requestCameraPermission();
        
        if (!granted) {
          toast.error('Camera permission is required to take photos');
          onClose();
          return;
        }
      } catch (permError) {
        console.error('Permission check error:', permError);
        // Continue anyway in case permissions are already granted
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera. Please grant camera permission.');
      onClose();
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
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
