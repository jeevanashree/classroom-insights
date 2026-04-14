import { Link, useLocation } from "react-router-dom";
import { BarChart3, FileText, MessageSquare, Home as HomeIcon } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/query", label: "Query", icon: MessageSquare },
];

const Navbar = () => {
  const location = useLocation();

  // Hide navbar inside meeting rooms
  if (location.pathname.startsWith("/meeting/")) return null;

  return (
    <nav className="border-b bg-card px-6 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
          <BarChart3 className="h-6 w-6" />
          Smart Classroom
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
