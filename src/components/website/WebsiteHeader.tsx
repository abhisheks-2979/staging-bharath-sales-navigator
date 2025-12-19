import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import quickappLogo from "@/assets/quickapp-logo.png";

export const WebsiteHeader = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Solutions", href: "#solutions" },
    { label: "Platform", href: "#platform" },
    { label: "Industries", href: "#industries" },
    { label: "Why Us", href: "#why-us" },
  ];

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <img 
            src={quickappLogo} 
            alt="QuickApp.AI" 
            className="h-10 w-10 rounded-lg"
          />
          <div>
            <h1 className="text-xl font-bold text-foreground">QuickApp.AI</h1>
            <p className="text-[10px] text-muted-foreground">AI-Powered Field Sales Platform</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => navigate('/auth')}
            className="border-border"
          >
            Login
          </Button>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground shadow-button"
          >
            Request Demo
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background px-4 py-4 space-y-4">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
            <Button 
              variant="outline"
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Login
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground"
            >
              Request Demo
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
