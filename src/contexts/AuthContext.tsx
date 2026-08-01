import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/config/adminConfig";
import { checkIsBlacklisted } from "@/services/fraudSafetyService";

type UserRole = "user" | "owner" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  isAdmin: boolean;
  signUp: (email: string, password: string, metadata: { first_name: string; last_name: string; role: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  stopImpersonating?: () => void;
  isImpersonating?: boolean;
  impersonatorName?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = useState<any | null>(null);
  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const checkImpersonation = async () => {
      const impId = localStorage.getItem("impersonated_user_id");
      if (impId) {
        try {
          const { data, error } = await (supabase as any)
            .from("profiles")
            .select("*")
            .eq("user_id", impId)
            .maybeSingle();

          if (!error && data) {
            setImpersonatedUser({
              id: data.user_id,
              email: data.phone || "impersonated@example.com",
              user_metadata: {
                first_name: data.first_name,
                last_name: data.last_name,
              }
            });
            setImpersonatedRole(data.role as UserRole || "user");
          }
        } catch (e) {
          console.error("Error setting impersonation:", e);
        }
      } else {
        setImpersonatedUser(null);
        setImpersonatedRole(null);
      }
    };

    checkImpersonation();
  }, [user]);

  const stopImpersonating = () => {
    localStorage.removeItem("impersonated_user_id");
    localStorage.removeItem("impersonated_user_name");
    setImpersonatedUser(null);
    setImpersonatedRole(null);
    window.location.href = "/admin"; // Redirect back to admin dashboard
  };

  // Check if current user is a predefined admin
  const isAdmin = impersonatedUser 
    ? (impersonatedRole === "admin") 
    : (user?.email ? isAdminEmail(user.email) : false);

  const fetchUserRole = async (userId: string, email: string | undefined) => {
    // If user email is in predefined admin list, set role to admin and sync to profile
    if (email && isAdminEmail(email)) {
      console.log('👑 Admin user detected:', email);
      setUserRole('admin');
      try {
        await (supabase as any)
          .from("profiles")
          .update({ role: "admin", last_active_at: new Date().toISOString() })
          .eq("user_id", userId);
      } catch (err) {
        console.warn("Could not sync admin role to database profile:", err);
      }
      return;
    }

    try {
      const { data: profile, error: profileErr } = await (supabase as any)
        .from("profiles")
        .select("is_banned, status, token_version, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profileErr && profile) {
        // Update last_active_at for active session tracking
        (supabase as any)
          .from("profiles")
          .update({ last_active_at: new Date().toISOString() })
          .eq("user_id", userId)
          .then();

        // Check ban/suspension status
        if (profile.is_banned || profile.status === "suspended" || profile.status === "banned") {
          console.warn("🚫 Suspended/Banned user detected:", email);
          alert("Your account has been suspended or banned by the administrator.");
          await supabase.auth.signOut();
          return;
        }

        // Check token version for force logout
        if (profile.token_version !== undefined && profile.token_version !== null) {
          const storedVersion = localStorage.getItem(`token_version_${userId}`);
          if (storedVersion && parseInt(storedVersion) !== profile.token_version) {
            console.warn("🔄 Force logout triggered (token version mismatch)");
            localStorage.removeItem(`token_version_${userId}`);
            alert("Your session has been invalidated by the administrator. Please log in again.");
            await supabase.auth.signOut();
            return;
          }
          localStorage.setItem(`token_version_${userId}`, profile.token_version.toString());
        }

        // Check role
        if (profile.role) {
          setUserRole(profile.role as UserRole);
          return;
        }
      }
    } catch (e) {
      console.warn("Unable to check profile/ban status:", e);
    }

    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!error && data) {
          setUserRole(data.role as UserRole);
        } else {
          setUserRole('user');
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole('user');
      }
    }, 0);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          fetchUserRole(session.user.id, session.user.email);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchUserRole(session.user.id, session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata: { first_name: string; last_name: string; role: string }
  ) => {
    // Check blacklist before allowing registration
    const isBlocked = await checkIsBlacklisted(email);
    if (isBlocked) {
      return { error: new Error("Account registration blocked: Your email is blacklisted due to safety violations.") };
    }

    // Use VITE_SITE_URL for production, or fall back to window.location.origin
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const redirectUrl = `${siteUrl}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });

    // Sign out immediately after signup so user sees the confirmation page
    // instead of being auto-logged in (Supabase auto-logs in if email confirm is disabled)
    if (!error && data.session) {
      await supabase.auth.signOut();
    }

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase signOut error:", err);
    }
    // Force clear local state
    setSession(null);
    setUser(null);
    setUserRole(null);
    // Find and remove any Supabase auth keys from localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase.auth"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (localErr) {
      console.error("Error clearing local storage auth keys:", localErr);
    }
  };

  const resetPassword = async (email: string) => {
    // Use VITE_SITE_URL for production, or fall back to window.location.origin
    // Make sure to set VITE_SITE_URL in Vercel environment variables
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const redirectUrl = `${siteUrl}/auth?mode=reset`;

    console.log('Password reset redirect URL:', redirectUrl);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error: error as Error | null };
  };

  const activeUser = impersonatedUser || user;
  const activeRole = impersonatedRole || userRole;
  const isImpersonating = !!impersonatedUser;
  const impersonatorName = isImpersonating ? localStorage.getItem("impersonated_user_name") : null;

  return (
    <AuthContext.Provider value={{ 
      user: activeUser, 
      session, 
      loading, 
      userRole: activeRole, 
      isAdmin, 
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut, 
      resetPassword, 
      updatePassword,
      stopImpersonating,
      isImpersonating,
      impersonatorName
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
