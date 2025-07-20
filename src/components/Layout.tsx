import { ReactNode } from "react";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      <main className="pb-20">
        {children}
      </main>
    </div>
  );
};