import { ReactNode, useEffect } from "react";
import { Navbar } from "./Navbar";
import { ChatWidget } from "./chat/ChatWidget";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { cacheAllMasterData, isOnline } = useMasterDataCache();
  const { processSyncQueue } = useOfflineSync();

  // Auto-cache master data when online
  useEffect(() => {
    if (isOnline) {
      console.log('🔄 Layout: Caching master data...');
      cacheAllMasterData();
      // Also trigger sync when online
      processSyncQueue();
    }
  }, [isOnline, cacheAllMasterData, processSyncQueue]);

  return (
    <div className="min-h-screen bg-gradient-subtle w-full flex flex-col">
      {/* Safe area top spacer - covers status bar with primary color, always fixed at top */}
      <div 
        className="fixed top-0 left-0 right-0 z-[9999]"
        style={{ 
          height: 'env(safe-area-inset-top, 0px)',
          backgroundColor: 'hsl(var(--primary))'
        }}
      />
      
      <Navbar />
      <main className="flex-1 safe-area-main">
        {children}
      </main>
      
      {/* Safe area bottom spacer for navigation bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[9999]"
        style={{ 
          height: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'hsl(var(--background))'
        }}
      />
      
      <ChatWidget />
    </div>
  );
};
