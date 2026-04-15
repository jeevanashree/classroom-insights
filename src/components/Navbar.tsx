import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const links = [{ to: "/", label: "Home" }, ...(user ? [{ to: "/reports", label: "Reports" }, { to: "/query", label: "AI Query" }] : [])];
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-bold text-foreground">🎓 Smart Classroom</Link>
          <div className="flex items-center gap-1">
            {links.map((link) => (<Link key={link.to} to={link.to} className={`px-3 py-1.5 rounded-md text-sm ${isActive(link.to) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>{link.label}</Link>))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground hidden sm:inline">{profile?.display_name} <span className="capitalize text-primary">({profile?.role})</span></span>
              <button onClick={signOut} className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted" title="Sign out"><LogOut className="h-4 w-4" /></button>
            </>
          ) : (<Link to="/login" className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">Sign In</Link>)}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
