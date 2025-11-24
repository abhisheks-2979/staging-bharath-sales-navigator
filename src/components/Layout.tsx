import { ReactNode, useEffect } from "react";
import { Navbar } from "./Navbar";
import { ChatWidget } from "./chat/ChatWidget";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import { SidebarProvider } from "@/components/ui/sidebar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { cacheAllMasterData, isOnline } = useMasterDataCache();

  // Auto-cache master data when online
  useEffect(() => {
    if (isOnline) {
      console.log('🔄 Layout: Caching master data...');
      cacheAllMasterData();
    }
  }, [isOnline]);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-gradient-subtle w-full flex">
        <Navbar />
        <main className="flex-1 pb-20">
          {children}
        </main>
        <ChatWidget />
      </div>
    </SidebarProvider>
  );
};