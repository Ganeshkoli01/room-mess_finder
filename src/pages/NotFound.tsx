import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft, MapPin, Building2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import logger from "@/lib/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Log 404 errors for monitoring
    logger.warn(`404 Error: Page not found`, {
      context: 'NotFound',
      data: { path: location.pathname }
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 hero-animated-bg opacity-5" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-blob blob-2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-lg w-full text-center relative z-10"
      >
        {/* 404 Illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative mb-8"
        >
          <div className="text-[180px] font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent leading-none select-none">
            404
          </div>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <div className="w-24 h-24 rounded-full glass flex items-center justify-center animate-glow">
              <MapPin className="w-12 h-12 text-primary" />
            </div>
          </motion.div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-heading">
            Oops! Looks like you're lost
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
            The page you're looking for has moved to a new location (pun intended! 😄).
            Let us help you find your way back.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <Button asChild size="lg" className="gap-2 btn-shine">
            <Link to="/">
              <Home className="w-5 h-5" />
              Go to Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 btn-hover-grow">
            <Link to="/rooms">
              <Search className="w-5 h-5" />
              Find Rooms
            </Link>
          </Button>
        </motion.div>

        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Go back to previous page
        </motion.button>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-12 pt-8 border-t border-border/50"
        >
          <p className="text-sm text-muted-foreground mb-6">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/rooms"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Find Rooms</span>
            </Link>
            <Link
              to="/mess"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all group"
            >
              <UtensilsCrossed className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Find Mess</span>
            </Link>
            <Link
              to="/auth"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <span className="text-sm font-medium">Login / Sign Up</span>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
