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
      <main className="pb-20">
        {children}
      </main>
      <ChatWidget />
    </div>
  );
};