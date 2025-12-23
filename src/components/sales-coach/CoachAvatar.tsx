import { useState, memo, useCallback } from 'react';
import { GraduationCap, X, Sparkles, MessageCircle, Brain, Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
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
import { CoachChatInterface } from './CoachChatInterface';
import { cn } from '@/lib/utils';

interface CoachAvatarProps {
  className?: string;
}

export const CoachAvatar = memo(({ className }: CoachAvatarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Don't render if user is not logged in
  if (!user) {
    return null;
  }
  
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setShowQuickActions(false);
  }, []);
  
  const handleClose = useCallback(() => setIsOpen(false), []);
  
  const toggleQuickActions = useCallback(() => {
    setShowQuickActions(prev => !prev);
  }, []);

  const quickActions = [
    { icon: Brain, label: 'Quick Quiz', action: 'quiz', color: 'bg-purple-500' },
    { icon: Target, label: 'Learn Now', action: 'learn', color: 'bg-blue-500' },
    { icon: Trophy, label: 'My Progress', action: 'progress', color: 'bg-amber-500' },
  ];

  return (
    <>
      {/* Floating Coach Avatar Button */}
      {!isOpen && (
        <div 
          className={cn("fixed z-50", className)}
          style={{ 
            right: '1.5rem',
            bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {/* Quick Action Bubbles */}
          <AnimatePresence>
            {showQuickActions && (
              <motion.div 
                className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.action}
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={handleOpen}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-sm font-medium",
                      action.color,
                      "hover:scale-105 transition-transform"
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Avatar Button */}
          <div className="relative">
            <Button
              onClick={toggleQuickActions}
              onDoubleClick={handleOpen}
              className={cn(
                "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all",
                "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700",
                "hover:from-purple-500 hover:via-blue-500 hover:to-indigo-600",
                "border-2 border-white/20"
              )}
              size="icon"
            >
              <GraduationCap className="h-7 w-7 text-white" />
            </Button>
            
            {/* Animated Sparkle Indicator */}
            <motion.div
              className="absolute -top-1 -right-1 h-5 w-5 bg-amber-400 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="h-3 w-3 text-amber-900" />
            </motion.div>
          </div>
          
          {/* Tap hint */}
          {!showQuickActions && (
            <motion.p
              className="absolute -top-8 right-0 text-xs text-muted-foreground whitespace-nowrap bg-background/90 px-2 py-1 rounded-full shadow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              Tap for coach
            </motion.p>
          )}
        </div>
      )}

      {/* Mobile: Drawer from bottom */}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[90vh] max-h-[90vh]">
            <DrawerHeader className="border-b bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white">
              <DrawerTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                AI Sales Coach
                <Sparkles className="h-4 w-4 text-amber-300" />
              </DrawerTitle>
            </DrawerHeader>
            <CoachChatInterface onClose={handleClose} />
          </DrawerContent>
        </Drawer>
      ) : (
        /* Desktop: Sheet from right */
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="w-[450px] sm:w-[550px] p-0 flex flex-col">
            <SheetHeader className="border-b bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white p-4">
              <SheetTitle className="flex items-center gap-2 text-white">
                <GraduationCap className="h-5 w-5" />
                AI Sales Coach
                <Sparkles className="h-4 w-4 text-amber-300" />
              </SheetTitle>
            </SheetHeader>
            <CoachChatInterface onClose={handleClose} />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
});

CoachAvatar.displayName = 'CoachAvatar';
