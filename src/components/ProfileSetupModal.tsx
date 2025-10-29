import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CameraCapture } from './CameraCapture';

interface ProfileSetupModalProps {
  userId: string;
  fullName: string;
  onComplete: () => void;
}

export const ProfileSetupModal = ({ userId, fullName, onComplete }: ProfileSetupModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    checkProfileSetup();
  }, [userId]);

  const checkProfileSetup = async () => {
    try {
      // Check if user has profile picture in profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', userId)
        .single();

      if (!profile?.profile_picture_url) {
        setNeedsProfileSetup(true);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error checking profile setup:', error);
    }
  };

  const handleCapture = async (blob: Blob) => {
    setIsUploading(true);
    
    try {
      // Upload to employee-photos bucket
      const fileName = `${userId}/baseline_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(fileName);

      // Update profiles table with profile picture
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: urlData.publicUrl })
        .eq('id', userId);

      if (profileError) throw profileError;

      setProfileImageUrl(urlData.publicUrl);
      toast.success('Profile picture uploaded successfully!');
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = () => {
    if (!profileImageUrl) {
      toast.error('Please capture your profile picture before continuing');
      return;
    }
    setIsOpen(false);
    onComplete();
  };

  if (!needsProfileSetup) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Please capture your profile picture. This will be used for face verification during check-in.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            <Avatar className="w-32 h-32 border-4 border-border">
              <AvatarImage src={profileImageUrl || undefined} />
              <AvatarFallback className="text-4xl">{fullName.charAt(0)}</AvatarFallback>
            </Avatar>

            {!profileImageUrl ? (
              <Button 
                onClick={() => setShowCamera(true)}
                disabled={isUploading}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Capture Profile Picture'}
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Profile picture uploaded!</span>
                </div>
                <Button variant="outline" onClick={() => setShowCamera(true)}>
                  Retake Photo
                </Button>
              </div>
            )}

            {profileImageUrl && (
              <Button onClick={handleComplete} className="w-full">
                Continue to Dashboard
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Your profile picture will be verified by your manager and used for attendance verification.
          </p>
        </DialogContent>
      </Dialog>

      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCapture}
        title="Capture Profile Picture"
        description="Position your face in the center of the frame"
      />
    </>
  );
};
