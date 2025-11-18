import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { ChatWidget } from "./chat/ChatWidget";
import { OfflineModeBanner } from "./OfflineModeBanner";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      <main className="pb-20">
        <div className="container mx-auto px-4 py-2">
          <OfflineModeBanner />
        </div>
        {children}
      </main>
      <ChatWidget />
    </div>
  );
};