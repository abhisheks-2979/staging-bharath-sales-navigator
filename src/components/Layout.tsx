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
    <div className="min-h-screen bg-gradient-subtle w-full flex flex-col safe-area-container">
      {/* Safe area top spacer - for status bar area */}
      <div className="safe-area-top-spacer" />
      
      <Navbar />
      <main className="flex-1 safe-area-main">
        {children}
      </main>
      
      {/* Safe area bottom spacer for navigation bar */}
      <div className="safe-area-bottom-spacer" />
      
      <ChatWidget />
    </div>
  );
};
