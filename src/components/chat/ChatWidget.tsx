import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatDialog } from './ChatDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile: Drawer from bottom */}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[85vh] max-h-[85vh]">
            <DrawerHeader className="border-b bg-primary text-primary-foreground">
              <DrawerTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                AI Assistant
              </DrawerTitle>
            </DrawerHeader>
            <ChatDialog onClose={() => setIsOpen(false)} />
          </DrawerContent>
        </Drawer>
      ) : (
        /* Desktop: Sheet from right */
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[500px] p-0 flex flex-col">
            <SheetHeader className="border-b bg-primary text-primary-foreground p-4">
              <SheetTitle className="flex items-center gap-2 text-primary-foreground">
                <MessageCircle className="h-5 w-5" />
                AI Assistant
              </SheetTitle>
            </SheetHeader>
            <ChatDialog onClose={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};