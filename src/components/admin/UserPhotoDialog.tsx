import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl?: string;
  userName?: string;
}

const UserPhotoDialog: React.FC<UserPhotoDialogProps> = ({
  open,
  onOpenChange,
  photoUrl,
  userName = 'User',
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 bg-background/80 hover:bg-background"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={userName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-48 h-48">
                  <AvatarImage src={photoUrl} />
                  <AvatarFallback className="text-6xl">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-muted-foreground">No photo available</p>
              </div>
            )}
            <p className="mt-4 text-lg font-medium text-center">{userName}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserPhotoDialog;
