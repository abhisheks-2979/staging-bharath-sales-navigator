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
    <div className="min-h-screen bg-gradient-subtle w-full">
      <Navbar />
      {/* Main content area - pt-14 for navbar (h-12) + small gap */}
      <main 
        className="pt-14 pb-20" 
        style={{ 
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' 
        }}
      >
        {children}
      </main>
      <ChatWidget />
    </div>
  );
};