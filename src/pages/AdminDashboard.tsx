import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  UtensilsCrossed,
  Users,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Check,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  User,
  X,
  Save,
  Star,
  Flag,
  AlertOctagon,
  Clock,
  Calendar,
  CreditCard,
  Settings,
  Download,
  RefreshCw,
  DollarSign,
  Mail,
  MessageSquare,
  UserMinus,
  Coins,
  MapPin,
  Navigation,
  ExternalLink
} from "lucide-react";
import { geocodeAddress, reverseGeocode } from "@/services/placesService";
import { supabase as rawSupabase } from "@/integrations/supabase/client";
const supabase = rawSupabase as any;
import {
  getReports,
  resolveReport,
  getReviews,
  updateReviewStatus,
  editReview,
  deleteReview,
  banUser,
  Report as ModerationReport,
  Review as ModerationReview
} from "@/services/moderationService";
import { isAdminEmail, ADMIN_EMAILS } from "@/config/adminConfig";
import { uploadListingImage } from "@/services/uploadService";
import {
  forceUpdateBookingStatus,
  refundRazorpayPayment,
  getCommissionSettings,
  updateCommissionSettings,
  getPaymentHistory
} from "@/services/paymentService";
import {
  getAdminUserProfile,
  updateAdminUserProfile,
  logImpersonationEvent,
  getImpersonationLogs
} from "@/services/profileService";
import {
  getPlatformSettings,
  updatePlatformSettings,
  getAllStaticPages,
  updateStaticPage,
  getAllNotificationTemplates,
  updateNotificationTemplate,
  StaticPage as CMSStaticPage,
  NotificationTemplate as DBNotificationTemplate
} from "@/services/settingsService";
import { TimeSeriesChart } from "@/components/analytics/TimeSeriesChart";
import {
  fetchSignupsOverTime,
  fetchListingsOverTime,
  fetchBookingsOverTime,
  fetchRevenueByPeriod,
  fetchTopSearchedCities,
  fetchActiveSessionsCount,
  TimeSeriesPoint,
  RevenuePoint,
  TopCityPoint
} from "@/services/analyticsService";
import { SystemTechnicalControls } from "@/components/admin/SystemTechnicalControls";
import { FraudSafetyPanel } from "@/components/admin/FraudSafetyPanel";


interface RoomListing {
  id: string;
  title: string;
  description?: string;
  location: string;
  address?: string;
  city?: string;
  price: number;
  room_type: string;
  facilities: string[];
  is_active: boolean;
  is_verified: boolean;
  owner_id: string;
  images?: string[];
  created_at: string;
  owner_name?: string;
  owner_email?: string;
  status?: "pending" | "approved" | "rejected" | "suspended" | "expired";
  rejection_reason?: string;
  is_featured?: boolean;
  featured_until?: string;
  expires_at?: string;
  flagged?: boolean;
  latitude?: number;
  longitude?: number;
}

interface MessListing {
  id: string;
  name: string;
  description?: string;
  location: string;
  address?: string;
  city?: string;
  price_per_month: number;
  food_type: string;
  timings?: string;
  menu_highlights: string[];
  is_active: boolean;
  is_verified: boolean;
  owner_id: string;
  images?: string[];
  created_at: string;
  owner_name?: string;
  owner_email?: string;
  status?: "pending" | "approved" | "rejected" | "suspended" | "expired";
  rejection_reason?: string;
  is_featured?: boolean;
  featured_until?: string;
  expires_at?: string;
  flagged?: boolean;
  weekly_menu?: any;
  latitude?: number;
  longitude?: number;
}

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  status: "active" | "suspended" | "banned";
  shadow_banned: boolean;
  token_version: number;
  is_verified: boolean;
  last_login?: string;
  is_banned?: boolean;
  phone?: string;
}

interface AdminBooking {
  id: string;
  bookingId?: string;
  paymentId?: string;
  transactionId?: string;
  orderId?: string;
  amount: number;
  currency: string;
  listingId: string;
  listingTitle: string;
  listingType: "room" | "mess";
  planType: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  ownerName?: string;
  ownerPhone?: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  timestamp?: string;
  override_reason?: string;
  refunded_amount?: number;
  city?: string;
}

const AdminDashboard = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [allRooms, setAllRooms] = useState<RoomListing[]>([]);
  const [allMess, setAllMess] = useState<MessListing[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMess, setLoadingMess] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Search
  const [roomSearch, setRoomSearch] = useState("");
  const [messSearch, setMessSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Edit modal states
  const [editingRoom, setEditingRoom] = useState<RoomListing | null>(null);
  const [editingMess, setEditingMess] = useState<MessListing | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk actions & Status controls states
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedMessIds, setSelectedMessIds] = useState<string[]>([]);
  const [rejectionModal, setRejectionModal] = useState<{ type: "room" | "mess"; id: string; email: string; title: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null);

  // Bookings & Payments (Phase 3) states
  const [allBookings, setAllBookings] = useState<AdminBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionCategoryFilter, setTransactionCategoryFilter] = useState<"all" | "room" | "mess">("all");
  const [commissionRate, setCommissionRate] = useState(10.0);
  const [savingSettings, setSavingSettings] = useState(false);

  // Phase 5 Content & Site Settings states
  const [homepageBanners, setHomepageBanners] = useState<string[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [featuredCities, setFeaturedCities] = useState<string[]>([]);
  const [newCityName, setNewCityName] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Phase 6 states
  const [featuredListingPrice, setFeaturedListingPrice] = useState(500);
  const [referralRewardAmount, setReferralRewardAmount] = useState(100);
  const [minRentPrice, setMinRentPrice] = useState(500);
  const [maxRentPrice, setMaxRentPrice] = useState(100000);
  
  const [cmsPages, setCmsPages] = useState<CMSStaticPage[]>([]);
  const [editingCmsSlug, setEditingCmsSlug] = useState<string | null>(null);
  const [cmsTitleInput, setCmsTitleInput] = useState("");
  const [cmsContentInput, setCmsContentInput] = useState("");
  const [savingCms, setSavingCms] = useState(false);

  const [notifTemplates, setNotifTemplates] = useState<DBNotificationTemplate[]>([]);
  const [editingTemplateName, setEditingTemplateName] = useState<string | null>(null);
  const [templateSubjectInput, setTemplateSubjectInput] = useState("");
  const [templateBodyInput, setTemplateBodyInput] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [bookingFilters, setBookingFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    city: ""
  });
  const [overrideModal, setOverrideModal] = useState<{ booking: AdminBooking; action: "confirm" | "cancel" } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [refundingBookingId, setRefundingBookingId] = useState<string | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [showClearTxConfirm, setShowClearTxConfirm] = useState(false);
  const [showClearBkConfirm, setShowClearBkConfirm] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState<any | null>(null);

  // Phase 2 - User Management states
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserItem | null>(null);
  const [userRoleConfirm, setUserRoleConfirm] = useState<{ userId: string; newRole: string; email: string } | null>(null);
  const [userResetPasswordUrl, setUserResetPasswordUrl] = useState<string | null>(null);
  const [performingAdminAction, setPerformingAdminAction] = useState(false);

  // Reviews & Reports (Phase 4) states
  const [allReports, setAllReports] = useState<ModerationReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [allReviews, setAllReviews] = useState<ModerationReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewFilters, setReviewFilters] = useState({ status: "all", rating: "all" });
  const [editingReview, setEditingReview] = useState<ModerationReview | null>(null);
  const [editReviewComment, setEditReviewComment] = useState("");
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [savingReview, setSavingReview] = useState(false);
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  // Analytics States (Phase 17)
  const [signupsDays, setSignupsDays] = useState(30);
  const [signupsData, setSignupsData] = useState<TimeSeriesPoint[]>([]);
  const [listingsDays, setListingsDays] = useState(30);
  const [listingsData, setListingsData] = useState<TimeSeriesPoint[]>([]);
  const [bookingsDays, setBookingsDays] = useState(30);
  const [bookingsData, setBookingsData] = useState<TimeSeriesPoint[]>([]);
  const [revenuePeriod, setRevenuePeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [topCitiesData, setTopCitiesData] = useState<TopCityPoint[]>([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Analytics Loaders
  const loadSignupsData = async (days: number) => {
    setSignupsDays(days);
    const data = await fetchSignupsOverTime(days);
    setSignupsData(data);
  };

  const loadListingsData = async (days: number) => {
    setListingsDays(days);
    const data = await fetchListingsOverTime(days);
    setListingsData(data);
  };

  const loadBookingsData = async (days: number) => {
    setBookingsDays(days);
    const data = await fetchBookingsOverTime(days);
    setBookingsData(data);
  };

  const loadRevenueData = async (period: "day" | "week" | "month" | "year") => {
    setRevenuePeriod(period);
    const data = await fetchRevenueByPeriod(period);
    setRevenueData(data);
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const [signups, listings, bookings, revenue, cities, active] = await Promise.all([
        fetchSignupsOverTime(signupsDays),
        fetchListingsOverTime(listingsDays),
        fetchBookingsOverTime(bookingsDays),
        fetchRevenueByPeriod(revenuePeriod),
        fetchTopSearchedCities(10),
        fetchActiveSessionsCount()
      ]);
      setSignupsData(signups);
      setListingsData(listings);
      setBookingsData(bookings);
      setRevenueData(revenue);
      setTopCitiesData(cities);
      setActiveSessionsCount(active);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalytics();
    }
  }, [activeTab]);

  // Stats
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalMess: 0,
    totalUsers: 0,
    verifiedRooms: 0,
    verifiedMess: 0,
    activeRooms: 0,
    activeMess: 0,
    totalOwners: 0,
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (userRole === "owner") {
        navigate("/owner/dashboard");
      } else if (userRole === "user") {
        navigate("/dashboard");
      }
    }
  }, [user, userRole, authLoading, navigate]);

  const autoExpireStaleListings = async () => {
    try {
      const nowIso = new Date().toISOString();
      await supabase
        .from("rooms")
        .update({ status: "expired" })
        .lt("expires_at", nowIso)
        .neq("status", "expired");

      await supabase
        .from("mess")
        .update({ status: "expired" })
        .lt("expires_at", nowIso)
        .neq("status", "expired");
    } catch (err) {
      console.error("Error auto-expiring stale listings:", err);
    }
  };

  // Fetch Phase 5 Settings, CMS pages, and templates
  const fetchSiteSettingsData = async () => {
    try {
      const settings = await getPlatformSettings();
      if (settings) {
        setHomepageBanners(settings.homepage_banners || []);
        setFeaturedCities(settings.featured_cities || []);
        setMaintenanceMode(settings.maintenance_mode || false);
        setFeaturedListingPrice(settings.featured_listing_price ?? 500);
        setReferralRewardAmount(settings.referral_reward_amount ?? 100);
        setMinRentPrice(settings.min_rent_price ?? 500);
        setMaxRentPrice(settings.max_rent_price ?? 100000);
      }
      
      const pages = await getAllStaticPages();
      setCmsPages(pages);
      
      const templates = await getAllNotificationTemplates();
      setNotifTemplates(templates);
    } catch (err) {
      console.error("Error loading site settings / CMS data:", err);
    }
  };

  useEffect(() => {
    if (user) {
      const loadAllData = async () => {
        await autoExpireStaleListings();
        fetchAllRooms();
        fetchAllMess();
        fetchAllUsers();
        fetchBookingsData();
        fetchTransactionsData();
        loadCommissionRate();
        fetchReportsData();
        fetchReviewsData();
        fetchSiteSettingsData();
      };
      loadAllData();
    }
  }, [user]);

  // Fetch all rooms with owner details
  const fetchAllRooms = async () => {
    setLoadingRooms(true);
    try {
      // Fetch rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false });

      if (roomsError) throw roomsError;

      // Fetch profiles to get owner names (profiles.user_id links to rooms.owner_id)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone");

      // Map owner info to rooms
      const roomsWithOwners = (roomsData || []).map(room => {
        const owner = profilesData?.find(p => p.user_id === room.owner_id);
        const ownerName = owner
          ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || "Owner"
          : "Unknown";
        return {
          ...room,
          owner_name: ownerName,
          owner_email: owner?.phone || room.owner_id?.substring(0, 8) + "...",
        };
      });

      setAllRooms(roomsWithOwners);
      setStats(prev => ({
        ...prev,
        totalRooms: roomsData?.length || 0,
        verifiedRooms: roomsData?.filter(r => r.is_verified).length || 0,
        activeRooms: roomsData?.filter(r => r.is_active).length || 0,
      }));
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast({ title: "Error fetching rooms", variant: "destructive" });
    } finally {
      setLoadingRooms(false);
    }
  };

  // Fetch all mess with owner details
  const fetchAllMess = async () => {
    setLoadingMess(true);
    try {
      const { data: messData, error: messError } = await supabase
        .from("mess")
        .select("*")
        .order("created_at", { ascending: false });

      if (messError) throw messError;

      // Fetch profiles (profiles.user_id links to mess.owner_id)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone");

      // Map owner info to mess
      const messWithOwners = (messData || []).map(mess => {
        const owner = profilesData?.find(p => p.user_id === mess.owner_id);
        const ownerName = owner
          ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || "Owner"
          : "Unknown";
        return {
          ...mess,
          owner_name: ownerName,
          owner_email: owner?.phone || mess.owner_id?.substring(0, 8) + "...",
        };
      });

      setAllMess(messWithOwners);
      setStats(prev => ({
        ...prev,
        totalMess: messData?.length || 0,
        verifiedMess: messData?.filter(m => m.is_verified).length || 0,
        activeMess: messData?.filter(m => m.is_active).length || 0,
      }));
    } catch (error) {
      console.error("Error fetching mess:", error);
      toast({ title: "Error fetching mess", variant: "destructive" });
    } finally {
      setLoadingMess(false);
    }
  };

  // Fetch all users (profiles + user_roles + admin detection from config)
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      console.log("≡ƒöì Fetching all users...");

      // Get all profiles first - this is the primary source of users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone, created_at")
        .order("created_at", { ascending: false });

      console.log("≡ƒæñ Profiles data:", profilesData);
      console.log("≡ƒæñ Profiles count:", profilesData?.length || 0);

      if (profilesError) {
        console.error("Γ¥î Error fetching profiles:", profilesError);
      }

      // Get user roles - may be limited by RLS
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");

      console.log("≡ƒôï Roles data:", rolesData);
      console.log("≡ƒôï Roles count:", rolesData?.length || 0);

      if (rolesError) {
        console.error("Γ¥î Error fetching roles:", rolesError);
      }

      // Create a map of user_id to role from the database
      const roleMap = new Map<string, string>();
      (rolesData || []).forEach(r => {
        if (r.user_id) {
          roleMap.set(r.user_id, r.role);
        }
      });

      // Build users list from profiles
      const usersWithRoles: UserItem[] = (profilesData || []).map((profile: any) => {
        const userId = profile.user_id;
        // Phone might contain email for some profiles
        const phoneOrEmail = profile.phone || "";

        // Determine role with priority:
        // 1. Check if phone (which might be email) is in predefined admin list
        // 2. Check database role
        // 3. Default to "user"
        let role = "user";

        // Check if this user is a predefined admin (by checking phone field which may contain email)
        if (phoneOrEmail && isAdminEmail(phoneOrEmail)) {
          role = "admin";
          console.log(`≡ƒææ Admin detected from config: ${phoneOrEmail}`);
        } else if (userId && roleMap.has(userId)) {
          // Get role from database
          role = roleMap.get(userId) || "user";
          console.log(`≡ƒôï Role from database for ${profile.first_name}: ${role}`);
        }

        return {
          id: userId || "",
          email: phoneOrEmail || userId?.substring(0, 8) + "...",
          full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "User",
          role: role,
          created_at: profile.created_at,
        };
      });

      // Sort by role priority (admin first, then owner, then user)
      usersWithRoles.sort((a, b) => {
        const rolePriority: Record<string, number> = { admin: 0, owner: 1, user: 2 };
        return (rolePriority[a.role] ?? 2) - (rolePriority[b.role] ?? 2);
      });

      console.log("≡ƒæÑ Final users list:", usersWithRoles);
      console.log("≡ƒææ Admins count:", usersWithRoles.filter(u => u.role === "admin").length);
      console.log("≡ƒÅá Owners count:", usersWithRoles.filter(u => u.role === "owner").length);
      console.log("≡ƒæñ Users count:", usersWithRoles.filter(u => u.role === "user").length);

      setAllUsers(usersWithRoles);
      setStats(prev => ({
        ...prev,
        totalUsers: usersWithRoles.length,
        totalOwners: usersWithRoles.filter(u => u.role === "owner").length,
      }));
    } catch (error) {
      console.error("Γ¥î Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Phase 2 - User Management actions
  const changeUserRole = (userId: string, newRole: string) => {
    const targetUser = allUsers.find(u => u.id === userId);
    setUserRoleConfirm({ userId, newRole, email: targetUser?.email || "User" });
  };

  const executeRoleChange = async () => {
    if (!userRoleConfirm) return;
    setPerformingAdminAction(true);
    try {
      // 1. Update profiles table role
      const ok = await updateAdminUserProfile(userRoleConfirm.userId, { role: userRoleConfirm.newRole as any });
      if (!ok) throw new Error("Failed to update profile role in profiles table");

      // 2. Update user_roles table if it exists (for retro-compatibility)
      try {
        // Delete existing role first to avoid unique constraint issues
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userRoleConfirm.userId);

        // Insert new role
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: userRoleConfirm.userId, role: userRoleConfirm.newRole });

        if (roleErr) console.warn("Could not sync user_roles table:", roleErr.message);
      } catch (err) {
        console.warn("user_roles table update error:", err);
      }

      toast({ title: "Role updated successfully ✓", description: `Updated ${userRoleConfirm.email} to ${userRoleConfirm.newRole}.` });
      fetchAllUsers();
      
      // Update selectedUserForDetails if open
      if (selectedUserForDetails && selectedUserForDetails.id === userRoleConfirm.userId) {
        setSelectedUserForDetails(prev => prev ? { ...prev, role: userRoleConfirm.newRole } : null);
      }
    } catch (err: any) {
      toast({ title: "Error updating role", description: err.message, variant: "destructive" });
    } finally {
      setPerformingAdminAction(false);
      setUserRoleConfirm(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string, action: "suspend" | "ban" | "activate") => {
    setPerformingAdminAction(true);
    try {
      let nextStatus: "active" | "suspended" | "banned" = "active";
      let isBannedVal = false;

      if (action === "suspend") {
        nextStatus = "suspended";
        isBannedVal = true;
      } else if (action === "ban") {
        nextStatus = "banned";
        isBannedVal = true;
      }

      const ok = await updateAdminUserProfile(userId, { status: nextStatus, is_banned: isBannedVal });
      if (!ok) throw new Error("Failed to update status in profiles table");

      toast({ title: `User ${action}ed successfully ✓` });
      fetchAllUsers();

      // Update selectedUserForDetails if open
      if (selectedUserForDetails && selectedUserForDetails.id === userId) {
        setSelectedUserForDetails(prev => prev ? { ...prev, status: nextStatus } : null);
      }
    } catch (err: any) {
      toast({ title: "Error changing user status", description: err.message, variant: "destructive" });
    } finally {
      setPerformingAdminAction(false);
    }
  };

  const handleToggleShadowBan = async (userId: string, currentShadowBanned: boolean) => {
    setPerformingAdminAction(true);
    try {
      const ok = await updateAdminUserProfile(userId, { shadow_banned: !currentShadowBanned });
      if (!ok) throw new Error("Failed to update shadow_banned status");

      toast({ title: !currentShadowBanned ? "User shadow-banned successfully ✓" : "User shadow-ban lifted successfully ✓" });
      fetchAllUsers();

      // Update selectedUserForDetails if open
      if (selectedUserForDetails && selectedUserForDetails.id === userId) {
        setSelectedUserForDetails(prev => prev ? { ...prev, shadow_banned: !currentShadowBanned } : null);
      }
    } catch (err: any) {
      toast({ title: "Error updating shadow ban", description: err.message, variant: "destructive" });
    } finally {
      setPerformingAdminAction(false);
    }
  };

  const handleToggleUserVerified = async (userId: string, currentVerified: boolean) => {
    setPerformingAdminAction(true);
    try {
      const ok = await updateAdminUserProfile(userId, { is_verified: !currentVerified });
      if (!ok) throw new Error("Failed to update identity verification status");

      toast({ title: !currentVerified ? "Identity verified successfully ✓" : "Identity verification removed ✓" });
      fetchAllUsers();

      // Update selectedUserForDetails if open
      if (selectedUserForDetails && selectedUserForDetails.id === userId) {
        setSelectedUserForDetails(prev => prev ? { ...prev, is_verified: !currentVerified } : null);
      }
    } catch (err: any) {
      toast({ title: "Error updating verification status", description: err.message, variant: "destructive" });
    } finally {
      setPerformingAdminAction(false);
    }
  };

  const handleForceUserLogout = async (userId: string, currentTokenVersion: number) => {
    setPerformingAdminAction(true);
    try {
      const nextVersion = (currentTokenVersion || 1) + 1;
      const ok = await updateAdminUserProfile(userId, { token_version: nextVersion });
      if (!ok) throw new Error("Failed to increment token version");

      toast({ title: "User session invalidated successfully ✓", description: "User will be logged out on their next action." });
      fetchAllUsers();

      // Update selectedUserForDetails if open
      if (selectedUserForDetails && selectedUserForDetails.id === userId) {
        setSelectedUserForDetails(prev => prev ? { ...prev, token_version: nextVersion } : null);
      }
    } catch (err: any) {
      toast({ title: "Error forcing logout", description: err.message, variant: "destructive" });
    } finally {
      setPerformingAdminAction(false);
    }
  };

  const handleTriggerPasswordReset = async (userId: string, email: string) => {
    setPerformingAdminAction(true);
    try {
      // In a real application we would use supabase.auth.admin.generateLink or similar.
      // Since it's client-side, we simulate a secure reset token link generation.
      const simulatedToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const siteUrl = window.location.origin;
      const resetLink = `${siteUrl}/auth?reset_token=${simulatedToken}&email=${encodeURIComponent(email)}`;
      
      setUserResetPasswordUrl(resetLink);
      toast({ title: "Password reset link generated! ✓", description: "Admin can share this reset link directly with the user." });
    } catch (err: any) {
      toast({ title: "Error generating password reset", description: err.message, variant: "destructive" });
    } finally {
      setPerformingAdminAction(false);
    }
  };

  const handleImpersonateUser = async (targetUserId: string, targetName: string) => {
    if (!user) return;
    setPerformingAdminAction(true);
    try {
      const logged = await logImpersonationEvent(user.id, targetUserId);
      if (!logged) console.warn("Failed to log impersonation event into audit database");

      // Save impersonated user state to localStorage and force reload
      localStorage.setItem("impersonated_user_id", targetUserId);
      localStorage.setItem("impersonated_user_name", targetName);
      
      toast({ title: `Impersonating ${targetName} ✓`, description: "Redirecting you to home page as this user..." });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (err: any) {
      toast({ title: "Error launching impersonation", description: err.message, variant: "destructive" });
    } finally {
      setPerformingAdminAction(false);
    }
  };

  // Fetch platform settings / commission rate
  const loadCommissionRate = async () => {
    try {
      const rate = await getCommissionSettings();
      setCommissionRate(rate);
    } catch (err) {
      console.error("Error loading commission rate:", err);
    }
  };

  // Fetch all bookings from local storage + Supabase
  const fetchBookingsData = async () => {
    setLoadingBookings(true);
    try {
      // 1. Fetch room bookings and subscriptions from local storage
      const localRoomBookings = JSON.parse(localStorage.getItem("rm_bookings") || "[]");
      const localMessSubs = JSON.parse(localStorage.getItem("rm_subscriptions") || "[]");

      // Map local room bookings to AdminBooking type
      const mappedRooms = localRoomBookings.map((b: any) => ({
        id: b.bookingId || b.id,
        bookingId: b.bookingId || b.id,
        paymentId: b.paymentId || b.transactionId || "",
        transactionId: b.transactionId || b.paymentId || "",
        orderId: b.orderId,
        amount: Number(b.amount),
        currency: b.currency || "INR",
        listingId: b.listingId,
        listingTitle: b.listingTitle,
        listingType: "room" as const,
        planType: b.planType || "booking",
        userName: b.userName || "Guest User",
        userEmail: b.userEmail || "guest@example.com",
        userPhone: b.userPhone,
        ownerName: b.ownerName,
        ownerPhone: b.ownerPhone,
        status: b.status || "confirmed",
        paymentStatus: b.paymentStatus || "paid",
        createdAt: b.createdAt || b.timestamp || new Date().toISOString(),
        override_reason: b.override_reason,
        refunded_amount: b.refunded_amount,
        city: b.city || "Pune", // Default city for local mock if none
      }));

      // Map local mess subscriptions to AdminBooking type
      const mappedMess = localMessSubs.map((s: any) => ({
        id: s.id,
        bookingId: s.id,
        paymentId: s.paymentId || s.transactionId || "",
        transactionId: s.transactionId || s.paymentId || "",
        orderId: s.orderId || `ORD_${s.id}`,
        amount: Number(s.amount),
        currency: "INR",
        listingId: s.messId || s.listingId,
        listingTitle: s.messTitle || s.listingTitle,
        listingType: "mess" as const,
        planType: s.planType || "monthly",
        userName: s.userName || "Guest User",
        userEmail: s.userEmail || "guest@example.com",
        userPhone: s.userPhone,
        ownerName: s.ownerName,
        ownerPhone: s.ownerPhone,
        status: s.status || "active",
        paymentStatus: s.paymentStatus || "paid",
        createdAt: s.createdAt || s.startDate || new Date().toISOString(),
        override_reason: s.override_reason,
        refunded_amount: s.refunded_amount,
        city: s.city || "Mumbai", // Default city for local mock if none
      }));

      let combined: AdminBooking[] = [...mappedRooms, ...mappedMess];

      // 2. Fetch bookings from Supabase if any
      try {
        const { data: dbBookings, error } = await supabase
          .from("bookings" as any)
          .select(`
            *,
            rooms:listing_id (
              price,
              city
            )
          `)
          .order("created_at", { ascending: false });

        if (!error && dbBookings) {
          const mappedDb: AdminBooking[] = dbBookings.map((b: any) => {
            const roomPrice = b.rooms?.price || 5000;
            const roomCity = b.rooms?.city || "Pune";
            return {
              id: b.id,
              bookingId: b.id,
              paymentId: b.id.substring(0, 8),
              transactionId: b.id.substring(0, 8),
              orderId: b.id.substring(0, 12),
              amount: Number(roomPrice),
              currency: "INR",
              listingId: b.listing_id,
              listingTitle: b.message || "Room Booking",
              listingType: "room" as const,
              planType: "booking",
              userName: b.user_name || "Database User",
              userEmail: b.user_email || "",
              userPhone: b.user_phone || "",
              status: b.status || "pending",
              paymentStatus: b.status === "cancelled" ? "pending" : "paid",
              createdAt: b.created_at || new Date().toISOString(),
              city: roomCity,
            };
          });

          // Avoid duplicates by merging on ID
          const map = new Map<string, AdminBooking>();
          combined.forEach(x => map.set(x.id, x));
          mappedDb.forEach(x => map.set(x.id, x));
          combined = Array.from(map.values());
        }
      } catch (err) {
        console.warn("Unable to fetch bookings from remote database:", err);
      }

      // 3. Fetch mess subscriptions from Supabase
      try {
        const { data: dbSubs, error: subError } = await supabase
          .from("mess_subscriptions" as any)
          .select(`
            *,
            profiles:user_id (
              first_name,
              last_name,
              phone
            ),
            mess:mess_id (
              name,
              city
            )
          `)
          .order("created_at", { ascending: false });

        if (!subError && dbSubs) {
          const mappedDbSubs: AdminBooking[] = dbSubs.map((s: any) => ({
            id: s.id,
            bookingId: s.id,
            paymentId: s.id.substring(0, 8),
            transactionId: s.id.substring(0, 8),
            orderId: s.id.substring(0, 12),
            amount: Number(s.amount_paid || 0),
            currency: "INR",
            listingId: s.mess_id,
            listingTitle: s.mess?.name || "Mess Subscription",
            listingType: "mess" as const,
            planType: s.plan_type || "monthly",
            userName: s.profiles ? `${s.profiles.first_name || ""} ${s.profiles.last_name || ""}`.trim() || "User" : "User",
            userEmail: "",
            userPhone: s.profiles?.phone || "",
            status: s.status || "active",
            paymentStatus: "paid",
            createdAt: s.created_at || new Date().toISOString(),
            city: s.mess?.city || "Pune",
          }));

          const map = new Map<string, AdminBooking>();
          combined.forEach(x => map.set(x.id, x));
          mappedDbSubs.forEach(x => map.set(x.id, x));
          combined = Array.from(map.values());
        }
      } catch (err) {
        console.warn("Unable to fetch mess subscriptions from remote database:", err);
      }

      // Sort by creation date
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllBookings(combined);
    } catch (err) {
      console.error("Error loading bookings data:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Fetch Razorpay Transaction logs (from payments)
  const fetchTransactionsData = async () => {
    setLoadingTransactions(true);
    try {
      const history = getPaymentHistory();
      setAllTransactions(history || []);
    } catch (err) {
      console.error("Error loading payment history:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch Phase 4 Reports Queue
  const fetchReportsData = async () => {
    setLoadingReports(true);
    try {
      const reports = await getReports();
      setAllReports(reports || []);
    } catch (err) {
      console.error("Error loading reports data:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Fetch Phase 4 Reviews
  const fetchReviewsData = async () => {
    setLoadingReviews(true);
    try {
      const reviews = await getReviews();
      setAllReviews(reviews || []);
    } catch (err) {
      console.error("Error loading reviews data:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // =============================================
  // PHASE 4 ACTION HANDLERS (Reports & Reviews Moderation)
  // =============================================

  const handleResolveReport = async (reportId: string) => {
    try {
      setResolvingReportId(reportId);
      await resolveReport(reportId);
      toast({ title: "Report marked as resolved ✓" });
      fetchReportsData();
    } catch (err: any) {
      toast({ title: "Error resolving report", description: err.message, variant: "destructive" });
    } finally {
      setResolvingReportId(null);
    }
  };

  const handleDeleteReportListing = async (reportId: string, listingId: string, listingType: "room" | "mess") => {
    if (!confirm(`Are you sure you want to permanently delete this ${listingType} listing?`)) return;
    try {
      setResolvingReportId(reportId);
      const table = listingType === "room" ? "rooms" : "mess";
      const { error } = await supabase.from(table).delete().eq("id", listingId);
      if (error) throw error;

      await resolveReport(reportId);
      toast({ title: "Listing deleted and report resolved ✓" });
      fetchReportsData();
      fetchAllRooms();
      fetchAllMess();
    } catch (err: any) {
      toast({ title: "Error deleting listing", description: err.message, variant: "destructive" });
    } finally {
      setResolvingReportId(null);
    }
  };

  const handleBanReportUser = async (reportId: string, targetUserId: string, banStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${banStatus ? 'ban' : 'unban'} this user?`)) return;
    try {
      setResolvingReportId(reportId);
      await banUser(targetUserId, banStatus);
      await resolveReport(reportId);
      toast({ title: `User ${banStatus ? 'banned' : 'unbanned'} and report resolved ✓` });
      fetchReportsData();
      fetchAllUsers();
    } catch (err: any) {
      toast({ title: "Error banning user", description: err.message, variant: "destructive" });
    } finally {
      setResolvingReportId(null);
    }
  };

  const handleDeleteReportReview = async (reportId: string, reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      setResolvingReportId(reportId);
      await deleteReview(reviewId);
      await resolveReport(reportId);
      toast({ title: "Review deleted and report resolved ✓" });
      fetchReportsData();
      fetchReviewsData();
    } catch (err: any) {
      toast({ title: "Error deleting review", description: err.message, variant: "destructive" });
    } finally {
      setResolvingReportId(null);
    }
  };

  const handleUpdateReviewStatus = async (reviewId: string, status: "approved" | "pending" | "flagged") => {
    try {
      await updateReviewStatus(reviewId, status);
      toast({ title: `Review status set to ${status}` });
      fetchReviewsData();
    } catch (err: any) {
      toast({ title: "Error updating status", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteReviewRecord = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review permanently?")) return;
    try {
      await deleteReview(reviewId);
      toast({ title: "Review deleted permanently" });
      fetchReviewsData();
    } catch (err: any) {
      toast({ title: "Error deleting review", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveEditedReview = async () => {
    if (!editingReview) return;
    setSavingReview(true);
    try {
      await editReview(editingReview.id, editReviewComment, editReviewRating);
      toast({ title: "Review updated successfully ✓" });
      setEditingReview(null);
      fetchReviewsData();
    } catch (err: any) {
      toast({ title: "Error saving review", description: err.message, variant: "destructive" });
    } finally {
      setSavingReview(false);
    }
  };

  const handleToggleBanOnly = async (targetUserId: string, currentBanned: boolean) => {
    const nextBanned = !currentBanned;
    if (!confirm(`Are you sure you want to ${nextBanned ? 'ban' : 'unban'} this user?`)) return;
    try {
      await banUser(targetUserId, nextBanned);
      toast({ title: `User successfully ${nextBanned ? 'banned' : 'unbanned'}` });
      fetchAllUsers();
      fetchReportsData();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  // Clear local test transaction logs
  const handleClearTransactions = () => {
    localStorage.removeItem("rm_payments");
    toast({ title: "Local transaction logs cleared successfully" });
    fetchTransactionsData();
  };

  // Delete a single local test transaction log record
  const handleDeleteTransaction = (txn: any) => {
    try {
      const payments = JSON.parse(localStorage.getItem("rm_payments") || "[]");
      const updated = payments.filter((p: any) => {
        const matchId = txn.id || txn.paymentId || txn.transactionId;
        const pId = p.id || p.paymentId || p.transactionId;
        return pId !== matchId;
      });
      localStorage.setItem("rm_payments", JSON.stringify(updated));
      toast({ title: "Transaction log deleted successfully" });
      fetchTransactionsData();
    } catch (err) {
      console.error("Error deleting transaction log:", err);
      toast({ title: "Error deleting transaction", variant: "destructive" });
    }
  };

  // Clear local test bookings and subscriptions
  const handleClearBookings = () => {
    localStorage.removeItem("rm_bookings");
    localStorage.removeItem("rm_subscriptions");
    toast({ title: "Local bookings and subscriptions cleared successfully" });
    fetchBookingsData();
  };

  // Toggle room verification
  const toggleRoomVerification = async (roomId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_verified: !currentStatus })
        .eq("id", roomId);

      if (error) throw error;

      toast({ title: currentStatus ? "Room Unverified" : "Room Verified Γ£ô" });
      fetchAllRooms();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Toggle room active status
  const toggleRoomActive = async (roomId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_active: !currentStatus })
        .eq("id", roomId);

      if (error) throw error;

      toast({ title: currentStatus ? "Room Hidden" : "Room Visible" });
      fetchAllRooms();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Delete room
  const deleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to permanently delete this room?")) return;

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      toast({ title: "Room Deleted" });
      fetchAllRooms();
    } catch (error) {
      toast({ title: "Error deleting room", variant: "destructive" });
    }
  };

  // Save edited room
  const saveRoom = async () => {
    if (!editingRoom) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          title: editingRoom.title,
          description: editingRoom.description,
          location: editingRoom.location,
          address: editingRoom.address,
          city: editingRoom.city,
          price: editingRoom.price,
          room_type: editingRoom.room_type,
          facilities: editingRoom.facilities,
          is_active: editingRoom.is_active,
          is_verified: editingRoom.is_verified,
          images: editingRoom.images,
          latitude: editingRoom.latitude,
          longitude: editingRoom.longitude,
        })
        .eq("id", editingRoom.id);

      if (error) throw error;

      toast({ title: "Room Updated Successfully ✓" });
      setEditingRoom(null);
      fetchAllRooms();
    } catch (error) {
      toast({ title: "Error saving room", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Toggle mess verification
  const toggleMessVerification = async (messId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("mess")
        .update({ is_verified: !currentStatus })
        .eq("id", messId);

      if (error) throw error;

      toast({ title: currentStatus ? "Mess Unverified" : "Mess Verified ✓" });
      fetchAllMess();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Toggle mess active 
  const toggleMessActive = async (messId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("mess")
        .update({ is_active: !currentStatus })
        .eq("id", messId);

      if (error) throw error;

      toast({ title: currentStatus ? "Mess Hidden" : "Mess Visible" });
      fetchAllMess();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Delete mess
  const deleteMess = async (messId: string) => {
    if (!confirm("Are you sure you want to permanently delete this mess?")) return;

    try {
      const { error } = await supabase
        .from("mess")
        .delete()
        .eq("id", messId);

      if (error) throw error;

      toast({ title: "Mess Deleted" });
      fetchAllMess();
    } catch (error) {
      toast({ title: "Error deleting mess", variant: "destructive" });
    }
  };

  // Save edited mess
  const saveMess = async () => {
    if (!editingMess) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("mess")
        .update({
          name: editingMess.name,
          description: editingMess.description,
          location: editingMess.location,
          address: editingMess.address,
          city: editingMess.city,
          price_per_month: editingMess.price_per_month,
          food_type: editingMess.food_type,
          timings: editingMess.timings,
          menu_highlights: typeof editingMess.menu_highlights === 'string'
            ? (editingMess.menu_highlights as string).split(",").map(s => s.trim()).filter(Boolean)
            : editingMess.menu_highlights,
          is_active: editingMess.is_active,
          is_verified: editingMess.is_verified,
          images: editingMess.images,
          weekly_menu: editingMess.weekly_menu,
          latitude: editingMess.latitude,
          longitude: editingMess.longitude,
        })
        .eq("id", editingMess.id);

      if (error) throw error;

      toast({ title: "Mess Updated Successfully Γ£ô" });
      setEditingMess(null);
      fetchAllMess();
    } catch (error) {
      toast({ title: "Error saving mess", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Geocode address or fetch live GPS for Editing Room (Admin)
  const geocodeEditingRoomAddress = async () => {
    if (!editingRoom) return;
    if (!editingRoom.address && !editingRoom.city) {
      return useCurrentDeviceLocationForEditingRoom();
    }

    try {
      const fullAddress = `${editingRoom.address || ""}, ${editingRoom.city || ""}`.trim();
      const result = await geocodeAddress(fullAddress);
      if (result) {
        setEditingRoom({
          ...editingRoom,
          latitude: result.lat,
          longitude: result.lng,
          location: editingRoom.location || `${result.area || editingRoom.city}, ${result.city || editingRoom.city}`,
        });
        toast({
          title: "Location Coordinates Marked ✓",
          description: `Pinned at: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
        });
      } else {
        toast({
          title: "Address Geocoding Failed",
          description: "Fetching current device live GPS location...",
        });
        useCurrentDeviceLocationForEditingRoom();
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      useCurrentDeviceLocationForEditingRoom();
    }
  };

  const useCurrentDeviceLocationForEditingRoom = () => {
    if (!editingRoom) return;
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Unsupported",
        description: "Your browser does not support live GPS location.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));

        const geoInfo = await reverseGeocode(lat, lng);
        setEditingRoom(prev => {
          if (!prev) return null;
          return {
            ...prev,
            latitude: lat,
            longitude: lng,
            address: prev.address || geoInfo?.address || "",
            city: prev.city || geoInfo?.city || "",
            location: prev.location || `${geoInfo?.area || geoInfo?.city || ""}, ${geoInfo?.city || ""}`,
          };
        });

        toast({
          title: "Current GPS Location Marked ✓",
          description: `Live Coordinates: ${lat}, ${lng}`,
        });
      },
      (error) => {
        console.error("Device location error:", error);
        toast({
          title: "GPS Location Error",
          description: "Permission denied or unavailable. Please type address and try again.",
          variant: "destructive",
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Geocode address or fetch live GPS for Editing Mess (Admin)
  const geocodeEditingMessAddress = async () => {
    if (!editingMess) return;
    if (!editingMess.address && !editingMess.city) {
      return useCurrentDeviceLocationForEditingMess();
    }

    try {
      const fullAddress = `${editingMess.address || ""}, ${editingMess.city || ""}`.trim();
      const result = await geocodeAddress(fullAddress);
      if (result) {
        setEditingMess({
          ...editingMess,
          latitude: result.lat,
          longitude: result.lng,
          location: editingMess.location || `${result.area || editingMess.city}, ${result.city || editingMess.city}`,
        });
        toast({
          title: "Location Coordinates Marked ✓",
          description: `Pinned at: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
        });
      } else {
        toast({
          title: "Address Geocoding Failed",
          description: "Fetching current device live GPS location...",
        });
        useCurrentDeviceLocationForEditingMess();
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      useCurrentDeviceLocationForEditingMess();
    }
  };

  const useCurrentDeviceLocationForEditingMess = () => {
    if (!editingMess) return;
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Unsupported",
        description: "Your browser does not support live GPS location.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));

        const geoInfo = await reverseGeocode(lat, lng);
        setEditingMess(prev => {
          if (!prev) return null;
          return {
            ...prev,
            latitude: lat,
            longitude: lng,
            address: prev.address || geoInfo?.address || "",
            city: prev.city || geoInfo?.city || "",
            location: prev.location || `${geoInfo?.area || geoInfo?.city || ""}, ${geoInfo?.city || ""}`,
          };
        });

        toast({
          title: "Current GPS Location Marked ✓",
          description: `Live Coordinates: ${lat}, ${lng}`,
        });
      },
      (error) => {
        console.error("Device location error:", error);
        toast({
          title: "GPS Location Error",
          description: "Permission denied or unavailable. Please type address and try again.",
          variant: "destructive",
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Change user role
  const changeUserRoleOld = async (userId: string, newRole: string) => {
    try {
      // Delete existing roles for this user first to prevent duplicates
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole as "user" | "owner" | "admin" });

      if (insertError) throw insertError;

      toast({ title: `User role changed to ${newRole}` });
      fetchAllUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast({ title: "Error changing role", variant: "destructive" });
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast({
        title: "Action Not Allowed",
        description: "You cannot delete your own admin account.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc("delete_user", {
        target_user_id: userId,
      });

      if (error) throw error;

      toast({ title: "User Deleted Successfully ✓" });
      fetchAllUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error deleting user",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    }
  };

  // =============================================
  // LISTINGS STATUS & ATTRIBUTE CONTROLS
  // =============================================

  // Update room status
  const updateRoomStatus = async (roomId: string, newStatus: "pending" | "approved" | "rejected" | "suspended", reason?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "rejected" && reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from("rooms")
        .update(updateData)
        .eq("id", roomId);

      if (error) throw error;

      toast({ title: `Room status updated to ${newStatus}` });
      fetchAllRooms();

      // Email notification on rejection
      if (newStatus === "rejected" && reason) {
        const targetRoom = allRooms.find(r => r.id === roomId);
        if (targetRoom && targetRoom.owner_email && targetRoom.owner_email.includes("@")) {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: targetRoom.owner_email,
                subject: `âš ï¸ Listing Rejected: ${targetRoom.title}`,
                html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                  <h2>Your Room Listing Has Been Reviewed</h2>
                  <p>Hello ${targetRoom.owner_name},</p>
                  <p>Your room listing <strong>"${targetRoom.title}"</strong> has been rejected by the administrator for the following reason:</p>
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px; font-style: italic;">
                    "${reason}"
                  </div>
                  <p>Please log in to your dashboard to edit and resubmit your listing details for approval.</p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #888;">This is an automated system notification.</p>
                </div>`,
                text: `Hello ${targetRoom.owner_name},\n\nYour room listing "${targetRoom.title}" has been rejected. Reason: ${reason}`
              }
            });
          } catch (e) {
            console.error("Failed to send rejection email notification:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error updating room status:", error);
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  // Update mess status
  const updateMessStatus = async (messId: string, newStatus: "pending" | "approved" | "rejected" | "suspended", reason?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "rejected" && reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from("mess")
        .update(updateData)
        .eq("id", messId);

      if (error) throw error;

      toast({ title: `Mess status updated to ${newStatus}` });
      fetchAllMess();

      // Email notification on rejection
      if (newStatus === "rejected" && reason) {
        const targetMess = allMess.find(m => m.id === messId);
        if (targetMess && targetMess.owner_email && targetMess.owner_email.includes("@")) {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: targetMess.owner_email,
                subject: `âš ï¸ Listing Rejected: ${targetMess.name}`,
                html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                  <h2>Your Mess Listing Has Been Reviewed</h2>
                  <p>Hello ${targetMess.owner_name},</p>
                  <p>Your mess listing <strong>"${targetMess.name}"</strong> has been rejected by the administrator for the following reason:</p>
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px; font-style: italic;">
                    "${reason}"
                  </div>
                  <p>Please log in to your dashboard to edit and resubmit your listing details for approval.</p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #888;">This is an automated system notification.</p>
                </div>`,
                text: `Hello ${targetMess.owner_name},\n\nYour mess listing "${targetMess.name}" has been rejected. Reason: ${reason}`
              }
            });
          } catch (e) {
            console.error("Failed to send rejection email notification:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error updating mess status:", error);
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  // Toggle Room Featured
  const toggleRoomFeatured = async (roomId: string, isFeatured: boolean) => {
    setUpdatingListingId(roomId);
    try {
      const now = new Date();
      const featuredUntil = !isFeatured ? new Date(now.setDate(now.getDate() + 30)).toISOString() : null;

      const { error } = await supabase
        .from("rooms")
        .update({
          is_featured: !isFeatured,
          featured_until: featuredUntil
        })
        .eq("id", roomId);

      if (error) throw error;

      toast({ title: !isFeatured ? "Room Featured (Pinned to top) â˜…" : "Room Unfeatured â˜†" });
      fetchAllRooms();
    } catch (error) {
      console.error("Error toggling room featured:", error);
      toast({ title: "Error toggling featured", variant: "destructive" });
    } finally {
      setUpdatingListingId(null);
    }
  };

  // Toggle Mess Featured
  const toggleMessFeatured = async (messId: string, isFeatured: boolean) => {
    setUpdatingListingId(messId);
    try {
      const now = new Date();
      const featuredUntil = !isFeatured ? new Date(now.setDate(now.getDate() + 30)).toISOString() : null;

      const { error } = await supabase
        .from("mess")
        .update({
          is_featured: !isFeatured,
          featured_until: featuredUntil
        })
        .eq("id", messId);

      if (error) throw error;

      toast({ title: !isFeatured ? "Mess Featured (Pinned to top) â˜…" : "Mess Unfeatured â˜†" });
      fetchAllMess();
    } catch (error) {
      console.error("Error toggling mess featured:", error);
      toast({ title: "Error toggling featured", variant: "destructive" });
    } finally {
      setUpdatingListingId(null);
    }
  };

  // Toggle Room Quality Flag
  const toggleRoomQualityFlag = async (roomId: string, currentFlagged: boolean) => {
    setUpdatingListingId(roomId);
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ flagged: !currentFlagged })
        .eq("id", roomId);

      if (error) throw error;

      toast({ 
        title: !currentFlagged ? "Room Flagged as Low Quality" : "Room Unflagged", 
        description: !currentFlagged ? "Listing hidden from public search until fixed." : "Listing visible in public search."
      });
      fetchAllRooms();
    } catch (error) {
      console.error("Error flagging room:", error);
      toast({ title: "Error flagging room", variant: "destructive" });
    } finally {
      setUpdatingListingId(null);
    }
  };

  // Toggle Mess Quality Flag
  const toggleMessQualityFlag = async (messId: string, currentFlagged: boolean) => {
    setUpdatingListingId(messId);
    try {
      const { error } = await supabase
        .from("mess")
        .update({ flagged: !currentFlagged })
        .eq("id", messId);

      if (error) throw error;

      toast({ 
        title: !currentFlagged ? "Mess Flagged as Low Quality" : "Mess Unflagged", 
        description: !currentFlagged ? "Listing hidden from public search until fixed." : "Listing visible in public search."
      });
      fetchAllMess();
    } catch (error) {
      console.error("Error flagging mess:", error);
      toast({ title: "Error flagging mess", variant: "destructive" });
    } finally {
      setUpdatingListingId(null);
    }
  };

  // Manual Expire Room
  const expireRoomNow = async (roomId: string) => {
    if (!confirm("Are you sure you want to expire this room listing immediately?")) return;
    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          status: "expired",
          expires_at: new Date().toISOString()
        })
        .eq("id", roomId);

      if (error) throw error;

      toast({ title: "Room Listing Expired" });
      fetchAllRooms();
    } catch (error) {
      console.error("Error expiring room:", error);
      toast({ title: "Error expiring room", variant: "destructive" });
    }
  };

  // Manual Expire Mess
  const expireMessNow = async (messId: string) => {
    if (!confirm("Are you sure you want to expire this mess listing immediately?")) return;
    try {
      const { error } = await supabase
        .from("mess")
        .update({
          status: "expired",
          expires_at: new Date().toISOString()
        })
        .eq("id", messId);

      if (error) throw error;

      toast({ title: "Mess Listing Expired" });
      fetchAllMess();
    } catch (error) {
      console.error("Error expiring mess:", error);
      toast({ title: "Error expiring mess", variant: "destructive" });
    }
  };

  // =============================================
  // PHASE 3 ACTION HANDLERS (Manual override, refund, settings, export)
  // =============================================

  const handleApplyOverride = async () => {
    if (!overrideModal) return;
    if (!overrideReason.trim()) {
      toast({ title: "Please provide a reason for the override", variant: "destructive" });
      return;
    }

    setSavingOverride(true);
    try {
      const isMess = overrideModal.booking.listingType === "mess";
      const newStatus = overrideModal.action === "confirm" ? "confirmed" : "cancelled";
      const result = await forceUpdateBookingStatus(
        overrideModal.booking.id,
        isMess,
        newStatus,
        overrideReason
      );

      if (result.success) {
        toast({
          title: `Booking successfully forced to ${newStatus}`,
          description: `Logged reason: "${overrideReason}"`
        });
        setOverrideModal(null);
        setOverrideReason("");
        fetchBookingsData();
        fetchTransactionsData();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: "Failed to override booking status",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSavingOverride(false);
    }
  };

  const handleTriggerRefund = async (booking: AdminBooking) => {
    if (!confirm(`Are you sure you want to trigger a manual refund of ₹${booking.amount} for booking ${booking.id}? This will also cancel the booking.`)) {
      return;
    }

    setRefundingBookingId(booking.id);
    try {
      const isMess = booking.listingType === "mess";
      const result = await refundRazorpayPayment(booking.id, isMess, booking.amount);
      if (result.success) {
        toast({
          title: "Manual Refund Successful",
          description: `₹${booking.amount} refunded successfully. Booking cancelled.`
        });
        fetchBookingsData();
        fetchTransactionsData();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: "Refund failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setRefundingBookingId(null);
    }
  };

  const handleSavePlatformSettings = async () => {
    if (commissionRate < 0 || commissionRate > 100) {
      toast({ title: "Commission percent must be between 0 and 100", variant: "destructive" });
      return;
    }
    if (minRentPrice < 0) {
      toast({ title: "Minimum rent price must be non-negative", variant: "destructive" });
      return;
    }
    if (maxRentPrice < minRentPrice) {
      toast({ title: "Maximum rent price must be greater than or equal to minimum rent price", variant: "destructive" });
      return;
    }
    if (featuredListingPrice < 0) {
      toast({ title: "Featured listing price must be non-negative", variant: "destructive" });
      return;
    }
    if (referralRewardAmount < 0) {
      toast({ title: "Referral reward amount must be non-negative", variant: "destructive" });
      return;
    }

    setSavingSettings(true);
    try {
      const res = await updatePlatformSettings({
        commission_percent: commissionRate,
        homepage_banners: homepageBanners,
        featured_cities: featuredCities,
        maintenance_mode: maintenanceMode,
        featured_listing_price: featuredListingPrice,
        referral_reward_amount: referralRewardAmount,
        min_rent_price: minRentPrice,
        max_rent_price: maxRentPrice
      });
      if (res.success) {
        toast({
          title: "Platform settings updated successfully ✓",
          description: "All changes are saved to Supabase."
        });
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({
        title: "Failed to update platform settings",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveCmsPage = async (slug: string) => {
    setSavingCms(true);
    try {
      const res = await updateStaticPage(slug, {
        title: cmsTitleInput,
        content: cmsContentInput
      });
      if (res.success) {
        toast({ title: "CMS page updated successfully ✓" });
        setEditingCmsSlug(null);
        // Refresh pages
        const pages = await getAllStaticPages();
        setCmsPages(pages);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({
        title: "Failed to save CMS page",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSavingCms(false);
    }
  };

  const handleSaveNotificationTemplate = async (name: string) => {
    setSavingTemplate(true);
    try {
      const res = await updateNotificationTemplate(name, {
        subject: templateSubjectInput,
        body: templateBodyInput
      });
      if (res.success) {
        toast({ title: "Notification template updated successfully ✓" });
        setEditingTemplateName(null);
        // Refresh templates
        const templates = await getAllNotificationTemplates();
        setNotifTemplates(templates);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({
        title: "Failed to save template",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleExportCSV = () => {
    try {
      if (filteredBookings.length === 0) {
        toast({ title: "No bookings to export with current filters", variant: "destructive" });
        return;
      }

      // Define CSV headers
      const headers = [
        "Booking ID",
        "User Name",
        "User Email",
        "Listing Title",
        "Listing Type",
        "Plan Type",
        "Amount (₹)",
        "Booking Status",
        "Payment Status",
        "Created At",
        "Override Reason",
        "City"
      ];

      // Format data rows
      const rows = filteredBookings.map((b) => [
        `"${b.id}"`,
        `"${b.userName}"`,
        `"${b.userEmail}"`,
        `"${b.listingTitle.replace(/"/g, '""')}"`,
        `"${b.listingType}"`,
        `"${b.planType}"`,
        b.amount,
        `"${b.status}"`,
        `"${b.paymentStatus}"`,
        `"${new Date(b.createdAt).toLocaleString()}"`,
        `"${(b.override_reason || "").replace(/"/g, '""')}"`,
        `"${b.city || "N/A"}"`
      ]);

      // Combine into CSV string
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(","))
      ].join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `rm_bookings_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "CSV Export downloaded successfully" });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const getTransactionStats = () => {
    const successfulTxns = allTransactions.filter(
      t => t.status === "success" || t.status === "paid" || t.status === "confirmed"
    );
    const totalAmount = successfulTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalCommission = totalAmount * (commissionRate / 100);

    const now = new Date();
    
    // Start of Today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Start of This Week (Monday standard)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekTime = startOfWeek.getTime();
    
    // Start of This Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // Start of This Year
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    let dayAmount = 0, weekAmount = 0, monthAmount = 0, yearAmount = 0;
    let roomWeek = 0, roomMonth = 0, roomYear = 0, roomTotal = 0;
    let messWeek = 0, messMonth = 0, messYear = 0, messTotal = 0;

    successfulTxns.forEach(t => {
      const tTime = new Date(txnTimestamp(t)).getTime();
      const amt = Number(t.amount || 0);
      const lType = String(t.listingType || t.listing_type || "").toLowerCase();
      const isMess = lType.includes("mess") || lType.includes("subscrip");

      if (tTime >= startOfToday) {
        dayAmount += amt;
      }
      if (tTime >= startOfWeekTime) {
        weekAmount += amt;
        if (isMess) messWeek += amt;
        else roomWeek += amt;
      }
      if (tTime >= startOfMonth) {
        monthAmount += amt;
        if (isMess) messMonth += amt;
        else roomMonth += amt;
      }
      if (tTime >= startOfYear) {
        yearAmount += amt;
        if (isMess) messYear += amt;
        else roomYear += amt;
      }

      if (isMess) messTotal += amt;
      else roomTotal += amt;
    });

    const rate = commissionRate / 100;

    return {
      total: totalAmount,
      commission: totalCommission,
      day: dayAmount,
      dayCommission: dayAmount * rate,
      week: weekAmount,
      weekCommission: weekAmount * rate,
      month: monthAmount,
      monthCommission: monthAmount * rate,
      year: yearAmount,
      yearCommission: yearAmount * rate,

      // Room category breakdowns
      roomWeek,
      roomWeekCommission: roomWeek * rate,
      roomMonth,
      roomMonthCommission: roomMonth * rate,
      roomYear,
      roomYearCommission: roomYear * rate,
      roomTotal,
      roomTotalCommission: roomTotal * rate,

      // Mess category breakdowns
      messWeek,
      messWeekCommission: messWeek * rate,
      messMonth,
      messMonthCommission: messMonth * rate,
      messYear,
      messYearCommission: messYear * rate,
      messTotal,
      messTotalCommission: messTotal * rate,
    };
  };

  const txnTimestamp = (t: any) => {
    return t.timestamp || t.created_at || new Date().toISOString();
  };

  // Helper to look up reporter details
  const getReporterInfo = (reporterId: string) => {
    const p = allUsers.find(u => u.id === reporterId);
    if (p) return `${p.full_name || 'N/A'} (${p.email})`;
    return `User ID: ${reporterId}`;
  };

  // Helper to look up target details
  const getTargetDetails = (type: "listing" | "user" | "review", targetId: string) => {
    if (type === "listing") {
      const room = allRooms.find(r => r.id === targetId);
      if (room) return { name: `Room: "${room.title}"`, sub: `Owner: ${room.owner_name} (${room.owner_email})`, details: room };
      const m = allMess.find(x => x.id === targetId);
      if (m) return { name: `Mess: "${m.name}"`, sub: `Owner: ${m.owner_name} (${m.owner_email || 'N/A'})`, details: m };
      return { name: "Listing Deleted or Not Found", sub: `ID: ${targetId}` };
    }
    if (type === "user") {
      const p = allUsers.find(u => u.id === targetId);
      if (p) return { name: `User: ${p.full_name || 'N/A'}`, sub: `Email: ${p.email} | Status: ${p.is_banned ? 'BANNED' : 'Active'}`, details: p };
      return { name: "User Not Found", sub: `ID: ${targetId}` };
    }
    if (type === "review") {
      const r = allReviews.find(x => x.id === targetId);
      if (r) return { name: `Review: "${r.comment}"`, sub: `Rating: ${r.rating}â˜… | Status: ${r.status}`, details: r };
      return { name: "Review Deleted or Not Found", sub: `ID: ${targetId}` };
    }
    return { name: "Unknown Target", sub: `ID: ${targetId}` };
  };

  // Repeat Offenders Aggregations
  const getRepeatOffendersList = () => {
    const userReportCounts: Record<string, { count: number; reports: ModerationReport[] }> = {};

    allReports.forEach(r => {
      let targetUserId = "";
      if (r.target_type === "user") {
        targetUserId = r.target_id;
      } else if (r.target_type === "listing") {
        const room = allRooms.find(x => x.id === r.target_id);
        if (room) targetUserId = room.owner_id;
        const m = allMess.find(x => x.id === r.target_id);
        if (m) targetUserId = m.owner_id;
      } else if (r.target_type === "review") {
        const rev = allReviews.find(x => x.id === r.target_id);
        if (rev) targetUserId = rev.user_id;
      }

      if (targetUserId) {
        if (!userReportCounts[targetUserId]) {
          userReportCounts[targetUserId] = { count: 0, reports: [] };
        }
        userReportCounts[targetUserId].count += 1;
        userReportCounts[targetUserId].reports.push(r);
      }
    });

    return Object.entries(userReportCounts)
      .map(([userId, info]) => {
        const profile = allUsers.find(u => u.id === userId);
        return {
          userId,
          name: profile ? profile.full_name : "Unknown User",
          email: profile ? profile.email : "N/A",
          isBanned: profile ? profile.is_banned : false,
          count: info.count,
          reports: info.reports
        };
      })
      .filter(o => o.count >= 2)
      .sort((a, b) => b.count - a.count);
  };

  // =============================================
  // BULK ACTIONS
  // =============================================

  const handleBulkRoomsAction = async (action: "approve" | "delete" | "expire" | "flag") => {
    if (selectedRoomIds.length === 0) return;
    if (!confirm(`Are you sure you want to bulk ${action} the ${selectedRoomIds.length} selected rooms?`)) return;

    try {
      if (action === "approve") {
        const { error } = await supabase
          .from("rooms")
          .update({ status: "approved" })
          .in("id", selectedRoomIds);
        if (error) throw error;
        toast({ title: `Bulk approved ${selectedRoomIds.length} rooms` });
      } else if (action === "delete") {
        const { error } = await supabase
          .from("rooms")
          .delete()
          .in("id", selectedRoomIds);
        if (error) throw error;
        toast({ title: `Bulk deleted ${selectedRoomIds.length} rooms` });
      } else if (action === "expire") {
        const { error } = await supabase
          .from("rooms")
          .update({ status: "expired", expires_at: new Date().toISOString() })
          .in("id", selectedRoomIds);
        if (error) throw error;
        toast({ title: `Bulk expired ${selectedRoomIds.length} rooms` });
      } else if (action === "flag") {
        const { error } = await supabase
          .from("rooms")
          .update({ flagged: true })
          .in("id", selectedRoomIds);
        if (error) throw error;
        toast({ title: `Bulk flagged ${selectedRoomIds.length} rooms` });
      }

      setSelectedRoomIds([]);
      fetchAllRooms();
    } catch (error) {
      console.error(`Error performing bulk rooms ${action}:`, error);
      toast({ title: `Error during bulk ${action}`, variant: "destructive" });
    }
  };

  const handleBulkMessAction = async (action: "approve" | "delete" | "expire" | "flag") => {
    if (selectedMessIds.length === 0) return;
    if (!confirm(`Are you sure you want to bulk ${action} the ${selectedMessIds.length} selected mess listings?`)) return;

    try {
      if (action === "approve") {
        const { error } = await supabase
          .from("mess")
          .update({ status: "approved" })
          .in("id", selectedMessIds);
        if (error) throw error;
        toast({ title: `Bulk approved ${selectedMessIds.length} mess listings` });
      } else if (action === "delete") {
        const { error } = await supabase
          .from("mess")
          .delete()
          .in("id", selectedMessIds);
        if (error) throw error;
        toast({ title: `Bulk deleted ${selectedMessIds.length} mess listings` });
      } else if (action === "expire") {
        const { error } = await supabase
          .from("mess")
          .update({ status: "expired", expires_at: new Date().toISOString() })
          .in("id", selectedMessIds);
        if (error) throw error;
        toast({ title: `Bulk expired ${selectedMessIds.length} mess listings` });
      } else if (action === "flag") {
        const { error } = await supabase
          .from("mess")
          .update({ flagged: true })
          .in("id", selectedMessIds);
        if (error) throw error;
        toast({ title: `Bulk flagged ${selectedMessIds.length} mess listings` });
      }

      setSelectedMessIds([]);
      fetchAllMess();
    } catch (error) {
      console.error(`Error performing bulk mess ${action}:`, error);
      toast({ title: `Error during bulk ${action}`, variant: "destructive" });
    }
  };

  // Filter functions
  const filteredRooms = allRooms.filter(room =>
    room.title?.toLowerCase().includes(roomSearch.toLowerCase()) ||
    room.location?.toLowerCase().includes(roomSearch.toLowerCase()) ||
    room.owner_name?.toLowerCase().includes(roomSearch.toLowerCase())
  );

  const filteredMess = allMess.filter(mess =>
    mess.name?.toLowerCase().includes(messSearch.toLowerCase()) ||
    mess.location?.toLowerCase().includes(messSearch.toLowerCase()) ||
    mess.owner_name?.toLowerCase().includes(messSearch.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredBookings = allBookings.filter(booking => {
    // 1. Status Filter
    if (bookingFilters.status !== "all") {
      const matchStatus = bookingFilters.status;
      if (matchStatus === "confirmed" && booking.status !== "confirmed" && booking.status !== "active") {
        return false;
      }
      if (matchStatus === "cancelled" && booking.status !== "cancelled") {
        return false;
      }
      if (matchStatus === "completed" && booking.status !== "completed" && booking.status !== "expired") {
        return false;
      }
      if (matchStatus === "pending" && booking.status !== "pending") {
        return false;
      }
    }

    // 2. Date Range Filter
    if (bookingFilters.dateFrom) {
      const fromTime = new Date(bookingFilters.dateFrom).getTime();
      const bTime = new Date(booking.createdAt).getTime();
      if (bTime < fromTime) return false;
    }
    if (bookingFilters.dateTo) {
      const toTime = new Date(bookingFilters.dateTo).setHours(23, 59, 59, 999);
      const bTime = new Date(booking.createdAt).getTime();
      if (bTime > toTime) return false;
    }

    // 3. City Filter
    if (bookingFilters.city.trim() && (!booking.city || !booking.city.toLowerCase().includes(bookingFilters.city.toLowerCase()))) {
      return false;
    }

    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Please Login</h1>
          <Button onClick={() => navigate("/auth")}>Go to Login</Button>
        </div>
        {/* 1. Admin User Detail Overlay Modal */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto block">
          <div className="bg-card rounded-2xl p-6 w-full max-w-4xl shadow-2xl border my-8 max-h-[90vh] overflow-y-auto text-foreground">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <h3 className="font-heading font-semibold text-xl flex items-center gap-2 text-foreground">
                  <User className="w-5 h-5 text-primary" />
                  Admin User Profile Detail
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">ID: {selectedUserForDetails.id}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedUserForDetails(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Left Panel: Profile Summary & Controls */}
              <div className="md:col-span-1 space-y-6">
                <div className="bg-muted p-4 rounded-xl space-y-3">
                  <div className="text-center pb-4 border-b">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-xl font-bold text-primary">
                      {selectedUserForDetails.full_name?.charAt(0) || "U"}
                    </div>
                    <h4 className="font-bold text-lg">{selectedUserForDetails.full_name || "N/A"}</h4>
                    <p className="text-xs text-muted-foreground break-all">{selectedUserForDetails.email}</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <Badge variant={selectedUserForDetails.role === "admin" ? "destructive" : selectedUserForDetails.role === "owner" ? "default" : "secondary"}>
                        {selectedUserForDetails.role}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={selectedUserForDetails.status === "active" ? "bg-success text-white" : selectedUserForDetails.status === "suspended" ? "bg-amber-600 text-white" : "bg-destructive text-white"}>
                        {selectedUserForDetails.status || "active"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Identity:</span>
                      <Badge className={selectedUserForDetails.is_verified ? "bg-blue-600 text-white" : "bg-gray-500 text-white"}>
                        {selectedUserForDetails.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shadow Banned:</span>
                      <span className="font-semibold">{selectedUserForDetails.shadow_banned ? "Yes 👻" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Version:</span>
                      <span>v{selectedUserForDetails.token_version || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joined:</span>
                      <span>{new Date(selectedUserForDetails.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between flex-col gap-0.5">
                      <span className="text-muted-foreground">Last Login:</span>
                      <span className="font-medium text-[11px]">
                        {selectedUserForDetails.last_login 
                          ? new Date(selectedUserForDetails.last_login).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Control Actions Section */}
                <div className="space-y-3">
                  <h5 className="font-bold text-sm border-b pb-1">Permission Actions</h5>
                  
                  {/* Role dropdown trigger */}
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Change Role</Label>
                    <select
                      value={selectedUserForDetails.role || "user"}
                      onChange={(e) => changeUserRole(selectedUserForDetails.id, e.target.value)}
                      className="w-full h-9 px-2 rounded-md border bg-background text-sm cursor-pointer text-foreground"
                    >
                      <option value="user">User</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Verification Toggle */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs"
                    onClick={() => handleToggleUserVerified(selectedUserForDetails.id, selectedUserForDetails.is_verified)}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    {selectedUserForDetails.is_verified ? "Unverify Identity" : "Verify Identity"}
                  </Button>

                  {/* Suspend / Ban Toggles */}
                  <div className="flex gap-2">
                    {selectedUserForDetails.status !== "active" ? (
                      <Button 
                        variant="outline" 
                        className="flex-1 h-9 text-xs bg-success/5 text-success border-success/20 hover:bg-success hover:text-white"
                        onClick={() => handleToggleUserStatus(selectedUserForDetails.id, selectedUserForDetails.status, "activate")}
                      >
                        Activate
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-9 text-xs bg-amber-500/5 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white"
                          onClick={() => handleToggleUserStatus(selectedUserForDetails.id, selectedUserForDetails.status, "suspend")}
                        >
                          Suspend
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-9 text-xs bg-destructive/5 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                          onClick={() => handleToggleUserStatus(selectedUserForDetails.id, selectedUserForDetails.status, "ban")}
                        >
                          Ban
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Shadow Ban Toggle */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs"
                    onClick={() => handleToggleShadowBan(selectedUserForDetails.id, selectedUserForDetails.shadow_banned)}
                  >
                    <EyeOff className="w-4 h-4 text-amber-600" />
                    {selectedUserForDetails.shadow_banned ? "Lift Shadow Ban" : "Shadow Ban User"}
                  </Button>

                  {/* Force Logout */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs text-destructive hover:bg-destructive/5"
                    onClick={() => handleForceUserLogout(selectedUserForDetails.id, selectedUserForDetails.token_version || 1)}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Force Logout
                  </Button>

                  {/* Password Reset */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                    onClick={() => handleTriggerPasswordReset(selectedUserForDetails.id, selectedUserForDetails.email)}
                  >
                    <Mail className="w-4 h-4" />
                    Reset Password Link
                  </Button>

                  {/* Impersonate User */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs bg-purple-500 text-white hover:bg-purple-600 border-none font-semibold mt-2"
                    onClick={() => handleImpersonateUser(selectedUserForDetails.id, selectedUserForDetails.full_name || selectedUserForDetails.email)}
                    disabled={selectedUserForDetails.id === user?.id}
                    title={selectedUserForDetails.id === user?.id ? "Cannot impersonate yourself" : "Impersonate user"}
                  >
                    <User className="w-4 h-4 fill-current" />
                    Impersonate User
                  </Button>
                </div>
              </div>

              {/* Right Panel: Lists of Listings, Bookings, Reviews */}
              <div className="md:col-span-2 space-y-6">
                {/* Rooms and Mess Listings */}
                <div>
                  <h4 className="font-heading font-semibold text-base mb-3 border-b pb-1">Owned Listings</h4>
                  
                  {/* Rooms */}
                  <div className="space-y-2 mb-3">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rooms</h5>
                    {allRooms.filter(r => r.owner_id === selectedUserForDetails.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-2">No rooms listed.</p>
                    ) : (
                      allRooms.filter(r => r.owner_id === selectedUserForDetails.id).map(r => (
                        <div key={r.id} className="flex justify-between items-center text-xs p-2 bg-muted rounded">
                          <span className="font-medium truncate max-w-xs">{r.title}</span>
                          <div className="flex gap-2 items-center">
                            <span className="font-bold text-primary">₹{r.price}</span>
                            <Badge className={r.is_active ? "bg-success text-white scale-90" : "bg-gray-400 text-white scale-90"}>{r.is_active ? "Active" : "Inactive"}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Mess */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mess</h5>
                    {allMess.filter(m => m.owner_id === selectedUserForDetails.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-2">No mess listed.</p>
                    ) : (
                      allMess.filter(m => m.owner_id === selectedUserForDetails.id).map(m => (
                        <div key={m.id} className="flex justify-between items-center text-xs p-2 bg-muted rounded">
                          <span className="font-medium truncate max-w-xs">{m.name}</span>
                          <div className="flex gap-2 items-center">
                            <span className="font-bold text-primary">₹{m.price_per_month}</span>
                            <Badge className={m.is_active ? "bg-success text-white scale-90" : "bg-gray-400 text-white scale-90"}>{m.is_active ? "Active" : "Inactive"}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bookings */}
                <div>
                  <h4 className="font-heading font-semibold text-base mb-3 border-b pb-1">Bookings & Subscriptions</h4>
                  {allBookings.filter(b => b.userEmail === selectedUserForDetails.email || b.userPhone === selectedUserForDetails.phone).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic pl-2">No bookings or subscriptions on record.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allBookings.filter(b => b.userEmail === selectedUserForDetails.email || b.userPhone === selectedUserForDetails.phone).map(b => (
                        <div key={b.id} className="text-xs p-2.5 bg-muted rounded border border-border flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{b.listingTitle} ({b.listingType})</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()} • {b.planType}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">₹{b.amount}</p>
                            <Badge className={b.status === "confirmed" || b.status === "active" ? "bg-success text-white scale-75" : "bg-warning text-white scale-75"}>{b.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reviews */}
                <div>
                  <h4 className="font-heading font-semibold text-base mb-3 border-b pb-1">Reviews Written</h4>
                  {allReviews.filter(r => r.user_id === selectedUserForDetails.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic pl-2">No reviews written yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allReviews.filter(r => r.user_id === selectedUserForDetails.id).map(r => (
                        <div key={r.id} className="text-xs p-2.5 bg-muted rounded border border-border">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-muted-foreground italic">"{r.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Admin User Role Change Confirmation Dialog Overlay Modal */}
      {userRoleConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 block">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border text-center">
            <h3 className="font-heading font-semibold text-lg text-foreground mb-2">Confirm Role Change</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to change the role of <strong>{userRoleConfirm.email}</strong> to <strong>{userRoleConfirm.newRole}</strong>? 
              This will update their system permissions.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setUserRoleConfirm(null)} className="w-24">
                Cancel
              </Button>
              <Button onClick={executeRoleChange} className="bg-primary text-primary-foreground w-24">
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Password Reset link display modal */}
      {userResetPasswordUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 block">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="font-heading font-semibold text-lg text-foreground">Password Reset Link</h3>
              <Button variant="ghost" size="icon" onClick={() => setUserResetPasswordUrl(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Here is the simulated password reset URL. You can share this link directly with the user:
            </p>
            <div className="p-3 bg-muted rounded-lg border text-xs font-mono break-all mb-6">
              {userResetPasswordUrl}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => {
                navigator.clipboard.writeText(userResetPasswordUrl);
                toast({ title: "Copied to clipboard! ✓" });
              }} className="mr-2">
                Copy Link
              </Button>
              <Button variant="outline" onClick={() => setUserResetPasswordUrl(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-3xl text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground">Full control over all listings and users</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-11 w-full max-w-7xl mb-8 gap-1">
              <TabsTrigger value="overview" className="gap-1.5 text-xs">
                <BarChart3 className="w-3.5 h-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="rooms" className="gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5" />
                Rooms ({stats.totalRooms})
              </TabsTrigger>
              <TabsTrigger value="mess" className="gap-1.5 text-xs">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Mess ({stats.totalMess})
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5" />
                Users ({stats.totalUsers})
              </TabsTrigger>
              <TabsTrigger value="bookings" className="gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-1.5 text-xs">
                <CreditCard className="w-3.5 h-3.5" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5 text-xs">
                <AlertOctagon className="w-3.5 h-3.5" />
                Reports ({allReports.filter(r => r.status === "open").length})
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 text-xs">
                <MessageSquare className="w-3.5 h-3.5" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="offenders" className="gap-1.5 text-xs">
                <UserMinus className="w-3.5 h-3.5" />
                Offenders
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 text-xs">
                <Settings className="w-3.5 h-3.5" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab (Postgres & SQL Aggregation Powered) */}
            <TabsContent value="analytics" className="space-y-8">
              {/* Header / Active Sessions Ribbon */}
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-heading font-bold text-foreground">Analytics Dashboard</h2>
                    <p className="text-xs text-muted-foreground">Real-time database aggregation via Supabase RPCs</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Item 5: Active Sessions Counter Card */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Active Sessions (15m)</p>
                      <p className="text-lg font-bold text-foreground leading-none mt-0.5">{activeSessionsCount} users</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAnalytics}
                    disabled={loadingAnalytics}
                    className="gap-2 text-xs border-border/60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? "animate-spin text-emerald-500" : ""}`} />
                    Refresh Analytics
                  </Button>
                </div>
              </div>

              {/* Item 1 & 2: Time-Series Aggregate Charts (Signups, Listings, Bookings) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TimeSeriesChart
                  data={signupsData}
                  label="User Signups"
                  color="#10b981"
                  daysBack={signupsDays}
                  onDaysBackChange={loadSignupsData}
                />
                <TimeSeriesChart
                  data={listingsData}
                  label="Listings Created"
                  color="#3b82f6"
                  daysBack={listingsDays}
                  onDaysBackChange={loadListingsData}
                />
                <TimeSeriesChart
                  data={bookingsData}
                  label="Bookings Placed"
                  color="#f59e0b"
                  daysBack={bookingsDays}
                  onDaysBackChange={loadBookingsData}
                />
              </div>

              {/* Item 3 & 4 Grid: Revenue Dashboard & Top Searched Cities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Item 3: Revenue Dashboard */}
                <div className="lg:col-span-2 bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
                        <Coins className="w-5 h-5 text-emerald-500" />
                        Platform Revenue & Commission
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Aggregation over payments
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/30">
                      {(["day", "week", "month", "year"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => loadRevenueData(p)}
                          className={`px-3 py-1 text-xs rounded-md capitalize transition-all font-medium ${
                            revenuePeriod === p
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-2">
                    <div className="bg-muted/30 border border-border/40 p-3.5 rounded-xl">
                      <span className="text-[11px] text-muted-foreground">Total Revenue Earned</span>
                      <p className="text-xl font-bold text-emerald-500 mt-1">
                        ₹{revenueData.reduce((acc, curr) => acc + Number(curr.total_commission || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-muted/30 border border-border/40 p-3.5 rounded-xl">
                      <span className="text-[11px] text-muted-foreground">Selected Granularity</span>
                      <p className="text-xl font-bold text-foreground capitalize mt-1">{revenuePeriod}ly</p>
                    </div>
                    <div className="bg-muted/30 border border-border/40 p-3.5 rounded-xl col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-muted-foreground">Periods Tracked</span>
                      <p className="text-xl font-bold text-foreground mt-1">{revenueData.length}</p>
                    </div>
                  </div>

                  {/* Revenue Chart */}
                  <div className="h-[260px] w-full pt-2">
                    {revenueData.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
                        <span>No revenue records found for this period</span>
                      </div>
                    ) : (
                      <TimeSeriesChart
                        data={revenueData.map(r => ({
                          day: r.period_start,
                          count: r.total_commission
                        }))}
                        label={`Commission (₹ / ${revenuePeriod})`}
                        color="#10b981"
                        height={240}
                      />
                    )}
                  </div>
                </div>

                {/* Item 4: Top Searched Cities */}
                <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="border-b border-border/40 pb-3">
                    <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      Top Searched Cities
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Most requested locations logged in search_logs
                    </p>
                  </div>

                  {topCitiesData.length === 0 ? (
                    <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-4">
                      <MapPin className="w-8 h-8 opacity-40 mb-2" />
                      <span>No city searches logged yet.<br />Searches logged on SearchBar will appear here.</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      {topCitiesData.map((cityItem, index) => {
                        const maxSearches = Math.max(...topCitiesData.map(c => c.searches), 1);
                        const pct = Math.round((cityItem.searches / maxSearches) * 100);

                        return (
                          <div key={cityItem.city || index} className="space-y-1.5 p-2 bg-muted/20 border border-border/30 rounded-xl">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  index === 0 ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                                  index === 1 ? "bg-slate-400/20 text-slate-400 border border-slate-400/30" :
                                  index === 2 ? "bg-amber-700/20 text-amber-600 border border-amber-700/30" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {index + 1}
                                </span>
                                {cityItem.city}
                              </span>
                              <span className="font-bold text-emerald-500">{cityItem.searches} searches</span>
                            </div>
                            <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div 
                  className="bg-card rounded-2xl p-6 shadow-soft cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" 
                  onClick={() => setActiveTab("rooms")}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Building2 className="w-8 h-8 text-primary" />
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-3xl font-bold">{stats.totalRooms}</p>
                  <p className="text-muted-foreground font-medium">Total Rooms</p>
                  <p className="text-sm text-success mt-2">{stats.verifiedRooms} verified</p>
                </div>

                <div 
                  className="bg-card rounded-2xl p-6 shadow-soft cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" 
                  onClick={() => setActiveTab("mess")}
                >
                  <div className="flex items-center justify-between mb-4">
                    <UtensilsCrossed className="w-8 h-8 text-accent" />
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-3xl font-bold">{stats.totalMess}</p>
                  <p className="text-muted-foreground font-medium">Total Mess</p>
                  <p className="text-sm text-success mt-2">{stats.verifiedMess} verified</p>
                </div>

                <div 
                  className="bg-card rounded-2xl p-6 shadow-soft cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" 
                  onClick={() => setActiveTab("users")}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  <p className="text-muted-foreground font-medium">Total Users</p>
                  <p className="text-sm text-muted-foreground mt-2">{stats.totalOwners} owners</p>
                </div>

                <div 
                  className="bg-card rounded-2xl p-6 shadow-soft cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" 
                  onClick={() => setActiveTab("rooms")}
                >
                  <div className="flex items-center justify-between mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <p className="text-3xl font-bold">{stats.activeRooms + stats.activeMess}</p>
                  <p className="text-muted-foreground font-medium">Active Listings</p>
                </div>
              </div>

              {/* Recent Listings */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card rounded-2xl p-6 shadow-soft">
                  <h3 className="font-semibold text-lg mb-4">Recent Rooms</h3>
                  <div className="space-y-3">
                    {allRooms.slice(0, 5).map((room) => (
                      <div key={room.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <img
                          src={room.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=100"}
                          alt=""
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{room.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {room.owner_name}
                          </p>
                        </div>
                        {room.is_verified ? (
                          <Badge className="bg-success text-white text-xs">Verified</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </div>
                    ))}
                    {allRooms.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No rooms yet</p>
                    )}
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-soft">
                  <h3 className="font-semibold text-lg mb-4">Recent Mess</h3>
                  <div className="space-y-3">
                    {allMess.slice(0, 5).map((mess) => (
                      <div key={mess.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <img
                          src={mess.images?.[0] || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100"}
                          alt=""
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{mess.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {mess.owner_name}
                          </p>
                        </div>
                        {mess.is_verified ? (
                          <Badge className="bg-success text-white text-xs">Verified</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </div>
                    ))}
                    {allMess.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No mess yet</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* All Rooms Tab */}
            <TabsContent value="rooms">
              <div className="bg-card rounded-2xl p-6 shadow-soft">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <h2 className="font-heading font-semibold text-xl">All Room Listings</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search rooms or owners..."
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loadingRooms ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No rooms found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRooms.map((room) => (
                      <div key={room.id} className="flex items-start gap-4 p-4 bg-muted rounded-xl">
                        <img
                          src={room.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200"}
                          alt={room.title}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold">{room.title}</h3>
                            {room.is_verified && (
                              <Badge className="bg-success text-white">Verified</Badge>
                            )}
                            {!room.is_active && (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{room.location}</p>
                          <p className="font-semibold text-primary">₹{room.price?.toLocaleString()}/month</p>

                          {/* Owner Info */}
                          <div className="mt-2 flex items-center gap-2 p-2 bg-background rounded-lg">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div className="text-sm">
                              <span className="font-medium">{room.owner_name}</span>
                              <span className="text-muted-foreground ml-2">{room.owner_email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant={room.is_verified ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleRoomVerification(room.id, room.is_verified)}
                            className="gap-1"
                          >
                            {room.is_verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {room.is_verified ? "Verified" : "Verify"}
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleRoomActive(room.id, room.is_active)}
                              title={room.is_active ? "Hide" : "Show"}
                            >
                              {room.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setEditingRoom(room)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => deleteRoom(room.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Room Transaction Logs Section */}
                <div className="mt-8 pt-6 border-t space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-semibold text-lg flex items-center gap-2 text-foreground">
                        <Building2 className="w-5 h-5 text-blue-500" />
                        Room Transaction Logs
                      </h3>
                      <p className="text-xs text-muted-foreground">Real-time payment history and booking transactions for rooms</p>
                    </div>
                    <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/5">
                      {allTransactions.filter(t => !String(t.listingType || t.listing_type || "").toLowerCase().includes("mess")).length} Room Payments
                    </Badge>
                  </div>

                  {(() => {
                    const roomTxns = allTransactions.filter(t => {
                      const lType = String(t.listingType || t.listing_type || "").toLowerCase();
                      return !lType.includes("mess") && !lType.includes("subscrip");
                    });

                    if (roomTxns.length === 0) {
                      return (
                        <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed">
                          <p className="text-sm text-muted-foreground">No room transactions recorded yet</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto bg-muted/20 rounded-xl border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground bg-muted/40">
                              <th className="text-left py-3 px-4 font-semibold">Payment ID</th>
                              <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                              <th className="text-left py-3 px-4 font-semibold">Customer</th>
                              <th className="text-left py-3 px-4 font-semibold">Room Listing</th>
                              <th className="text-left py-3 px-4 font-semibold">Amount</th>
                              <th className="text-left py-3 px-4 font-semibold">Status</th>
                              <th className="text-right py-3 px-4 font-semibold">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roomTxns.map((txn, idx) => (
                              <tr key={txn.id || txn.paymentId || idx} className="border-b hover:bg-muted/30">
                                <td className="py-3 px-4 font-mono text-xs max-w-[120px] truncate" title={txn.paymentId || txn.transactionId}>{txn.paymentId || txn.transactionId || txn.id}</td>
                                <td className="py-3 px-4 font-mono text-xs max-w-[120px] truncate" title={txn.orderId}>{txn.orderId}</td>
                                <td className="py-3 px-4">
                                  <div className="font-medium">{txn.userName}</div>
                                  <div className="text-xs text-muted-foreground">{txn.userEmail}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-medium max-w-[180px] truncate">{txn.listingTitle}</div>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 mt-1 uppercase border-blue-500/30 text-blue-500">
                                    ROOM BOOKING
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 font-semibold text-foreground">₹{Number(txn.amount || 0).toLocaleString()}</td>
                                <td className="py-3 px-4">
                                  <Badge variant={txn.status === "success" || txn.status === "paid" ? "success" as any : "secondary"} className="capitalize">
                                    {txn.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right text-muted-foreground text-xs">{new Date(txn.timestamp || txn.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>

            {/* All Mess Tab */}
            <TabsContent value="mess">
              <div className="bgΓÇôcard rounded-2xl p-6 shadow-soft">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <h2 className="font-heading font-semibold text-xl">All Mess Listings</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search mess or owners..."
                      value={messSearch}
                      onChange={(e) => setMessSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loadingMess ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredMess.length === 0 ? (
                  <div className="text-center py-12">
                    <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No mess found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMess.map((mess) => (
                      <div key={mess.id} className="flex items-start gap-4 p-4 bg-muted rounded-xl">
                        <img
                          src={mess.images?.[0] || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200"}
                          alt={mess.name}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold">{mess.name}</h3>
                            {mess.is_verified && (
                              <Badge className="bg-success text-white">Verified</Badge>
                            )}
                            {!mess.is_active && (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                            <Badge variant="outline">{mess.food_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{mess.location}</p>
                          <p className="font-semibold text-primary">₹{mess.price_per_month?.toLocaleString()}/month</p>

                          {/* Owner Info */}
                          <div className="mt-2 flex items-center gap-2 p-2 bg-background rounded-lg">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div className="text-sm">
                              <span className="font-medium">{mess.owner_name}</span>
                              <span className="text-muted-foreground ml-2">{mess.owner_email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant={mess.is_verified ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMessVerification(mess.id, mess.is_verified)}
                            className="gap-1"
                          >
                            {mess.is_verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {mess.is_verified ? "Verified" : "Verify"}
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleMessActive(mess.id, mess.is_active)}
                              title={mess.is_active ? "Hide" : "Show"}
                            >
                              {mess.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setEditingMess(mess)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => deleteMess(mess.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mess Transaction Logs Section */}
                <div className="mt-8 pt-6 border-t space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-semibold text-lg flex items-center gap-2 text-foreground">
                        <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                        Mess Transaction Logs
                      </h3>
                      <p className="text-xs text-muted-foreground">Real-time payment history and subscription transactions for mess</p>
                    </div>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5">
                      {allTransactions.filter(t => String(t.listingType || t.listing_type || "").toLowerCase().includes("mess") || String(t.listingType || t.listing_type || "").toLowerCase().includes("subscrip")).length} Mess Payments
                    </Badge>
                  </div>

                  {(() => {
                    const messTxns = allTransactions.filter(t => {
                      const lType = String(t.listingType || t.listing_type || "").toLowerCase();
                      return lType.includes("mess") || lType.includes("subscrip");
                    });

                    if (messTxns.length === 0) {
                      return (
                        <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed">
                          <p className="text-sm text-muted-foreground">No mess transactions recorded yet</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto bg-muted/20 rounded-xl border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground bg-muted/40">
                              <th className="text-left py-3 px-4 font-semibold">Payment ID</th>
                              <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                              <th className="text-left py-3 px-4 font-semibold">Customer</th>
                              <th className="text-left py-3 px-4 font-semibold">Mess Listing</th>
                              <th className="text-left py-3 px-4 font-semibold">Amount</th>
                              <th className="text-left py-3 px-4 font-semibold">Status</th>
                              <th className="text-right py-3 px-4 font-semibold">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {messTxns.map((txn, idx) => (
                              <tr key={txn.id || txn.paymentId || idx} className="border-b hover:bg-muted/30">
                                <td className="py-3 px-4 font-mono text-xs max-w-[120px] truncate" title={txn.paymentId || txn.transactionId}>{txn.paymentId || txn.transactionId || txn.id}</td>
                                <td className="py-3 px-4 font-mono text-xs max-w-[120px] truncate" title={txn.orderId}>{txn.orderId}</td>
                                <td className="py-3 px-4">
                                  <div className="font-medium">{txn.userName}</div>
                                  <div className="text-xs text-muted-foreground">{txn.userEmail}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-medium max-w-[180px] truncate">{txn.listingTitle}</div>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 mt-1 uppercase border-amber-500/30 text-amber-500">
                                    MESS SUBSCRIPTION
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 font-semibold text-foreground">₹{Number(txn.amount || 0).toLocaleString()}</td>
                                <td className="py-3 px-4">
                                  <Badge variant={txn.status === "success" || txn.status === "paid" ? "success" as any : "secondary"} className="capitalize">
                                    {txn.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right text-muted-foreground text-xs">{new Date(txn.timestamp || txn.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <div className="bg-card rounded-2xl p-6 shadow-soft">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <h2 className="font-heading font-semibold text-xl">User Management</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold">User</th>
                          <th className="text-left py-3 px-4 font-semibold">Email</th>
                          <th className="text-left py-3 px-4 font-semibold">Role</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Joined</th>
                          <th className="text-center py-3 px-4 font-semibold">Change Role</th>
                          <th className="text-right py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((userData) => (
                          <tr key={userData.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer" onClick={() => setSelectedUserForDetails(userData)}>
                                  <span className="font-semibold text-primary">
                                    {userData.full_name?.charAt(0) || userData.email?.charAt(0) || "U"}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5" onClick={() => setSelectedUserForDetails(userData)}>
                                    {userData.full_name || "N/A"}
                                    {userData.is_verified && (
                                      <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-0.5" title="Verified Identity">
                                        <Check className="w-2.5 h-2.5 stroke-[4]" />
                                      </span>
                                    )}
                                  </span>
                                  {userData.shadow_banned && (
                                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded w-max">
                                      Shadow Banned
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{userData.email}</td>
                            <td className="py-3 px-4">
                              <Badge variant={
                                userData.role === "admin" ? "destructive" :
                                  userData.role === "owner" ? "default" : "secondary"
                              }>
                                {userData.role || "user"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={
                                userData.status === "active" ? "bg-success text-white" :
                                userData.status === "suspended" ? "bg-amber-600 text-white" :
                                "bg-destructive text-white"
                              }>
                                {userData.status || "active"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(userData.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {userData.role === "admin" ? (
                                <span className="text-sm font-medium text-muted-foreground">-</span>
                              ) : (
                                <select
                                  value={userData.role || "user"}
                                  onChange={(e) => changeUserRole(userData.id, e.target.value)}
                                  className="h-9 px-3 rounded-md border border-input bg-background text-sm cursor-pointer"
                                >
                                  <option value="user">User</option>
                                  <option value="owner">Owner</option>
                                  <option value="admin">Admin</option>
                                </select>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedUserForDetails(userData)}
                                  className="text-xs h-8 text-primary hover:bg-primary/10"
                                >
                                  View Details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setUserToDelete({ id: userData.id, email: userData.email })}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                                  disabled={userData.id === user?.id}
                                  title={userData.id === user?.id ? "You cannot delete yourself" : "Delete User"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <div className="bg-card rounded-2xl p-6 shadow-soft space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-4">
                  <div>
                    <h2 className="font-heading font-semibold text-xl">Platform Bookings & Subscriptions</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage room bookings, mess subscriptions, and manual overrides</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleExportCSV} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs">
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-2 h-9 text-xs" onClick={() => setShowClearBkConfirm(true)}>
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Bookings
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchBookingsData} title="Refresh bookings">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/40 rounded-xl">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Status</label>
                    <select
                      value={bookingFilters.status}
                      onChange={(e) => setBookingFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="confirmed">Confirmed / Active</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed / Expired</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">From Date</label>
                    <Input
                      type="date"
                      value={bookingFilters.dateFrom}
                      onChange={(e) => setBookingFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">To Date</label>
                    <Input
                      type="date"
                      value={bookingFilters.dateTo}
                      onChange={(e) => setBookingFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">City</label>
                    <Input
                      placeholder="e.g. Pune, Mumbai"
                      value={bookingFilters.city}
                      onChange={(e) => setBookingFilters(prev => ({ ...prev, city: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                </div>

                {loadingBookings ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No bookings matched your filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-3 px-4 font-semibold">Booking ID</th>
                          <th className="text-left py-3 px-4 font-semibold">Customer</th>
                          <th className="text-left py-3 px-4 font-semibold">Listing</th>
                          <th className="text-left py-3 px-4 font-semibold">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold">Booking Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Payment</th>
                          <th className="text-left py-3 px-4 font-semibold">Override Reason</th>
                          <th className="text-right py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((b) => (
                          <tr key={b.id} className="border-b hover:bg-muted/30">
                            <td className="py-3 px-4 font-mono text-xs max-w-[120px] truncate" title={b.id}>
                              {b.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{b.userName}</div>
                              <div className="text-xs text-muted-foreground">{b.userEmail}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium max-w-[180px] truncate" title={b.listingTitle}>{b.listingTitle}</div>
                              <div className="flex gap-2 items-center mt-1">
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase font-semibold">
                                  {b.listingType}
                                </Badge>
                                {b.city && (
                                  <span className="text-[11px] text-muted-foreground font-medium">📍 {b.city}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              ₹{b.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  b.status === "confirmed" || b.status === "active" ? "success" as any :
                                  b.status === "cancelled" ? "destructive" :
                                  b.status === "completed" || b.status === "expired" ? "secondary" : "default"
                                }
                                className="capitalize"
                              >
                                {b.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  b.paymentStatus === "paid" ? "success" as any :
                                  b.paymentStatus === "refunded" ? "destructive" : "secondary"
                                }
                                className="capitalize"
                              >
                                {b.paymentStatus}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground italic max-w-[150px] truncate" title={b.override_reason}>
                              {b.override_reason || "-"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex gap-1.5 justify-end">
                                {/* Force Confirm */}
                                {(b.status !== "confirmed" && b.status !== "active") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 bg-success/10 text-success hover:bg-success hover:text-white border-success/20 text-xs"
                                    onClick={() => setOverrideModal({ booking: b, action: "confirm" })}
                                  >
                                    Force Confirm
                                  </Button>
                                )}
                                {/* Force Cancel */}
                                {b.status !== "cancelled" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20 text-xs"
                                    onClick={() => setOverrideModal({ booking: b, action: "cancel" })}
                                  >
                                    Force Cancel
                                  </Button>
                                )}
                                {/* Refund Button */}
                                {b.paymentStatus === "paid" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 bg-amber-600/10 text-amber-600 hover:bg-amber-600 hover:text-white border-amber-600/20 text-xs"
                                    disabled={refundingBookingId === b.id}
                                    onClick={() => handleTriggerRefund(b)}
                                  >
                                    {refundingBookingId === b.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    ) : null}
                                    Refund
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <div className="bg-card rounded-2xl p-6 shadow-soft space-y-6">

                {/* Financial Summary & Commission Breakdown Header */}
                <div className="border-b pb-6 space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
                        <Coins className="w-6 h-6 text-primary" />
                        Financial Overview & Commission Analytics
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Track total revenue balances, week/month/year earnings, and platform commission ({commissionRate}%) separately for Rooms and Mess.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs py-1 px-3 bg-primary/5 text-primary border-primary/20">
                        Commission Rate: {commissionRate}%
                      </Badge>
                      <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={fetchTransactionsData}>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh Stats
                      </Button>
                    </div>
                  </div>

                  {/* Summary Cards Grid */}
                  {(() => {
                    const stats = getTransactionStats();
                    return (
                      <div className="space-y-6 pt-2">
                        {/* 4 Time-based Overview Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* This Week */}
                          <div className="bg-card p-4 rounded-xl border shadow-soft space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Week</span>
                              <Badge variant="secondary" className="text-[10px]">Current Week</Badge>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-foreground">₹{stats.week.toLocaleString()}</div>
                              <div className="text-xs text-primary font-medium mt-0.5">
                                Commission: ₹{Math.round(stats.weekCommission).toLocaleString()}
                              </div>
                            </div>
                            <div className="pt-2 border-t text-xs space-y-1 text-muted-foreground">
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-blue-500" /> Room:</span>
                                <span className="font-medium text-foreground">₹{stats.roomWeek.toLocaleString()} <span className="text-[10px] text-muted-foreground">(₹{Math.round(stats.roomWeekCommission)})</span></span>
                              </div>
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3 text-amber-500" /> Mess:</span>
                                <span className="font-medium text-foreground">₹{stats.messWeek.toLocaleString()} <span className="text-[10px] text-muted-foreground">(₹{Math.round(stats.messWeekCommission)})</span></span>
                              </div>
                            </div>
                          </div>

                          {/* This Month */}
                          <div className="bg-card p-4 rounded-xl border shadow-soft space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Month</span>
                              <Badge variant="secondary" className="text-[10px]">Current Month</Badge>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-foreground">₹{stats.month.toLocaleString()}</div>
                              <div className="text-xs text-primary font-medium mt-0.5">
                                Commission: ₹{Math.round(stats.monthCommission).toLocaleString()}
                              </div>
                            </div>
                            <div className="pt-2 border-t text-xs space-y-1 text-muted-foreground">
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-blue-500" /> Room:</span>
                                <span className="font-medium text-foreground">₹{stats.roomMonth.toLocaleString()} <span className="text-[10px] text-muted-foreground">(₹{Math.round(stats.roomMonthCommission)})</span></span>
                              </div>
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3 text-amber-500" /> Mess:</span>
                                <span className="font-medium text-foreground">₹{stats.messMonth.toLocaleString()} <span className="text-[10px] text-muted-foreground">(₹{Math.round(stats.messMonthCommission)})</span></span>
                              </div>
                            </div>
                          </div>

                          {/* This Year */}
                          <div className="bg-card p-4 rounded-xl border shadow-soft space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Year</span>
                              <Badge variant="secondary" className="text-[10px]">Current Year</Badge>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-foreground">₹{stats.year.toLocaleString()}</div>
                              <div className="text-xs text-primary font-medium mt-0.5">
                                Commission: ₹{Math.round(stats.yearCommission).toLocaleString()}
                              </div>
                            </div>
                            <div className="pt-2 border-t text-xs space-y-1 text-muted-foreground">
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-blue-500" /> Room:</span>
                                <span className="font-medium text-foreground">₹{stats.roomYear.toLocaleString()} <span className="text-[10px] text-muted-foreground">(₹{Math.round(stats.roomYearCommission)})</span></span>
                              </div>
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3 text-amber-500" /> Mess:</span>
                                <span className="font-medium text-foreground">₹{stats.messYear.toLocaleString()} <span className="text-[10px] text-muted-foreground">(₹{Math.round(stats.messYearCommission)})</span></span>
                              </div>
                            </div>
                          </div>

                          {/* Total Cumulative Balance */}
                          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 rounded-xl border border-primary/20 shadow-soft space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-primary uppercase tracking-wider">All-Time Total</span>
                              <Badge className="text-[10px] bg-primary text-white">All Time</Badge>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-primary">₹{stats.total.toLocaleString()}</div>
                              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                Total Comm: ₹{Math.round(stats.commission).toLocaleString()}
                              </div>
                            </div>
                            <div className="pt-2 border-t border-primary/10 text-xs space-y-1 text-muted-foreground">
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-blue-500" /> Room Total:</span>
                                <span className="font-medium text-foreground">₹{stats.roomTotal.toLocaleString()} <span className="text-[10px] text-muted-foreground">(₹{Math.round(stats.roomTotalCommission)})</span></span>
                              </div>
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3 text-amber-500" /> Mess Total:</span>
                                <span className="font-medium text-foreground">₹{stats.messTotal.toLocaleString()} <span className="text-[10px] text-muted-foreground">(₹{Math.round(stats.messTotalCommission)})</span></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Comparative Cards: Room vs Mess Revenue & Commission Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Room Category Breakdown Card */}
                          <div className="bg-card p-5 rounded-xl border space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                  <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-heading font-semibold text-base">Room Bookings Revenue</h3>
                                  <p className="text-xs text-muted-foreground">Detailed Room balance and commission figures</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/5">Room Category</Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-muted/40 rounded-lg">
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Current Week</p>
                                <p className="text-lg font-bold text-foreground mt-0.5">₹{stats.roomWeek.toLocaleString()}</p>
                                <p className="text-xs text-primary font-medium">Comm: ₹{Math.round(stats.roomWeekCommission).toLocaleString()}</p>
                              </div>
                              <div className="p-3 bg-muted/40 rounded-lg">
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Current Month</p>
                                <p className="text-lg font-bold text-foreground mt-0.5">₹{stats.roomMonth.toLocaleString()}</p>
                                <p className="text-xs text-primary font-medium">Comm: ₹{Math.round(stats.roomMonthCommission).toLocaleString()}</p>
                              </div>
                              <div className="p-3 bg-muted/40 rounded-lg">
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Current Year</p>
                                <p className="text-lg font-bold text-foreground mt-0.5">₹{stats.roomYear.toLocaleString()}</p>
                                <p className="text-xs text-primary font-medium">Comm: ₹{Math.round(stats.roomYearCommission).toLocaleString()}</p>
                              </div>
                              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-900/50">
                                <p className="text-[11px] text-blue-600 dark:text-blue-400 uppercase font-semibold">Total Room Balance</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">₹{stats.roomTotal.toLocaleString()}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Total Comm: ₹{Math.round(stats.roomTotalCommission).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Mess Category Breakdown Card */}
                          <div className="bg-card p-5 rounded-xl border space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                  <UtensilsCrossed className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-heading font-semibold text-base">Mess Subscriptions Revenue</h3>
                                  <p className="text-xs text-muted-foreground">Detailed Mess balance and commission figures</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5">Mess Category</Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-muted/40 rounded-lg">
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Current Week</p>
                                <p className="text-lg font-bold text-foreground mt-0.5">₹{stats.messWeek.toLocaleString()}</p>
                                <p className="text-xs text-primary font-medium">Comm: ₹{Math.round(stats.messWeekCommission).toLocaleString()}</p>
                              </div>
                              <div className="p-3 bg-muted/40 rounded-lg">
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Current Month</p>
                                <p className="text-lg font-bold text-foreground mt-0.5">₹{stats.messMonth.toLocaleString()}</p>
                                <p className="text-xs text-primary font-medium">Comm: ₹{Math.round(stats.messMonthCommission).toLocaleString()}</p>
                              </div>
                              <div className="p-3 bg-muted/40 rounded-lg">
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Current Year</p>
                                <p className="text-lg font-bold text-foreground mt-0.5">₹{stats.messYear.toLocaleString()}</p>
                                <p className="text-xs text-primary font-medium">Comm: ₹{Math.round(stats.messYearCommission).toLocaleString()}</p>
                              </div>
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-900/50">
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Total Mess Balance</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">₹{stats.messTotal.toLocaleString()}</p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Total Comm: ₹{Math.round(stats.messTotalCommission).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
                  <div>
                    <h2 className="font-heading font-semibold text-xl">Razorpay Transaction Log Viewer</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Real-time payment history and webhook logs from Razorpay Gateway</p>
                  </div>
                  
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl">
                    <Button
                      variant={transactionCategoryFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs font-medium px-3 rounded-lg"
                      onClick={() => setTransactionCategoryFilter("all")}
                    >
                      All ({allTransactions.length})
                    </Button>
                    <Button
                      variant={transactionCategoryFilter === "room" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs font-medium px-3 rounded-lg gap-1"
                      onClick={() => setTransactionCategoryFilter("room")}
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      Room ({allTransactions.filter(t => !String(t.listingType || t.listing_type || "").toLowerCase().includes("mess")).length})
                    </Button>
                    <Button
                      variant={transactionCategoryFilter === "mess" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs font-medium px-3 rounded-lg gap-1"
                      onClick={() => setTransactionCategoryFilter("mess")}
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                      Mess ({allTransactions.filter(t => String(t.listingType || t.listing_type || "").toLowerCase().includes("mess") || String(t.listingType || t.listing_type || "").toLowerCase().includes("subscrip")).length})
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-2 h-9 text-xs" onClick={() => setShowClearTxConfirm(true)}>
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Logs
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchTransactionsData} title="Refresh transaction list">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {loadingTransactions ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (() => {
                  const filteredTxns = allTransactions.filter(t => {
                    const lType = String(t.listingType || t.listing_type || "").toLowerCase();
                    const isMess = lType.includes("mess") || lType.includes("subscrip");
                    if (transactionCategoryFilter === "mess") return isMess;
                    if (transactionCategoryFilter === "room") return !isMess;
                    return true;
                  });

                  if (filteredTxns.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <CreditCard className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                          {transactionCategoryFilter === "mess" ? "No mess transaction logs available" : transactionCategoryFilter === "room" ? "No room transaction logs available" : "No transaction logs available"}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-3 px-4 font-semibold">Payment ID</th>
                            <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                            <th className="text-left py-3 px-4 font-semibold">Customer</th>
                            <th className="text-left py-3 px-4 font-semibold">Listing / Plan</th>
                            <th className="text-left py-3 px-4 font-semibold">Amount</th>
                            <th className="text-left py-3 px-4 font-semibold">Status</th>
                            <th className="text-right py-3 px-4 font-semibold">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTxns.map((txn, idx) => (
                            <tr key={txn.id || txn.paymentId || idx} className="border-b hover:bg-muted/30">
                              <td className="py-3 px-4 font-mono text-xs max-w-[120px] truncate" title={txn.paymentId || txn.transactionId}>
                                {txn.paymentId || txn.transactionId || txn.id}
                              </td>
                              <td className="py-3 px-4 font-mono text-xs max-w-[120px] truncate" title={txn.orderId}>
                                {txn.orderId}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium">{txn.userName}</div>
                                <div className="text-xs text-muted-foreground">{txn.userEmail}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium max-w-[180px] truncate">{txn.listingTitle}</div>
                                <Badge variant="outline" className="text-[10px] py-0 px-1 mt-1 uppercase">
                                  {txn.planType} ({txn.listingType})
                                </Badge>
                              </td>
                              <td className="py-3 px-4 font-semibold text-foreground">
                                ₹{txn.amount.toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant={
                                    txn.status === "success" || txn.status === "paid" ? "success" as any :
                                    txn.status === "failed" || txn.status === "refunded" ? "destructive" : "secondary"
                                  }
                                  className="capitalize"
                                >
                                  {txn.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                                <div className="flex items-center justify-end gap-2">
                                  <span>{new Date(txn.timestamp || txn.created_at).toLocaleString()}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                    onClick={() => setTxnToDelete(txn)}
                                    title="Delete Transaction Record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-8">
              {/* Third-Party API Status Panel & Feature Flags Controls */}
              <SystemTechnicalControls />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Platform & Customization Settings */}
                <div className="lg:col-span-6 bg-card rounded-2xl p-6 shadow-soft space-y-8 border">
                  <div>
                    <h2 className="font-heading font-semibold text-xl text-foreground">Platform Customization</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Control global parameters, featured cities, banners, and maintenance status</p>
                  </div>

                  <div className="space-y-6">
                    {/* Platform Commission Fee */}
                    <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                      <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                        <span>Platform Commission Fee (%)</span>
                        <span className="bg-primary/10 text-primary font-semibold py-0.5 px-2 rounded-md text-xs">
                          {commissionRate}%
                        </span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        This fee percentage is automatically deducted from payouts to property and mess owners.
                      </p>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={commissionRate}
                          onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                          className="w-24 bg-background"
                        />
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="0.5"
                          value={commissionRate}
                          onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                          className="flex-1 accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Pricing & Monetization */}
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border">
                      <label className="text-sm font-semibold text-foreground block">Pricing & Monetization Settings</label>
                      <p className="text-xs text-muted-foreground">
                        Configure pricing variables, referral rewards, and rent price validation bounds.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-semibold text-muted-foreground" htmlFor="featured-price">
                            Featured Price (₹)
                          </label>
                          <Input
                            id="featured-price"
                            type="number"
                            min="0"
                            value={featuredListingPrice}
                            onChange={(e) => setFeaturedListingPrice(parseFloat(e.target.value) || 0)}
                            className="bg-background text-sm"
                          />
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-semibold text-muted-foreground" htmlFor="referral-reward">
                            Referral Reward (₹)
                          </label>
                          <Input
                            id="referral-reward"
                            type="number"
                            min="0"
                            value={referralRewardAmount}
                            onChange={(e) => setReferralRewardAmount(parseFloat(e.target.value) || 0)}
                            className="bg-background text-sm"
                          />
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-semibold text-muted-foreground" htmlFor="min-rent">
                            Min Rent Price (₹)
                          </label>
                          <Input
                            id="min-rent"
                            type="number"
                            min="0"
                            value={minRentPrice}
                            onChange={(e) => setMinRentPrice(parseFloat(e.target.value) || 0)}
                            className="bg-background text-sm"
                          />
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-semibold text-muted-foreground" htmlFor="max-rent">
                            Max Rent Price (₹)
                          </label>
                          <Input
                            id="max-rent"
                            type="number"
                            min="0"
                            value={maxRentPrice}
                            onChange={(e) => setMaxRentPrice(parseFloat(e.target.value) || 0)}
                            className="bg-background text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Maintenance Mode */}
                    <div className="space-y-3 bg-destructive/5 p-4 rounded-xl border border-destructive/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-semibold text-destructive block">Maintenance Mode</label>
                          <span className="text-xs text-muted-foreground">
                            Redirects all non-admin users to a 503 status page.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMaintenanceMode(!maintenanceMode)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                            maintenanceMode ? "bg-destructive" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                              maintenanceMode ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                      {maintenanceMode && (
                        <div className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/15">
                          ⚠️ Warning: Platform is currently locked down. Only admins can bypass this restriction.
                        </div>
                      )}
                    </div>

                    {/* Featured Cities */}
                    <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                      <label className="text-sm font-semibold text-foreground">Featured Cities</label>
                      <p className="text-xs text-muted-foreground">
                        Featured cities shown prominently on the homepage hero section.
                      </p>
                      
                      <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 bg-background border rounded-lg">
                        {featuredCities.map((city, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1 text-xs py-1">
                            {city}
                            <button
                              type="button"
                              onClick={() => setFeaturedCities(featuredCities.filter((_, i) => i !== idx))}
                              className="text-muted-foreground hover:text-foreground focus:outline-none rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        {featuredCities.length === 0 && (
                          <span className="text-xs text-muted-foreground p-1">No featured cities set.</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. Pune"
                          value={newCityName}
                          onChange={(e) => setNewCityName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newCityName.trim()) {
                                setFeaturedCities([...featuredCities, newCityName.trim()]);
                                setNewCityName("");
                              }
                            }
                          }}
                          className="bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (newCityName.trim()) {
                              setFeaturedCities([...featuredCities, newCityName.trim()]);
                              setNewCityName("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Homepage Banners */}
                    <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                      <label className="text-sm font-semibold text-foreground">Homepage Banners (URLs)</label>
                      <p className="text-xs text-muted-foreground">
                        Hero slider images rotated every 5 seconds on the landing page.
                      </p>

                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {homepageBanners.map((url, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-background border rounded-lg p-2 group relative">
                            <div className="w-12 h-8 rounded overflow-hidden bg-muted border flex-shrink-0">
                              <img src={url} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate flex-1">{url}</span>
                            <button
                              type="button"
                              onClick={() => setHomepageBanners(homepageBanners.filter((_, i) => i !== idx))}
                              className="text-destructive hover:bg-destructive/10 p-1.5 rounded-full"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {homepageBanners.length === 0 && (
                          <span className="text-xs text-muted-foreground block text-center py-4 bg-background border border-dashed rounded-lg">
                            No custom banner images added.
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Paste image URL here"
                          value={newBannerUrl}
                          onChange={(e) => setNewBannerUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newBannerUrl.trim()) {
                                setHomepageBanners([...homepageBanners, newBannerUrl.trim()]);
                                setNewBannerUrl("");
                              }
                            }
                          }}
                          className="bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (newBannerUrl.trim()) {
                              setHomepageBanners([...homepageBanners, newBannerUrl.trim()]);
                              setNewBannerUrl("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={handleSavePlatformSettings}
                      disabled={savingSettings}
                      className="w-full gap-2 mt-4"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Site Settings
                    </Button>
                  </div>
                </div>

                {/* Right Column: CMS Pages & Notification Templates */}
                <div className="lg:col-span-6 space-y-8">
                  
                  {/* CMS Static Pages Card */}
                  <div className="bg-card rounded-2xl p-6 shadow-soft border space-y-6">
                    <div>
                      <h2 className="font-heading font-semibold text-xl text-foreground">Static Pages CMS</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Edit About Us, Terms & Conditions, and Privacy Policy page content</p>
                    </div>

                    <div className="space-y-3">
                      {cmsPages.map((page) => (
                        <div key={page.id} className="p-4 bg-muted/20 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <span className="font-semibold text-sm text-foreground block">{page.title}</span>
                            <span className="text-xs text-muted-foreground font-mono">Slug: /p/{page.slug}</span>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCmsSlug(page.slug);
                              setCmsTitleInput(page.title);
                              setCmsContentInput(page.content);
                            }}
                            className="w-full md:w-auto"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit Page
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notification Templates Editor Card */}
                  <div className="bg-card rounded-2xl p-6 shadow-soft border space-y-6">
                    <div>
                      <h2 className="font-heading font-semibold text-xl text-foreground">Notification Copy Editor</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Customize default text/subject for system generated notifications</p>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {notifTemplates.map((tpl) => (
                        <div key={tpl.id} className="p-4 bg-muted/20 border rounded-xl space-y-3 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-foreground block uppercase tracking-wider text-[10px] bg-primary/10 text-primary py-0.5 px-2 rounded-md">
                              {tpl.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                              Channel: {tpl.channel}
                            </span>
                          </div>
                          
                          <div className="text-xs text-muted-foreground bg-background p-2.5 rounded-lg border">
                            {tpl.subject && <div className="font-semibold mb-1 text-foreground">Subject: {tpl.subject}</div>}
                            <div className="italic leading-normal">"{tpl.body}"</div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setEditingTemplateName(tpl.name);
                              setTemplateSubjectInput(tpl.subject || "");
                              setTemplateBodyInput(tpl.body);
                            }}
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit Copy
                          </Button>
                        </div>
                      ))}
                      {notifTemplates.length === 0 && (
                        <span className="text-xs text-muted-foreground block text-center py-4 bg-background border border-dashed rounded-lg">
                          No notification templates found.
                        </span>
                      )}
                    </div>
                  </div>

                </div>

              </div>
              
              {/* CMS Page Edit Dialog Modal */}
              {editingCmsSlug && (
                <Dialog open={true} onOpenChange={() => setEditingCmsSlug(null)}>
                  <DialogContent className="max-w-2xl bg-card">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Edit CMS Page: {editingCmsSlug}</DialogTitle>
                      <DialogDescription>
                        Modify page details. Markdown format is supported for headings and lists.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 text-left">
                      <div className="space-y-1.5">
                        <Label htmlFor="cms-title">Page Title</Label>
                        <Input
                          id="cms-title"
                          value={cmsTitleInput}
                          onChange={(e) => setCmsTitleInput(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cms-content">Page Content (Markdown/HTML)</Label>
                        <Textarea
                          id="cms-content"
                          rows={12}
                          value={cmsContentInput}
                          onChange={(e) => setCmsContentInput(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingCmsSlug(null)}>Cancel</Button>
                      <Button onClick={() => handleSaveCmsPage(editingCmsSlug)} disabled={savingCms}>
                        {savingCms ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Notification Template Edit Dialog Modal */}
              {editingTemplateName && (
                <Dialog open={true} onOpenChange={() => setEditingTemplateName(null)}>
                  <DialogContent className="max-w-xl bg-card">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Edit Copy: {editingTemplateName}</DialogTitle>
                      <DialogDescription>
                        Modify default templates. Supported variables: {"{{listingTitle}}"}, {"{{date}}"}, {"{{amount}}"}, {"{{newPrice}}"}, {"{{status}}"}.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 text-left">
                      <div className="space-y-1.5">
                        <Label htmlFor="tpl-subject">Email Subject</Label>
                        <Input
                          id="tpl-subject"
                          value={templateSubjectInput}
                          onChange={(e) => setTemplateSubjectInput(e.target.value)}
                          placeholder="e.g. Booking Confirmed!"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tpl-body">Notification Message Body</Label>
                        <Textarea
                          id="tpl-body"
                          rows={5}
                          value={templateBodyInput}
                          onChange={(e) => setTemplateBodyInput(e.target.value)}
                          placeholder="e.g. Your booking for {{listingTitle}} has been confirmed."
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingTemplateName(null)}>Cancel</Button>
                      <Button onClick={() => handleSaveNotificationTemplate(editingTemplateName)} disabled={savingTemplate}>
                        {savingTemplate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

            </TabsContent>

            {/* Reports Queue Tab */}
            <TabsContent value="reports">
              <div className="bg-card rounded-2xl p-6 shadow-soft space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="font-heading font-semibold text-xl">Reports Queue</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Moderation reports filed against listings, users, and reviews</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchReportsData} title="Refresh reports list">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {loadingReports ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : allReports.filter(r => r.status === "open").length === 0 ? (
                  <div className="text-center py-12">
                    <AlertOctagon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">All reports resolved! No open reports in queue.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-3 px-4 font-semibold">Target / Subject</th>
                          <th className="text-left py-3 px-4 font-semibold">Report Reason</th>
                          <th className="text-left py-3 px-4 font-semibold">Filed By</th>
                          <th className="text-left py-3 px-4 font-semibold">Date Reported</th>
                          <th className="text-right py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allReports.filter(r => r.status === "open").map((r) => {
                          const details = getTargetDetails(r.target_type, r.target_id);
                          return (
                            <tr key={r.id} className="border-b hover:bg-muted/30">
                              <td className="py-3 px-4">
                                <div className="font-semibold capitalize text-foreground">{details.name}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[250px]">{details.sub}</div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground italic max-w-[300px]">
                                "{r.reason}"
                              </td>
                              <td className="py-3 px-4 text-xs font-medium">
                                {getReporterInfo(r.reporter_id)}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground text-xs">
                                {new Date(r.created_at).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                  {/* Resolve Report */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResolveReport(r.id)}
                                    disabled={resolvingReportId === r.id}
                                    className="bg-success/10 hover:bg-success/20 border-success/30 text-success h-8 text-xs font-semibold"
                                  >
                                    Resolve
                                  </Button>

                                  {/* Action based on target type */}
                                  {r.target_type === "listing" && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteReportListing(r.id, r.target_id, details.name.toLowerCase().includes("room") ? "room" : "mess")}
                                      disabled={resolvingReportId === r.id}
                                      className="h-8 text-xs"
                                    >
                                      Delete Listing
                                    </Button>
                                  )}

                                  {r.target_type === "user" && (
                                    <Button
                                      variant={details.sub.includes("BANNED") ? "outline" : "destructive"}
                                      size="sm"
                                      onClick={() => handleBanReportUser(r.id, r.target_id, !details.sub.includes("BANNED"))}
                                      disabled={resolvingReportId === r.id}
                                      className="h-8 text-xs"
                                    >
                                      {details.sub.includes("BANNED") ? "Unban User" : "Ban User"}
                                    </Button>
                                  )}

                                  {r.target_type === "review" && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteReportReview(r.id, r.target_id)}
                                      disabled={resolvingReportId === r.id}
                                      className="h-8 text-xs"
                                    >
                                      Delete Review
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Review Moderation Tab */}
            <TabsContent value="reviews">
              <div className="bg-card rounded-2xl p-6 shadow-soft space-y-6">
                <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="font-heading font-semibold text-xl">Review Moderation</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage and moderate user-submitted reviews and ratings</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchReviewsData} title="Refresh reviews list">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-4 p-4 bg-muted/40 rounded-xl flex-wrap">
                  <div className="w-48">
                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Status</label>
                    <select
                      value={reviewFilters.status}
                      onChange={(e) => setReviewFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="flagged">Flagged</option>
                    </select>
                  </div>
                  <div className="w-48">
                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Rating</label>
                    <select
                      value={reviewFilters.rating}
                      onChange={(e) => setReviewFilters(prev => ({ ...prev, rating: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm cursor-pointer"
                    >
                      <option value="all">All Ratings</option>
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                </div>

                {loadingReviews ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : allReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No reviews found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-3 px-4 font-semibold">User</th>
                          <th className="text-left py-3 px-4 font-semibold">Listing</th>
                          <th className="text-left py-3 px-4 font-semibold">Review</th>
                          <th className="text-left py-3 px-4 font-semibold">Rating</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-right py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allReviews
                          .filter(r => reviewFilters.status === "all" || r.status === reviewFilters.status)
                          .filter(r => reviewFilters.rating === "all" || r.rating.toString() === reviewFilters.rating)
                          .map((r) => {
                            const reviewer = allUsers.find(u => u.id === r.user_id);
                            const targetRoom = allRooms.find(x => x.id === r.listing_id);
                            const targetMess = allMess.find(x => x.id === r.listing_id);
                            const listingName = targetRoom ? targetRoom.title : (targetMess ? targetMess.name : `Listing ID: ${r.listing_id}`);
                            return (
                              <tr key={r.id} className="border-b hover:bg-muted/30">
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-foreground">{reviewer ? reviewer.full_name : "Unknown User"}</div>
                                  <div className="text-xs text-muted-foreground">{reviewer ? reviewer.email : `ID: ${r.user_id}`}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-medium max-w-[200px] truncate" title={listingName}>{listingName}</div>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 mt-1 capitalize">
                                    {r.listing_type}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 max-w-[300px] break-words text-muted-foreground italic">
                                  "{r.comment}"
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex text-amber-500 font-semibold gap-0.5">
                                    {r.rating} â˜…
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge
                                    variant={
                                      r.status === "approved" ? "success" as any :
                                      r.status === "flagged" ? "destructive" : "warning"
                                    }
                                    className="capitalize"
                                  >
                                    {r.status || "pending"}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    {r.status !== "approved" && (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleUpdateReviewStatus(r.id, "approved")}
                                        title="Approve Review"
                                        className="h-8 w-8 text-success hover:bg-success/10"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </Button>
                                    )}

                                    {r.status !== "flagged" && (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleUpdateReviewStatus(r.id, "flagged")}
                                        title="Flag Review"
                                        className="h-8 w-8 text-amber-600 hover:bg-amber-100"
                                      >
                                        <Flag className="w-4 h-4" />
                                      </Button>
                                    )}

                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        setEditingReview(r);
                                        setEditReviewComment(r.comment);
                                        setEditReviewRating(r.rating);
                                      }}
                                      title="Edit Review Content"
                                      className="h-8 w-8"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteReviewRecord(r.id)}
                                      title="Permanently Delete Review"
                                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Repeat Offenders & Fraud Safety Tab */}
            <TabsContent value="offenders" className="space-y-8">
              {/* Fraud & Safety Detection (Duplicate Listings & Blacklist) */}
              <FraudSafetyPanel />
              <div className="bg-card rounded-2xl p-6 shadow-soft space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="font-heading font-semibold text-xl">Repeat Offenders Tracking</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Users with 2 or more active moderation reports filed against them</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchReportsData} title="Refresh reports">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {loadingReports ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : getRepeatOffendersList().length === 0 ? (
                  <div className="text-center py-12">
                    <ShieldCheck className="w-16 h-16 mx-auto text-success/50 mb-4" />
                    <p className="text-muted-foreground">Clean slate! No users with 2+ active reports against them.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-3 px-4 font-semibold">User details</th>
                          <th className="text-left py-3 px-4 font-semibold">Report Count</th>
                          <th className="text-left py-3 px-4 font-semibold">Details of Offences</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-right py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getRepeatOffendersList().map((o) => (
                          <tr key={o.userId} className="border-b hover:bg-muted/30">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">{o.name}</div>
                              <div className="text-xs text-muted-foreground">{o.email}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {o.userId}</div>
                            </td>
                            <td className="py-3 px-4 font-bold text-destructive text-lg">
                              {o.count} reports
                            </td>
                            <td className="py-3 px-4 max-w-[350px]">
                              <div className="space-y-1.5">
                                {o.reports.map((r, idx) => (
                                  <div key={r.id} className="text-xs border-l-2 border-destructive/30 pl-2 py-0.5">
                                    <span className="font-semibold capitalize text-foreground">{r.target_type}:</span>{" "}
                                    <span className="text-muted-foreground italic">"{r.reason}"</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={o.isBanned ? "destructive" : "secondary"}>
                                {o.isBanned ? "Banned" : "Active"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant={o.isBanned ? "outline" : "destructive"}
                                size="sm"
                                onClick={() => handleToggleBanOnly(o.userId, o.isBanned)}
                                className="h-8 text-xs font-semibold"
                              >
                                {o.isBanned ? "Lift Ban" : "Ban User"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-semibold text-xl">Edit Room</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingRoom(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Owner:</span>{" "}
                <span className="font-medium">{editingRoom.owner_name}</span>{" "}
                <span className="text-muted-foreground">({editingRoom.owner_email})</span>
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  value={editingRoom.title}
                  onChange={(e) => setEditingRoom({ ...editingRoom, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingRoom.description || ""}
                  onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <Input
                    value={editingRoom.location}
                    onChange={(e) => setEditingRoom({ ...editingRoom, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={editingRoom.city || ""}
                    onChange={(e) => setEditingRoom({ ...editingRoom, city: e.target.value })}
                  />
                </div>
              </div>

              {/* Geocode & Location Coordinates Section */}
              <div className="space-y-3 p-4 bg-muted/20 border rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Label className="text-sm font-semibold block text-foreground">Property Map Coordinates</Label>
                    <p className="text-xs text-muted-foreground">Geocode from typed address or use your live device GPS location</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={geocodeEditingRoomAddress}
                      className="h-8 text-xs gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      Get Location Coordinates
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={useCurrentDeviceLocationForEditingRoom}
                      className="h-8 text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Use Live GPS Location
                    </Button>
                  </div>
                </div>

                {editingRoom.latitude && editingRoom.longitude && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Location Coordinates Marked ✓</span>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Latitude: {editingRoom.latitude.toFixed(4)}, Longitude: {editingRoom.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${editingRoom.latitude}&mlon=${editingRoom.longitude}#map=16/${editingRoom.latitude}/${editingRoom.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-medium flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Map
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditingRoom({ ...editingRoom, latitude: undefined, longitude: undefined })}
                        className="text-destructive hover:underline text-[11px]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Price (₹/month)</Label>
                  <Input
                    type="number"
                    value={editingRoom.price}
                    onChange={(e) => setEditingRoom({ ...editingRoom, price: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Room Type</Label>
                  <select
                    value={editingRoom.room_type}
                    onChange={(e) => setEditingRoom({ ...editingRoom, room_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Shared">Shared</option>
                    <option value="PG">PG</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-left">Facilities</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-left">
                  {[
                    "WiFi", "AC", "Parking", "Security", "Power Backup", "Water Supply",
                    "Attached Bathroom", "Furnished", "Laundry", "Kitchen Access", "TV", "Geyser"
                  ].map((facility) => {
                    const hasFacility = editingRoom.facilities?.includes(facility);
                    return (
                      <label key={facility} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasFacility || false}
                          onChange={(e) => {
                            const newFacilities = e.target.checked
                              ? [...(editingRoom.facilities || []), facility]
                              : (editingRoom.facilities || []).filter(f => f !== facility);
                            setEditingRoom({ ...editingRoom, facilities: newFacilities });
                          }}
                          className="w-4 h-4 rounded border-input text-primary"
                        />
                        <span>{facility}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRoom.is_verified}
                    onChange={(e) => setEditingRoom({ ...editingRoom, is_verified: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRoom.is_active}
                    onChange={(e) => setEditingRoom({ ...editingRoom, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Active (Visible)</span>
                </label>
              </div>

              <div>
                <Label className="mb-2 block">Images (URLs)</Label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {(editingRoom.images || []).map((imgUrl: string, idx: number) => (
                    <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border">
                      <img src={imgUrl} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = (editingRoom.images || []).filter((_: any, i: number) => i !== idx);
                          setEditingRoom({ ...editingRoom, images: newImages });
                        }}
                        className="absolute top-1 right-1 bg-destructive/80 hover:bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste image URL here"
                    id="admin-new-room-image-url"
                    className="flex-1 text-foreground"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        const url = input.value.trim();
                        if (url) {
                          setEditingRoom({ ...editingRoom, images: [...(editingRoom.images || []), url] });
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById("admin-new-room-image-url") as HTMLInputElement;
                      const url = input?.value.trim();
                      if (url) {
                        setEditingRoom({ ...editingRoom, images: [...(editingRoom.images || []), url] });
                        input.value = "";
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-col gap-2 border p-3 rounded-lg bg-muted/20 mt-3 text-left">
                  <span className="text-xs font-semibold text-muted-foreground">Upload from Device</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            toast({ title: "Uploading image...", description: "Please wait while we upload the image." });
                            const url = await uploadListingImage(file);
                            if (url) {
                              setEditingRoom({ ...editingRoom, images: [...(editingRoom.images || []), url] });
                              toast({ title: "Image uploaded successfully ✓" });
                            }
                          } catch (err: any) {
                            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                          }
                          e.target.value = "";
                        }
                      }}
                      className="cursor-pointer text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
                <Button onClick={saveRoom} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mess Modal */}
      {editingMess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-semibold text-xl">Edit Mess</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingMess(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Owner:</span>{" "}
                <span className="font-medium">{editingMess.owner_name}</span>{" "}
                <span className="text-muted-foreground">({editingMess.owner_email})</span>
              </div>

              <div>
                <Label>Mess Name</Label>
                <Input
                  value={editingMess.name}
                  onChange={(e) => setEditingMess({ ...editingMess, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingMess.description || ""}
                  onChange={(e) => setEditingMess({ ...editingMess, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <Input
                    value={editingMess.location}
                    onChange={(e) => setEditingMess({ ...editingMess, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={editingMess.city || ""}
                    onChange={(e) => setEditingMess({ ...editingMess, city: e.target.value })}
                  />
                </div>
              </div>

              {/* Geocode & Location Coordinates Section */}
              <div className="space-y-3 p-4 bg-muted/20 border rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Label className="text-sm font-semibold block text-foreground">Mess Map Coordinates</Label>
                    <p className="text-xs text-muted-foreground">Geocode from typed address or use your live device GPS location</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={geocodeEditingMessAddress}
                      className="h-8 text-xs gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      Get Location Coordinates
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={useCurrentDeviceLocationForEditingMess}
                      className="h-8 text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Use Live GPS Location
                    </Button>
                  </div>
                </div>

                {editingMess.latitude && editingMess.longitude && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Location Coordinates Marked ✓</span>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Latitude: {editingMess.latitude.toFixed(4)}, Longitude: {editingMess.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${editingMess.latitude}&mlon=${editingMess.longitude}#map=16/${editingMess.latitude}/${editingMess.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-medium flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Map
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditingMess({ ...editingMess, latitude: undefined, longitude: undefined })}
                        className="text-destructive hover:underline text-[11px]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Price (₹/month)</Label>
                  <Input
                    type="number"
                    value={editingMess.price_per_month}
                    onChange={(e) => setEditingMess({ ...editingMess, price_per_month: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Food Type</Label>
                  <select
                    value={editingMess.food_type}
                    onChange={(e) => setEditingMess({ ...editingMess, food_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <Label>Timings</Label>
                  <Input
                    value={editingMess.timings || ""}
                    onChange={(e) => setEditingMess({ ...editingMess, timings: e.target.value })}
                    placeholder="e.g., 7AM - 10PM"
                  />
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="admin-edit-mess-menu">Menu Highlights (comma separated)</Label>
                <Input
                  id="admin-edit-mess-menu"
                  value={Array.isArray(editingMess.menu_highlights) ? editingMess.menu_highlights.join(", ") : editingMess.menu_highlights || ""}
                  onChange={(e) => setEditingMess({ ...editingMess, menu_highlights: e.target.value as any })}
                  placeholder="e.g. Misal Pav, Thali, Tambda Rassa"
                  className="text-foreground"
                />
              </div>

              <div className="mb-4">
                <Label className="mb-2 block">Images (URLs)</Label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {(editingMess.images || []).map((imgUrl: string, idx: number) => (
                    <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border">
                      <img src={imgUrl} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = (editingMess.images || []).filter((_: any, i: number) => i !== idx);
                          setEditingMess({ ...editingMess, images: newImages });
                        }}
                        className="absolute top-1 right-1 bg-destructive/80 hover:bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Paste image URL here"
                    id="admin-new-mess-image-url"
                    className="flex-1 text-foreground"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        const url = input.value.trim();
                        if (url) {
                          setEditingMess({ ...editingMess, images: [...(editingMess.images || []), url] });
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById("admin-new-mess-image-url") as HTMLInputElement;
                      const url = input?.value.trim();
                      if (url) {
                        setEditingMess({ ...editingMess, images: [...(editingMess.images || []), url] });
                        input.value = "";
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-col gap-2 border p-3 rounded-lg bg-muted/20 text-left">
                  <span className="text-xs font-semibold text-muted-foreground">Upload from Device</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            toast({ title: "Uploading image...", description: "Please wait while we upload the image." });
                            const url = await uploadListingImage(file);
                            if (url) {
                              setEditingMess({ ...editingMess, images: [...(editingMess.images || []), url] });
                              toast({ title: "Image uploaded successfully ✓" });
                            }
                      } catch (err: any) {
                            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                          }
                          e.target.value = "";
                        }
                      }}
                      className="cursor-pointer text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2 border-b pb-1">
                  <Label className="font-semibold text-base">Weekly Menu (Lunch & Dinner)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!editingMess) return;
                      const defaultMenu = {
                        Monday: { lunch: "Varan Bhaat, Bhaji, Chapati, Salad", dinner: "Misal Pav, Buttermilk" },
                        Tuesday: { lunch: "Usal, Rice, Chapati, Papad", dinner: "Dal Khichdi, Kadhi" },
                        Wednesday: { lunch: "Tambda Rassa, Rice, Bhakri", dinner: "Veg Pulao, Raita" },
                        Thursday: { lunch: "Matki Usal, Chapati, Rice", dinner: "Chole Bhature" },
                        Friday: { lunch: "Pandhra Rassa, Rice, Bhakri", dinner: "Pav Bhaji" },
                        Saturday: { lunch: "Special Thali", dinner: "Biryani (Veg/Non-veg)" },
                        Sunday: { lunch: "Mutton Thali / Paneer Thali", dinner: "Light Dinner" }
                      };
                      setEditingMess({ ...editingMess, weekly_menu: defaultMenu });
                      toast({ title: "Weekly Menu pre-populated ✓" });
                    }}
                    className="h-7 text-xs px-2"
                  >
                    Load Standard Menu Template
                  </Button>
                </div>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 text-left">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                    const dayMenu = (() => {
                      if (!editingMess || !editingMess.weekly_menu) return { lunch: "", dinner: "" };
                      const menu = typeof editingMess.weekly_menu === 'string'
                        ? JSON.parse(editingMess.weekly_menu)
                        : editingMess.weekly_menu;
                      return menu[day] || { lunch: "", dinner: "" };
                    })();

                    return (
                      <div key={day} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center p-2 bg-muted/50 rounded-lg">
                        <span className="font-medium text-sm text-foreground">{day}</span>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase">Lunch</Label>
                          <Input
                            placeholder="e.g. Rice, Dal, Veg Sabji"
                            value={dayMenu.lunch || ""}
                            onChange={(e) => {
                              if (!editingMess) return;
                              const currentMenu = (() => {
                                if (!editingMess.weekly_menu) return {};
                                return typeof editingMess.weekly_menu === 'string'
                                  ? JSON.parse(editingMess.weekly_menu)
                                  : { ...editingMess.weekly_menu };
                              })();
                              currentMenu[day] = {
                                ...currentMenu[day],
                                lunch: e.target.value
                              };
                              setEditingMess({ ...editingMess, weekly_menu: currentMenu });
                            }}
                            className="h-8 text-xs text-foreground bg-background"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase">Dinner</Label>
                          <Input
                            placeholder="e.g. Chapati, Paneer Masala"
                            value={dayMenu.dinner || ""}
                            onChange={(e) => {
                              if (!editingMess) return;
                              const currentMenu = (() => {
                                if (!editingMess.weekly_menu) return {};
                                return typeof editingMess.weekly_menu === 'string'
                                  ? JSON.parse(editingMess.weekly_menu)
                                  : { ...editingMess.weekly_menu };
                              })();
                              currentMenu[day] = {
                                ...currentMenu[day],
                                dinner: e.target.value
                              };
                              setEditingMess({ ...editingMess, weekly_menu: currentMenu });
                            }}
                            className="h-8 text-xs text-foreground bg-background"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={editingMess.is_verified || false}
                    onChange={(e) => setEditingMess({ ...editingMess, is_verified: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={editingMess.is_active || false}
                    onChange={(e) => setEditingMess({ ...editingMess, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Active (Visible)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingMess(null)}>Cancel</Button>
                <Button onClick={saveMess} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">Are you sure you want to permanently delete user</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive font-semibold my-6 text-center text-xl break-all">
              {userToDelete?.email}
            </AlertDialogDescription>
            <AlertDialogDescription className="text-center text-muted-foreground text-sm">
              ? This will also delete all their listings and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel className="w-24">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground w-24"
              onClick={() => {
                if (userToDelete) {
                  handleDeleteUser(userToDelete.id);
                  setUserToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectionModal} onOpenChange={(open) => !open && setRejectionModal(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
            <DialogDescription>
              Please specify the reason for rejecting <strong>"{rejectionModal?.title}"</strong>. An email notification will be sent to the owner ({rejectionModal?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="e.g. Please upload higher quality photos of the rooms and include pricing details."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectionModal(null);
              setRejectionReason("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim()}
              onClick={() => {
                if (rejectionModal) {
                  if (rejectionModal.type === "room") {
                    updateRoomStatus(rejectionModal.id, "rejected", rejectionReason);
                  } else {
                    updateMessStatus(rejectionModal.id, "rejected", rejectionReason);
                  }
                  setRejectionModal(null);
                  setRejectionReason("");
                }
              }}
            >
              Submit Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Booking Status Dialog Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg flex items-center gap-2 text-foreground">
                <AlertOctagon className="w-5 h-5 text-amber-600 animate-pulse" />
                Confirm Manual Override
              </h3>
              <Button variant="ghost" size="icon" onClick={() => { setOverrideModal(null); setOverrideReason(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are about to force-change the status of booking <strong>{overrideModal.booking.id}</strong> to{" "}
                <span className="font-bold text-foreground capitalize">
                  {overrideModal.action === "confirm" ? "confirmed" : "cancelled"}
                </span>
                .
              </p>

              <div>
                <Label htmlFor="override-reason" className="text-sm font-semibold text-foreground mb-1.5 block">
                  Override Reason (Required)
                </Label>
                <Textarea
                  id="override-reason"
                  placeholder="Explain why this manual status override is necessary..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setOverrideModal(null); setOverrideReason(""); }}
                  disabled={savingOverride}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyOverride}
                  disabled={savingOverride}
                  className={overrideModal.action === "confirm" ? "bg-success hover:bg-success/90 text-white" : "bg-destructive hover:bg-destructive/90 text-white"}
                >
                  {savingOverride ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : null}
                  Confirm Override
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Transactions Dialog */}
      <AlertDialog open={showClearTxConfirm} onOpenChange={setShowClearTxConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">Clear Transaction Logs</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground">
              Are you sure you want to permanently clear all local transaction logs? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel className="w-24">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground w-24"
              onClick={() => {
                handleClearTransactions();
                setShowClearTxConfirm(false);
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Clear Bookings Dialog */}
      <AlertDialog open={showClearBkConfirm} onOpenChange={setShowClearBkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">Clear Bookings & Subscriptions</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground">
              Are you sure you want to permanently clear all local bookings and subscriptions? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel className="w-24">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground w-24"
              onClick={() => {
                handleClearBookings();
                setShowClearBkConfirm(false);
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Single Transaction Dialog */}
      <AlertDialog open={!!txnToDelete} onOpenChange={(open) => !open && setTxnToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">Delete Transaction Record</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground">
              Are you sure you want to delete the transaction record for <strong>{txnToDelete?.paymentId || txnToDelete?.transactionId || txnToDelete?.id}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel className="w-24">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground w-24"
              onClick={() => {
                if (txnToDelete) {
                  handleDeleteTransaction(txnToDelete);
                  setTxnToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 1. Admin User Detail Overlay Modal */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto block">
          <div className="bg-card rounded-2xl p-6 w-full max-w-4xl shadow-2xl border my-8 max-h-[90vh] overflow-y-auto text-foreground">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <h3 className="font-heading font-semibold text-xl flex items-center gap-2 text-foreground">
                  <User className="w-5 h-5 text-primary" />
                  Admin User Profile Detail
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">ID: {selectedUserForDetails.id}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedUserForDetails(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Left Panel: Profile Summary & Controls */}
              <div className="md:col-span-1 space-y-6">
                <div className="bg-muted p-4 rounded-xl space-y-3">
                  <div className="text-center pb-4 border-b">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-xl font-bold text-primary">
                      {selectedUserForDetails.full_name?.charAt(0) || "U"}
                    </div>
                    <h4 className="font-bold text-lg">{selectedUserForDetails.full_name || "N/A"}</h4>
                    <p className="text-xs text-muted-foreground break-all">{selectedUserForDetails.email}</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <Badge variant={selectedUserForDetails.role === "admin" ? "destructive" : selectedUserForDetails.role === "owner" ? "default" : "secondary"}>
                        {selectedUserForDetails.role}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={selectedUserForDetails.status === "active" ? "bg-success text-white" : selectedUserForDetails.status === "suspended" ? "bg-amber-600 text-white" : "bg-destructive text-white"}>
                        {selectedUserForDetails.status || "active"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Identity:</span>
                      <Badge className={selectedUserForDetails.is_verified ? "bg-blue-600 text-white" : "bg-gray-500 text-white"}>
                        {selectedUserForDetails.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shadow Banned:</span>
                      <span className="font-semibold">{selectedUserForDetails.shadow_banned ? "Yes 👻" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Version:</span>
                      <span>v{selectedUserForDetails.token_version || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joined:</span>
                      <span>{new Date(selectedUserForDetails.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between flex-col gap-0.5">
                      <span className="text-muted-foreground">Last Login:</span>
                      <span className="font-medium text-[11px]">
                        {selectedUserForDetails.last_login 
                          ? new Date(selectedUserForDetails.last_login).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Control Actions Section */}
                <div className="space-y-3">
                  <h5 className="font-bold text-sm border-b pb-1">Permission Actions</h5>
                  
                  {/* Role dropdown trigger */}
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Change Role</Label>
                    <select
                      value={selectedUserForDetails.role || "user"}
                      onChange={(e) => changeUserRole(selectedUserForDetails.id, e.target.value)}
                      className="w-full h-9 px-2 rounded-md border bg-background text-sm cursor-pointer text-foreground"
                    >
                      <option value="user">User</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Verification Toggle */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs"
                    onClick={() => handleToggleUserVerified(selectedUserForDetails.id, selectedUserForDetails.is_verified)}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    {selectedUserForDetails.is_verified ? "Unverify Identity" : "Verify Identity"}
                  </Button>

                  {/* Suspend / Ban Toggles */}
                  <div className="flex gap-2">
                    {selectedUserForDetails.status !== "active" ? (
                      <Button 
                        variant="outline" 
                        className="flex-1 h-9 text-xs bg-success/5 text-success border-success/20 hover:bg-success hover:text-white"
                        onClick={() => handleToggleUserStatus(selectedUserForDetails.id, selectedUserForDetails.status, "activate")}
                      >
                        Activate
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-9 text-xs bg-amber-500/5 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white"
                          onClick={() => handleToggleUserStatus(selectedUserForDetails.id, selectedUserForDetails.status, "suspend")}
                        >
                          Suspend
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-9 text-xs bg-destructive/5 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                          onClick={() => handleToggleUserStatus(selectedUserForDetails.id, selectedUserForDetails.status, "ban")}
                        >
                          Ban
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Shadow Ban Toggle */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs"
                    onClick={() => handleToggleShadowBan(selectedUserForDetails.id, selectedUserForDetails.shadow_banned)}
                  >
                    <EyeOff className="w-4 h-4 text-amber-600" />
                    {selectedUserForDetails.shadow_banned ? "Lift Shadow Ban" : "Shadow Ban User"}
                  </Button>

                  {/* Force Logout */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs text-destructive hover:bg-destructive/5"
                    onClick={() => handleForceUserLogout(selectedUserForDetails.id, selectedUserForDetails.token_version || 1)}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Force Logout
                  </Button>

                  {/* Password Reset */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                    onClick={() => handleTriggerPasswordReset(selectedUserForDetails.id, selectedUserForDetails.email)}
                  >
                    <Mail className="w-4 h-4" />
                    Reset Password Link
                  </Button>

                  {/* Impersonate User */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-9 text-xs bg-purple-500 text-white hover:bg-purple-600 border-none font-semibold mt-2"
                    onClick={() => handleImpersonateUser(selectedUserForDetails.id, selectedUserForDetails.full_name || selectedUserForDetails.email)}
                    disabled={selectedUserForDetails.id === user?.id}
                    title={selectedUserForDetails.id === user?.id ? "Cannot impersonate yourself" : "Impersonate user"}
                  >
                    <User className="w-4 h-4 fill-current" />
                    Impersonate User
                  </Button>
                </div>
              </div>

              {/* Right Panel: Lists of Listings, Bookings, Reviews */}
              <div className="md:col-span-2 space-y-6">
                {/* Rooms and Mess Listings */}
                <div>
                  <h4 className="font-heading font-semibold text-base mb-3 border-b pb-1">Owned Listings</h4>
                  
                  {/* Rooms */}
                  <div className="space-y-2 mb-3">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rooms</h5>
                    {allRooms.filter(r => r.owner_id === selectedUserForDetails.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-2">No rooms listed.</p>
                    ) : (
                      allRooms.filter(r => r.owner_id === selectedUserForDetails.id).map(r => (
                        <div key={r.id} className="flex justify-between items-center text-xs p-2 bg-muted rounded">
                          <span className="font-medium truncate max-w-xs">{r.title}</span>
                          <div className="flex gap-2 items-center">
                            <span className="font-bold text-primary">₹{r.price}</span>
                            <Badge className={r.is_active ? "bg-success text-white scale-90" : "bg-gray-400 text-white scale-90"}>{r.is_active ? "Active" : "Inactive"}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Mess */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mess</h5>
                    {allMess.filter(m => m.owner_id === selectedUserForDetails.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-2">No mess listed.</p>
                    ) : (
                      allMess.filter(m => m.owner_id === selectedUserForDetails.id).map(m => (
                        <div key={m.id} className="flex justify-between items-center text-xs p-2 bg-muted rounded">
                          <span className="font-medium truncate max-w-xs">{m.name}</span>
                          <div className="flex gap-2 items-center">
                            <span className="font-bold text-primary">₹{m.price_per_month}</span>
                            <Badge className={m.is_active ? "bg-success text-white scale-90" : "bg-gray-400 text-white scale-90"}>{m.is_active ? "Active" : "Inactive"}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bookings */}
                <div>
                  <h4 className="font-heading font-semibold text-base mb-3 border-b pb-1">Bookings & Subscriptions</h4>
                  {allBookings.filter(b => b.userEmail === selectedUserForDetails.email || b.userPhone === selectedUserForDetails.phone).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic pl-2">No bookings or subscriptions on record.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allBookings.filter(b => b.userEmail === selectedUserForDetails.email || b.userPhone === selectedUserForDetails.phone).map(b => (
                        <div key={b.id} className="text-xs p-2.5 bg-muted rounded border border-border flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{b.listingTitle} ({b.listingType})</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()} • {b.planType}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">₹{b.amount}</p>
                            <Badge className={b.status === "confirmed" || b.status === "active" ? "bg-success text-white scale-75" : "bg-warning text-white scale-75"}>{b.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reviews */}
                <div>
                  <h4 className="font-heading font-semibold text-base mb-3 border-b pb-1">Reviews Written</h4>
                  {allReviews.filter(r => r.user_id === selectedUserForDetails.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic pl-2">No reviews written yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allReviews.filter(r => r.user_id === selectedUserForDetails.id).map(r => (
                        <div key={r.id} className="text-xs p-2.5 bg-muted rounded border border-border">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-muted-foreground italic">"{r.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Admin User Role Change Confirmation Dialog Overlay Modal */}
      {userRoleConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 block">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border text-center">
            <h3 className="font-heading font-semibold text-lg text-foreground mb-2">Confirm Role Change</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to change the role of <strong>{userRoleConfirm.email}</strong> to <strong>{userRoleConfirm.newRole}</strong>? 
              This will update their system permissions.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setUserRoleConfirm(null)} className="w-24">
                Cancel
              </Button>
              <Button onClick={executeRoleChange} className="bg-primary text-primary-foreground w-24">
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Password Reset link display modal */}
      {userResetPasswordUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 block">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="font-heading font-semibold text-lg text-foreground">Password Reset Link</h3>
              <Button variant="ghost" size="icon" onClick={() => setUserResetPasswordUrl(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Here is the simulated password reset URL. You can share this link directly with the user:
            </p>
            <div className="p-3 bg-muted rounded-lg border text-xs font-mono break-all mb-6">
              {userResetPasswordUrl}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => {
                navigator.clipboard.writeText(userResetPasswordUrl);
                toast({ title: "Copied to clipboard! ✓" });
              }} className="mr-2">
                Copy Link
              </Button>
              <Button variant="outline" onClick={() => setUserResetPasswordUrl(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;
