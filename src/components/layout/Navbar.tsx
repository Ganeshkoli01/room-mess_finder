import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  X,
  Home,
  Building2,
  UtensilsCrossed,
  User,
  LogIn,
  LogOut,
  LayoutDashboard,
  Heart,
  Scale,
  Search
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import ComparisonTool, { getCompareItems } from "@/components/ComparisonTool";
import NotificationCenter from "@/components/NotificationCenter";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import { getFavorites } from "@/services/recommendationsService";
import { useLanguage } from "@/contexts/LanguageContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [compareCount, setCompareCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { t } = useLanguage();

  // Update counts on mount and after navigation
  useEffect(() => {
    const updateCounts = () => {
      setFavoritesCount(getFavorites().length);
      setCompareCount(getCompareItems().length);
    };

    updateCounts();

    // Listen for storage changes (for cross-tab updates)
    window.addEventListener("storage", updateCounts);

    // Also update on focus (for same-tab updates)
    window.addEventListener("focus", updateCounts);

    return () => {
      window.removeEventListener("storage", updateCounts);
      window.removeEventListener("focus", updateCounts);
    };
  }, [location]);

  const navLinks = [
    { path: "/", labelKey: "nav.home", icon: Home },
    { path: "/rooms", labelKey: "nav.rooms", icon: Building2 },
    { path: "/mess", labelKey: "nav.mess", icon: UtensilsCrossed },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getDashboardPath = () => {
    if (userRole === "admin") return "/admin/dashboard";
    if (userRole === "owner") return "/owner/dashboard";
    return "/dashboard";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-md group-hover:animate-wiggle transition-all duration-300 group-hover:shadow-glow">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl text-foreground">
                Room<span className="text-primary animate-gradient-flow">&#x26;</span>Mess
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${isActive(link.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                >
                  <link.icon className="w-4 h-4" />
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-2">
              {/* Compare Button */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setShowCompare(true)}
              >
                <Scale className="w-5 h-5" />
                {compareCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                  >
                    {compareCount}
                  </Badge>
                )}
              </Button>

              {/* Favorites Button */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setShowFavorites(true)}
              >
                <Heart className="w-5 h-5" />
                {favoritesCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                  >
                    {favoritesCount}
                  </Badge>
                )}
              </Button>

              {/* Notification Center */}
              <NotificationCenter />

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Language Selector */}
              <LanguageSelector />

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold text-sm">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="max-w-[150px] truncate">{user.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate(getDashboardPath())} className="gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2">
                      <User className="w-4 h-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowFavorites(true)} className="gap-2">
                      <Heart className="w-4 h-4" />
                      My Favorites
                      {favoritesCount > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {favoritesCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" className="gap-2">
                      <LogIn className="w-4 h-4" />
                      Login
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="default">Get Started</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {/* Mobile Favorites */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setShowFavorites(true)}
              >
                <Heart className="w-5 h-5" />
                {favoritesCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {favoritesCount}
                  </Badge>
                )}
              </Button>

              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-border animate-fade-in">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3 ${isActive(link.path)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                    <link.icon className="w-5 h-5" />
                    {t(link.labelKey)}
                  </Link>
                ))}

                {/* Compare in mobile */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowCompare(true);
                  }}
                  className="px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Scale className="w-5 h-5" />
                  Compare
                  {compareCount > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {compareCount}
                    </Badge>
                  )}
                </button>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                  {user ? (
                    <>
                      <Link to={getDashboardPath()} onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Button>
                      </Link>
                      <Button variant="ghost" className="w-full gap-2 text-destructive" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full gap-2">
                          <LogIn className="w-4 h-4" />
                          Login
                        </Button>
                      </Link>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <Button variant="default" className="w-full">Get Started</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Favorites Drawer */}
      <FavoritesDrawer
        isOpen={showFavorites}
        onClose={() => {
          setShowFavorites(false);
          setFavoritesCount(getFavorites().length);
        }}
      />

      {/* Comparison Tool */}
      <ComparisonTool
        isOpen={showCompare}
        onClose={() => {
          setShowCompare(false);
          setCompareCount(getCompareItems().length);
        }}
      />
    </>
  );
};

export default Navbar;
