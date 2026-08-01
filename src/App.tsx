import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getPlatformSettings } from "@/services/settingsService";
import { useState, useEffect } from "react";
import { LocationProvider } from "@/contexts/LocationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import BackToTop from "@/components/BackToTop";
import CookieConsent from "@/components/CookieConsent";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const EmailConfirmation = lazy(() => import("./pages/EmailConfirmation"));
const RoomListings = lazy(() => import("./pages/RoomListings"));
const RoomDetail = lazy(() => import("./pages/RoomDetail"));
const MessListings = lazy(() => import("./pages/MessListings"));
const MessDetail = lazy(() => import("./pages/MessDetail"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StaticPage = lazy(() => import("./pages/StaticPage"));
const Maintenance = lazy(() => import("./pages/Maintenance"));

// Lazy load chatbot (heavy component)
const ChatBot = lazy(() => import("./components/chat/ChatBot"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background particles-bg">
    <div className="flex flex-col items-center gap-6 glass p-8 rounded-2xl animate-scale-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-full gradient-hero animate-spin-slow flex items-center justify-center">
          <div className="w-12 h-12 bg-background rounded-full" />
        </div>
        <div className="absolute inset-0 animate-glow rounded-full" />
      </div>
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p className="text-muted-foreground animate-text-reveal font-medium">Loading your experience...</p>
    </div>
  </div>
);

// Configure React Query for production
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { userRole } = useAuth();
  const [underMaintenance, setUnderMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const settings = await getPlatformSettings();
        if (settings?.maintenance_mode) {
          setUnderMaintenance(true);
        }
      } catch (err) {
        console.error("Error checking maintenance status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenance();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  const isAuthRoute = window.location.pathname === "/auth" || 
                      window.location.pathname === "/login" || 
                      window.location.pathname === "/register";

  if (underMaintenance && userRole !== "admin" && !isAuthRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Maintenance />
      </Suspense>
    );
  }

  return <>{children}</>;
};

const App = () => (
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <LocationProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Suspense fallback={<PageLoader />}>
                      <main id="main-content">
                        <MaintenanceGuard>
                          <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/login" element={<Auth />} />
                          <Route path="/register" element={<Auth />} />
                          <Route path="/email-confirmation" element={<EmailConfirmation />} />
                          <Route path="/rooms" element={<RoomListings />} />
                          <Route path="/rooms/:id" element={<RoomDetail />} />
                          <Route path="/room/:id" element={<RoomDetail />} />
                          <Route path="/mess" element={<MessListings />} />
                          <Route path="/messes" element={<MessListings />} />
                          <Route path="/messs" element={<MessListings />} />
                          <Route path="/mess/:id" element={<MessDetail />} />
                          <Route path="/dashboard" element={<UserDashboard />} />
                          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                          <Route path="/owner-dashboard" element={<OwnerDashboard />} />
                          <Route path="/admin/dashboard" element={<AdminDashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/notifications" element={<Notifications />} />
                          <Route path="/p/:slug" element={<StaticPage />} />
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </MaintenanceGuard>
                    </main>
                      {/* AI Chatbot - appears on all pages */}
                      <Suspense fallback={null}>
                        <ChatBot />
                      </Suspense>
                      {/* Premium UX Components */}
                      <BackToTop />
                      <CookieConsent />
                    </Suspense>
                  </BrowserRouter>
                </TooltipProvider>
              </LocationProvider>
            </AuthProvider>
          </QueryClientProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

export default App;
