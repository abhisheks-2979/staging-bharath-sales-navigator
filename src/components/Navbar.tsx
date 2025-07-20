import { Home, Calendar, Users, BarChart, Menu } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Calendar, label: "My Visits", href: "/visits" },
    { icon: Users, label: "Retailers", href: "/retailers" },
    { icon: BarChart, label: "Reports", href: "/reports" }
  ];

  return (
    <nav className="bg-gradient-primary text-primary-foreground shadow-lg relative z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold">BB</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Bharath Beverages</h1>
              <p className="text-xs opacity-80">Field Sales App</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isOpen && (
          <div className="mt-4 pt-4 border-t border-primary-foreground/20">
            <div className="grid grid-cols-4 gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) => `
                    flex flex-col items-center p-3 rounded-lg transition-colors
                    ${isActive ? 'bg-primary-foreground/20' : 'hover:bg-primary-foreground/10'}
                  `}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon size={20} className="mb-1" />
                  <span className="text-xs">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};