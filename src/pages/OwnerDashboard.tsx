import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  UtensilsCrossed,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Sparkles,
  CreditCard,
  ShieldAlert,
  MessageSquare,
  AlertTriangle,
  Users,
  TrendingUp,
  Coins,
  Ban,
  UserCheck,
  FileText,
  Check,
  XCircle,
  Navigation,
  ExternalLink
} from "lucide-react";
import { createRoom, updateRoom, deleteRoom, getRoomsByOwner, toggleRoomActive, Room } from "@/services/roomService";
import { createMess, updateMess, deleteMess, getMessByOwner, toggleMessActive, Mess } from "@/services/messService";
import { geocodeAddress, reverseGeocode } from "@/services/placesService";
import { uploadListingImage } from "@/services/uploadService";
import { getPlatformSettings } from "@/services/settingsService";
import { fetchOwnerSubscriptions, fetchOwnerRoomBookings } from "@/services/bookingService";
import { blockUser, unblockUser, getBlockedUsers } from "@/services/ownerBlockService";
import {
  getReviews,
  replyToReview,
  deleteReviewReply,
  getReports,
  createReport,
  Review as ModerationReview,
  Report as ModerationReport
} from "@/services/moderationService";

const OwnerDashboard = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data states
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [myMess, setMyMess] = useState<Mess[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMess, setLoadingMess] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [loadingRoomBookings, setLoadingRoomBookings] = useState(false);

  // Moderation & Control states
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [selectedReviewForReply, setSelectedReviewForReply] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [reportingUser, setReportingUser] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [selectedUserHistory, setSelectedUserHistory] = useState<any | null>(null);
  const [activeModSubTab, setActiveModSubTab] = useState<"users" | "reviews" | "reports">("users");
  const [showCustomerReviewsModal, setShowCustomerReviewsModal] = useState(false);
  const [reviewListingTypeFilter, setReviewListingTypeFilter] = useState<"all" | "room" | "mess">("all");

  // Price validation settings bounds
  const [minRentPrice, setMinRentPrice] = useState<number>(500);
  const [maxRentPrice, setMaxRentPrice] = useState<number>(100000);
  const [featuredListingPrice, setFeaturedListingPrice] = useState<number>(500);

  // Edit states
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingMess, setEditingMess] = useState<Mess | null>(null);
  const [saving, setSaving] = useState(false);
  const [promotingListing, setPromotingListing] = useState<{ id: string; type: "room" | "mess"; title: string } | null>(null);
  const [promoting, setPromoting] = useState(false);

  // Form states for Room
  const [roomForm, setRoomForm] = useState({
    title: "",
    description: "",
    location: "",
    address: "",
    city: "",
    price: "",
    deposit: "",
    room_type: "single",
    facilities: [] as string[],
    images: [] as string[],
    available_from: "",
    preferred_tenants: "",
    rules: "",
  });

  // Form states for Mess
  const [messForm, setMessForm] = useState({
    name: "",
    description: "",
    location: "",
    address: "",
    city: "",
    price_per_month: "",
    food_type: "veg" as "veg" | "non-veg" | "both",
    timings: "",
    menu_highlights: "",
    images: [] as string[],
    weekly_menu: null as any,
  });

  // Active tab
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get("tab") || "my-rooms";
  });

  // Sync activeTab with URL param
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Update search param when activeTab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const [roomImages, setRoomImages] = useState<File[]>([]);
  const [roomImagePreviews, setRoomImagePreviews] = useState<string[]>([]);
  const [savingRoom, setSavingRoom] = useState(false);
  const [geocodingRoom, setGeocodingRoom] = useState(false);
  const [roomCoords, setRoomCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [messImages, setMessImages] = useState<File[]>([]);
  const [messImagePreviews, setMessImagePreviews] = useState<string[]>([]);
  const [savingMess, setSavingMess] = useState(false);
  const [geocodingMess, setGeocodingMess] = useState(false);
  const [messCoords, setMessCoords] = useState<{ lat: number; lng: number } | null>(null);

  const roomImageInputRef = useRef<HTMLInputElement>(null);
  const messImageInputRef = useRef<HTMLInputElement>(null);

  const facilityOptions = [
    "WiFi", "AC", "Parking", "Security", "Power Backup", "Water Supply",
    "Attached Bathroom", "Furnished", "Laundry", "Kitchen Access", "TV", "Geyser"
  ];

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else if (userRole === "user") {
        navigate("/dashboard");
      }
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyRooms();
      fetchMyMess();
      fetchSubscriptions();
      fetchModerationData();
    }
  }, [user]);

  useEffect(() => {
    const fetchBounds = async () => {
      try {
        const settings = await getPlatformSettings();
        if (settings) {
          setMinRentPrice(settings.min_rent_price ?? 500);
          setMaxRentPrice(settings.max_rent_price ?? 100000);
          setFeaturedListingPrice(settings.featured_listing_price ?? 500);
        }
      } catch (err) {
        console.error("Error fetching price bounds:", err);
      }
    };
    fetchBounds();
  }, []);

  const fetchMyRooms = async () => {
    if (!user) return;
    setLoadingRooms(true);
    try {
      const rooms = await getRoomsByOwner(user.id);
      setMyRooms(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchMyMess = async () => {
    if (!user) return;
    setLoadingMess(true);
    try {
      const mess = await getMessByOwner(user.id);
      setMyMess(mess);
    } catch (error) {
      console.error("Error fetching mess:", error);
    } finally {
      setLoadingMess(false);
    }
  };

  const fetchSubscriptions = async () => {
    if (!user) return;
    setLoadingSubs(true);
    setLoadingRoomBookings(true);
    try {
      const data = await fetchOwnerSubscriptions(user.id);
      setSubscriptions(data);
      const roomData = await fetchOwnerRoomBookings(user.id);
      setRoomBookings(roomData);
    } catch (error) {
      console.error("Error fetching subscriptions/bookings:", error);
    } finally {
      setLoadingSubs(false);
      setLoadingRoomBookings(false);
    }
  };

  const fetchModerationData = async () => {
    if (!user) return;
    setLoadingReviews(true);
    setLoadingReports(true);
    try {
      const blocked = await getBlockedUsers(user.id);
      setBlockedUsers(blocked);

      const allReviews = await getReviews();
      setReviews(allReviews);

      const allReports = await getReports();
      setReports(allReports);
    } catch (err) {
      console.error("Error fetching moderation data:", err);
    } finally {
      setLoadingReviews(false);
      setLoadingReports(false);
    }
  };

  const handleToggleBlock = async (targetUserId: string) => {
    if (!user) return;
    const isBlocked = blockedUsers.includes(targetUserId);
    try {
      if (isBlocked) {
        await unblockUser(user.id, targetUserId);
        toast({ title: "User Unblocked ✓", description: "They can now view and book your listings." });
      } else {
        await blockUser(user.id, targetUserId);
        toast({ title: "User Blocked 🚫", description: "They cannot view or book your listings anymore." });
      }
      fetchModerationData();
    } catch (err: any) {
      toast({ title: "Block Action Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await replyToReview(reviewId, replyText.trim());
      toast({ title: "Reply Posted ✓", description: "Your response is now public." });
      setReplyText("");
      setSelectedReviewForReply(null);
      fetchModerationData();
    } catch (err: any) {
      toast({ title: "Failed to post reply", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReplyDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete your response to this review?")) return;
    try {
      await deleteReviewReply(reviewId);
      toast({ title: "Reply Deleted ✓" });
      fetchModerationData();
    } catch (err: any) {
      toast({ title: "Failed to delete reply", description: err.message, variant: "destructive" });
    }
  };

  const handleUserReportSubmit = async () => {
    if (!user || !reportingUser || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await createReport(user.id, "user", reportingUser.id, reportReason.trim());
      toast({ title: "User Reported 📋", description: "Our administration panel has received your complaint." });
      setReportReason("");
      setReportingUser(null);
      fetchModerationData();
    } catch (err: any) {
      toast({ title: "Failed to submit report", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingReport(false);
    }
  };

  const getUniqueCustomers = () => {
    const userMap = new Map<string, any>();

    roomBookings.forEach((b) => {
      const existing = userMap.get(b.userId) || {
        id: b.userId,
        name: b.userName || "User",
        email: b.userEmail || "N/A",
        phone: b.userPhone || "N/A",
        bookings: [],
        totalPaid: 0,
      };
      existing.bookings.push({
        type: "room",
        id: b.id,
        title: b.listingTitle,
        amount: b.amount,
        status: b.status,
        date: b.createdAt,
      });
      existing.totalPaid += b.amount;
      userMap.set(b.userId, existing);
    });

    subscriptions.forEach((s) => {
      const existing = userMap.get(s.userId) || {
        id: s.userId,
        name: s.userName || "User",
        email: s.userEmail || "N/A",
        phone: s.userPhone || "N/A",
        bookings: [],
        totalPaid: 0,
      };
      existing.bookings.push({
        type: "mess",
        id: s.id,
        title: s.messTitle,
        amount: s.amount,
        status: s.status,
        date: s.startDate,
      });
      existing.totalPaid += s.amount;
      userMap.set(s.userId, existing);
    });

    return Array.from(userMap.values());
  };

  const handlePromoteListing = async () => {
    if (!promotingListing) return;
    setPromoting(true);
    try {
      const now = new Date();
      const featuredUntil = new Date(now.setDate(now.getDate() + 30)).toISOString();
      
      if (promotingListing.type === "room") {
        await updateRoom(promotingListing.id, {
          is_featured: true,
          featured_until: featuredUntil
        });
        toast({ title: "Property Promoted ★", description: "Your room is now featured for 30 days!" });
        fetchMyRooms();
      } else {
        await updateMess(promotingListing.id, {
          is_featured: true,
          featured_until: featuredUntil
        });
        toast({ title: "Mess Promoted ★", description: "Your mess is now featured for 30 days!" });
        fetchMyMess();
      }
      setPromotingListing(null);
    } catch (err: any) {
      toast({ title: "Promotion failed", description: err.message, variant: "destructive" });
    } finally {
      setPromoting(false);
    }
  };

  // Save room edits
  const saveRoom = async () => {
    if (!editingRoom) return;
    setSaving(true);
    try {
      const result = await updateRoom(editingRoom.id, {
        title: editingRoom.title,
        description: editingRoom.description,
        location: editingRoom.location,
        address: editingRoom.address,
        city: editingRoom.city,
        price: Number(editingRoom.price),
        deposit: Number(editingRoom.deposit),
        room_type: editingRoom.room_type,
        facilities: editingRoom.facilities,
        rules: editingRoom.rules,
        preferred_tenants: editingRoom.preferred_tenants,
        available_from: editingRoom.available_from,
        images: editingRoom.images,
        latitude: editingRoom.latitude,
        longitude: editingRoom.longitude,
      });

      if (result) {
        toast({ title: "Room listing updated successfully ✓" });
        setEditingRoom(null);
        fetchMyRooms();
      } else {
        toast({ title: "Failed to update room", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error updating room", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Save mess edits
  const saveMess = async () => {
    if (!editingMess) return;
    setSaving(true);
    try {
      const result = await updateMess(editingMess.id, {
        name: editingMess.name,
        description: editingMess.description,
        location: editingMess.location,
        address: editingMess.address,
        city: editingMess.city,
        price_per_month: Number(editingMess.price_per_month),
        food_type: editingMess.food_type as any,
        timings: editingMess.timings,
        menu_highlights: typeof editingMess.menu_highlights === 'string'
          ? (editingMess.menu_highlights as string).split(",").map(s => s.trim()).filter(Boolean)
          : editingMess.menu_highlights,
        images: editingMess.images,
        weekly_menu: editingMess.weekly_menu,
        latitude: editingMess.latitude,
        longitude: editingMess.longitude,
      });

      if (result) {
        toast({ title: "Mess listing updated successfully ✓" });
        setEditingMess(null);
        fetchMyMess();
      } else {
        toast({ title: "Failed to update mess", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error updating mess", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Image handling for rooms
  const handleRoomImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (roomImages.length + files.length > 6) {
      toast({
        title: "Too many images",
        description: "Maximum 6 images allowed",
        variant: "destructive",
      });
      return;
    }

    setRoomImages([...roomImages, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRoomImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeRoomImage = (index: number) => {
    setRoomImages(prev => prev.filter((_, i) => i !== index));
    setRoomImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Image handling for mess
  const handleMessImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (messImages.length + files.length > 6) {
      toast({
        title: "Too many images",
        description: "Maximum 6 images allowed",
        variant: "destructive",
      });
      return;
    }

    setMessImages([...messImages, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMessImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMessImage = (index: number) => {
    setMessImages(prev => prev.filter((_, i) => i !== index));
    setMessImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Geocode room address or fetch live GPS location
  const geocodeRoomAddress = async () => {
    if (!roomForm.address && !roomForm.city) {
      return useCurrentDeviceLocationForRoom();
    }

    setGeocodingRoom(true);
    try {
      const fullAddress = `${roomForm.address || ""}, ${roomForm.city || ""}`.trim();
      const result = await geocodeAddress(fullAddress);
      if (result) {
        setRoomCoords({ lat: result.lat, lng: result.lng });
        setRoomForm(prev => ({
          ...prev,
          location: prev.location || `${result.area || roomForm.city}, ${result.city || roomForm.city}`,
        }));
        toast({
          title: "Location Coordinates Marked ✓",
          description: `Pinned at: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
        });
      } else {
        toast({
          title: "Address Geocoding Failed",
          description: "Fetching your current live GPS location...",
        });
        useCurrentDeviceLocationForRoom();
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      useCurrentDeviceLocationForRoom();
    } finally {
      setGeocodingRoom(false);
    }
  };

  // Device GPS Location for Room
  const useCurrentDeviceLocationForRoom = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Unsupported",
        description: "Your browser does not support live GPS location.",
        variant: "destructive",
      });
      return;
    }

    setGeocodingRoom(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        setRoomCoords({ lat, lng });

        // Reverse geocode to auto-fill address if empty
        const geoInfo = await reverseGeocode(lat, lng);
        if (geoInfo) {
          setRoomForm(prev => ({
            ...prev,
            address: prev.address || geoInfo.address,
            city: prev.city || geoInfo.city,
            location: prev.location || `${geoInfo.area || geoInfo.city}, ${geoInfo.city}`,
          }));
        }

        toast({
          title: "Current GPS Location Marked ✓",
          description: `Live Coordinates: ${lat}, ${lng}`,
        });
        setGeocodingRoom(false);
      },
      (error) => {
        console.error("Device location error:", error);
        toast({
          title: "GPS Location Error",
          description: "Permission denied or unavailable. Please type address and try again.",
          variant: "destructive",
        });
        setGeocodingRoom(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Geocode mess address or fetch live GPS location
  const geocodeMessAddress = async () => {
    if (!messForm.address && !messForm.city) {
      return useCurrentDeviceLocationForMess();
    }

    setGeocodingMess(true);
    try {
      const fullAddress = `${messForm.address || ""}, ${messForm.city || ""}`.trim();
      const result = await geocodeAddress(fullAddress);
      if (result) {
        setMessCoords({ lat: result.lat, lng: result.lng });
        setMessForm(prev => ({
          ...prev,
          location: prev.location || `${result.area || messForm.city}, ${result.city || messForm.city}`,
        }));
        toast({
          title: "Location Coordinates Marked ✓",
          description: `Pinned at: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
        });
      } else {
        toast({
          title: "Address Geocoding Failed",
          description: "Fetching your current live GPS location...",
        });
        useCurrentDeviceLocationForMess();
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      useCurrentDeviceLocationForMess();
    } finally {
      setGeocodingMess(false);
    }
  };

  // Device GPS Location for Mess
  const useCurrentDeviceLocationForMess = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Unsupported",
        description: "Your browser does not support live GPS location.",
        variant: "destructive",
      });
      return;
    }

    setGeocodingMess(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        setMessCoords({ lat, lng });

        // Reverse geocode to auto-fill address if empty
        const geoInfo = await reverseGeocode(lat, lng);
        if (geoInfo) {
          setMessForm(prev => ({
            ...prev,
            address: prev.address || geoInfo.address,
            city: prev.city || geoInfo.city,
            location: prev.location || `${geoInfo.area || geoInfo.city}, ${geoInfo.city}`,
          }));
        }

        toast({
          title: "Current GPS Location Marked ✓",
          description: `Live Coordinates: ${lat}, ${lng}`,
        });
        setGeocodingMess(false);
      },
      (error) => {
        console.error("Device location error:", error);
        toast({
          title: "GPS Location Error",
          description: "Permission denied or unavailable. Please type address and try again.",
          variant: "destructive",
        });
        setGeocodingMess(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Geocode address or fetch live GPS for Editing Room
  const geocodeEditingRoomAddress = async () => {
    if (!editingRoom) return;
    if (!editingRoom.address && !editingRoom.city) {
      return useCurrentDeviceLocationForEditingRoom();
    }

    setGeocodingRoom(true);
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
    } finally {
      setGeocodingRoom(false);
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

    setGeocodingRoom(true);
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
        setGeocodingRoom(false);
      },
      (error) => {
        console.error("Device location error:", error);
        toast({
          title: "GPS Location Error",
          description: "Permission denied or unavailable. Please type address and try again.",
          variant: "destructive",
        });
        setGeocodingRoom(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Geocode address or fetch live GPS for Editing Mess
  const geocodeEditingMessAddress = async () => {
    if (!editingMess) return;
    if (!editingMess.address && !editingMess.city) {
      return useCurrentDeviceLocationForEditingMess();
    }

    setGeocodingMess(true);
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
    } finally {
      setGeocodingMess(false);
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

    setGeocodingMess(true);
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
        setGeocodingMess(false);
      },
      (error) => {
        console.error("Device location error:", error);
        toast({
          title: "GPS Location Error",
          description: "Permission denied or unavailable. Please type address and try again.",
          variant: "destructive",
        });
        setGeocodingMess(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Toggle facility selection
  const toggleFacility = (facility: string) => {
    setRoomForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  // Save room
  const handleSaveRoom = async () => {
    if (!user) return;

    if (!roomForm.title || !roomForm.address || !roomForm.price) {
      toast({
        title: "Missing Fields",
        description: "Please fill in title, address, and price",
        variant: "destructive",
      });
      return;
    }

    const rentPrice = parseFloat(roomForm.price);
    if (isNaN(rentPrice) || rentPrice < minRentPrice || rentPrice > maxRentPrice) {
      toast({
        title: "Invalid Rent Price",
        description: `Rent price must be between ₹${minRentPrice.toLocaleString()} and ₹${maxRentPrice.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    setSavingRoom(true);
    try {
      // For now, use preview URLs (in production, upload to Supabase Storage)
      const imageUrls = roomImagePreviews.length > 0
        ? roomImagePreviews
        : ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"];

      const roomData = {
        owner_id: user.id,
        title: roomForm.title,
        description: roomForm.description,
        location: roomForm.location || `${roomForm.city}`,
        address: roomForm.address,
        city: roomForm.city,
        price: parseFloat(roomForm.price),
        room_type: roomForm.room_type,
        facilities: roomForm.facilities,
        images: imageUrls,
        latitude: roomCoords?.lat,
        longitude: roomCoords?.lng,
        is_active: true,
        is_verified: false,
      };

      await createRoom(roomData);

      toast({
        title: "Room Added!",
        description: "Your room has been listed successfully",
      });

      // Reset form
      setRoomForm({
        title: "",
        description: "",
        location: "",
        address: "",
        city: "",
        price: "",
        room_type: "Single",
        facilities: [],
        images: [],
        deposit: "",
        available_from: "",
        preferred_tenants: "",
        rules: "",
      });
      setRoomImages([]);
      setRoomImagePreviews([]);
      setRoomCoords(null);

      fetchMyRooms();
      handleTabChange("my-rooms");
    } catch (error) {
      console.error("Error saving room:", error);
      toast({
        title: "Error",
        description: "Failed to add room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingRoom(false);
    }
  };

  // Save mess
  const handleSaveMess = async () => {
    if (!user) return;

    if (!messForm.name || !messForm.address || !messForm.price_per_month) {
      toast({
        title: "Missing Fields",
        description: "Please fill in name, address, and price",
        variant: "destructive",
      });
      return;
    }

    const messPrice = parseFloat(messForm.price_per_month);
    if (isNaN(messPrice) || messPrice < minRentPrice || messPrice > maxRentPrice) {
      toast({
        title: "Invalid Mess Price",
        description: `Mess price must be between ₹${minRentPrice.toLocaleString()} and ₹${maxRentPrice.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    setSavingMess(true);
    try {
      const imageUrls = messImagePreviews.length > 0
        ? messImagePreviews
        : ["https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800"];

      const messData = {
        owner_id: user.id,
        name: messForm.name,
        description: messForm.description,
        location: messForm.location || `${messForm.city}`,
        address: messForm.address,
        city: messForm.city,
        price_per_month: parseFloat(messForm.price_per_month),
        food_type: messForm.food_type,
        timings: messForm.timings,
        menu_highlights: typeof messForm.menu_highlights === 'string'
          ? messForm.menu_highlights.split(",").map(s => s.trim()).filter(Boolean)
          : Array.isArray(messForm.menu_highlights) ? messForm.menu_highlights : [],
        images: imageUrls,
        weekly_menu: messForm.weekly_menu || null,
        latitude: messCoords?.lat,
        longitude: messCoords?.lng,
        is_active: true,
        is_verified: false,
      };

      await createMess(messData);

      toast({
        title: "Mess Added!",
        description: "Your mess has been listed successfully",
      });

      // Reset form
      setMessForm({
        name: "",
        description: "",
        location: "",
        address: "",
        city: "",
        price_per_month: "",
        food_type: "both",
        timings: "",
        menu_highlights: "",
        images: [],
        weekly_menu: null,
      });
      setMessImages([]);
      setMessImagePreviews([]);
      setMessCoords(null);

      fetchMyMess();
      handleTabChange("my-mess");
    } catch (error) {
      console.error("Error saving mess:", error);
      toast({
        title: "Error",
        description: "Failed to add mess. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingMess(false);
    }
  };

  // Delete room
  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    try {
      await deleteRoom(roomId);
      toast({ title: "Room Deleted" });
      fetchMyRooms();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete room", variant: "destructive" });
    }
  };

  // Delete mess
  const handleDeleteMess = async (messId: string) => {
    if (!confirm("Are you sure you want to delete this mess?")) return;

    try {
      await deleteMess(messId);
      toast({ title: "Mess Deleted" });
      fetchMyMess();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete mess", variant: "destructive" });
    }
  };

  // Toggle room visibility
  const handleToggleRoom = async (roomId: string, currentStatus: boolean) => {
    try {
      await toggleRoomActive(roomId, !currentStatus);
      toast({ title: currentStatus ? "Room Hidden" : "Room Visible" });
      fetchMyRooms();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Toggle mess visibility
  const handleToggleMess = async (messId: string, currentStatus: boolean) => {
    try {
      await toggleMessActive(messId, !currentStatus);
      toast({ title: currentStatus ? "Mess Hidden" : "Mess Visible" });
      fetchMyMess();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

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
            <h1 className="font-heading font-bold text-3xl text-foreground">Owner Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your rooms and mess listings</p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-6 w-full max-w-4xl mb-8">
              <TabsTrigger value="my-rooms" className="gap-2">
                <Building2 className="w-4 h-4" />
                My Rooms
              </TabsTrigger>
              <TabsTrigger value="my-mess" className="gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                My Mess
              </TabsTrigger>
              <TabsTrigger value="bookings" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Bookings & Subs
              </TabsTrigger>
              <TabsTrigger value="add-room" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Room
              </TabsTrigger>
              <TabsTrigger value="add-mess" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Mess
              </TabsTrigger>
              <TabsTrigger value="moderation" className="gap-2">
                <ShieldAlert className="w-4 h-4" />
                Users & Moderation
              </TabsTrigger>
            </TabsList>

            {/* My Rooms Tab */}
            <TabsContent value="my-rooms">
              <div className="bg-card rounded-2xl p-6 shadow-soft">
                <h2 className="font-heading font-semibold text-xl mb-6">My Room Listings</h2>

                {loadingRooms ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : myRooms.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">You haven't added any rooms yet</p>
                    <Button onClick={() => setActiveTab("add-room")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Room
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRooms.map((room) => (
                      <div key={room.id} className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                        <img
                          src={room.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200"}
                          alt={room.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{room.title}</h3>
                            {room.is_verified && (
                              <Badge className="bg-success text-white">Verified</Badge>
                            )}
                            {room.is_featured && (
                              <Badge className="bg-amber-500 text-white font-semibold">★ Featured</Badge>
                            )}
                            {!room.is_active && (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{room.location}</p>
                          <p className="font-semibold text-primary">₹{room.price?.toLocaleString()}/month</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!room.is_featured && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-500 hover:bg-amber-50 text-amber-600 font-medium h-9 text-xs"
                              onClick={() => setPromotingListing({ id: room.id, type: "room", title: room.title })}
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1" />
                              Promote
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleToggleRoom(room.id, room.is_active)}
                          >
                            {room.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingRoom(room)}
                            title="Edit details"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteRoom(room.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* My Mess Tab */}
            <TabsContent value="my-mess">
              <div className="bg-card rounded-2xl p-6 shadow-soft">
                <h2 className="font-heading font-semibold text-xl mb-6">My Mess Listings</h2>

                {loadingMess ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : myMess.length === 0 ? (
                  <div className="text-center py-12">
                    <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">You haven't added any mess yet</p>
                    <Button onClick={() => setActiveTab("add-mess")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Mess
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myMess.map((mess) => (
                      <div key={mess.id} className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                        <img
                          src={mess.images?.[0] || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200"}
                          alt={mess.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{mess.name}</h3>
                            {mess.is_verified && (
                              <Badge className="bg-success text-white">Verified</Badge>
                            )}
                            {mess.is_featured && (
                              <Badge className="bg-amber-500 text-white font-semibold">★ Featured</Badge>
                            )}
                            {!mess.is_active && (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{mess.location}</p>
                          <p className="font-semibold text-primary">₹{mess.price_per_month?.toLocaleString()}/month</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!mess.is_featured && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-500 hover:bg-amber-50 text-amber-600 font-medium h-9 text-xs"
                              onClick={() => setPromotingListing({ id: mess.id, type: "mess", title: mess.name })}
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1" />
                              Promote
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleToggleMess(mess.id, mess.is_active)}
                          >
                            {mess.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingMess(mess)}
                            title="Edit details"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteMess(mess.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Bookings & Subscriptions Tab */}
            <TabsContent value="bookings">
              <div className="space-y-8">
                {/* Room Bookings */}
                <div className="bg-card rounded-2xl p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading font-semibold text-xl flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Room Bookings
                    </h2>
                    <Button variant="outline" size="sm" onClick={fetchSubscriptions}>
                      Refresh
                    </Button>
                  </div>

                  {loadingRoomBookings ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : roomBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No room bookings recorded yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="py-3 px-4 font-semibold text-sm">Subscriber</th>
                            <th className="py-3 px-4 font-semibold text-sm">Room Title</th>
                            <th className="py-3 px-4 font-semibold text-sm">Details</th>
                            <th className="py-3 px-4 font-semibold text-sm">Amount Paid</th>
                            <th className="py-3 px-4 font-semibold text-sm">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomBookings.map((booking) => (
                            <tr key={booking.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-medium text-foreground">{booking.userName}</div>
                                <div className="text-xs text-muted-foreground">{booking.userPhone}</div>
                              </td>
                              <td className="py-3 px-4 font-medium">{booking.listingTitle}</td>
                              <td className="py-3 px-4 text-xs text-muted-foreground">
                                Booked on: {new Date(booking.createdAt).toLocaleDateString("en-IN")}
                              </td>
                              <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{booking.amount?.toLocaleString("en-IN")}
                              </td>
                              <td className="py-3 px-4">
                                <Badge className="bg-success text-white">
                                  {booking.status || "confirmed"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Mess Subscriptions */}
                <div className="bg-card rounded-2xl p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading font-semibold text-xl flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-accent" />
                      Mess Subscriptions
                    </h2>
                  </div>

                  {loadingSubs ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : subscriptions.length === 0 ? (
                    <div className="text-center py-12">
                      <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No mess subscriptions recorded yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="py-3 px-4 font-semibold text-sm">Subscriber</th>
                            <th className="py-3 px-4 font-semibold text-sm">Mess Title</th>
                            <th className="py-3 px-4 font-semibold text-sm">Plan Type</th>
                            <th className="py-3 px-4 font-semibold text-sm">Duration</th>
                            <th className="py-3 px-4 font-semibold text-sm">Amount Paid</th>
                            <th className="py-3 px-4 font-semibold text-sm">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptions.map((sub) => (
                            <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-medium text-foreground">{sub.userName}</div>
                                <div className="text-xs text-muted-foreground">{sub.userPhone}</div>
                              </td>
                              <td className="py-3 px-4 font-medium">{sub.messTitle}</td>
                              <td className="py-3 px-4 capitalize">
                                <Badge variant="outline" className="font-medium">
                                  {sub.planType}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-xs text-muted-foreground">
                                {new Date(sub.startDate).toLocaleDateString("en-IN")} - {new Date(sub.endDate).toLocaleDateString("en-IN")}
                              </td>
                              <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{sub.amount?.toLocaleString("en-IN")}
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  className={
                                    sub.status === "active"
                                      ? "bg-success text-white"
                                      : sub.status === "paused"
                                      ? "bg-amber-500 text-white"
                                      : "bg-destructive text-white"
                                  }
                                >
                                  {sub.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Add Room Tab */}
            <TabsContent value="add-room">
              <div className="bg-card rounded-2xl p-6 shadow-soft max-w-4xl">
                <h2 className="font-heading font-semibold text-xl mb-6">Add New Room</h2>

                <div className="space-y-6">
                  {/* Image Upload */}
                  <div>
                    <Label className="mb-2 block">Room Photos (Max 6)</Label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                      {roomImagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeRoomImage(index)}
                            className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {roomImagePreviews.length < 6 && (
                        <button
                          onClick={() => roomImageInputRef.current?.click()}
                          className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
                        >
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Add Photo</span>
                        </button>
                      )}
                    </div>
                    <input
                      ref={roomImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleRoomImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Basic Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="room-title">Room Title *</Label>
                      <Input
                        id="room-title"
                        value={roomForm.title}
                        onChange={(e) => setRoomForm({ ...roomForm, title: e.target.value })}
                        placeholder="e.g., Spacious Single Room Near University"
                      />
                    </div>
                    <div>
                      <Label htmlFor="room-type">Room Type</Label>
                      <select
                        id="room-type"
                        value={roomForm.room_type}
                        onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="Single">Single</option>
                        <option value="Double">Double</option>
                        <option value="Shared">Shared</option>
                        <option value="PG">PG</option>
                        <option value="Hostel">Hostel</option>
                        <option value="Apartment">Apartment</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="room-desc">Description</Label>
                    <Textarea
                      id="room-desc"
                      value={roomForm.description}
                      onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                      placeholder="Describe your room in detail - amenities, neighborhood, accessibility, etc."
                      rows={4}
                    />
                  </div>

                  {/* Address */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="room-address">Full Address *</Label>
                      <Input
                        id="room-address"
                        value={roomForm.address}
                        onChange={(e) => setRoomForm({ ...roomForm, address: e.target.value })}
                        placeholder="e.g., 123, Rajarampuri 8th Lane"
                      />
                    </div>
                    <div>
                      <Label htmlFor="room-city">City *</Label>
                      <Input
                        id="room-city"
                        value={roomForm.city}
                        onChange={(e) => setRoomForm({ ...roomForm, city: e.target.value })}
                        placeholder="e.g., Kolhapur"
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
                          onClick={geocodeRoomAddress}
                          disabled={geocodingRoom}
                          className="h-8 text-xs gap-1.5"
                        >
                          {geocodingRoom ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                          )}
                          Get Location Coordinates
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={useCurrentDeviceLocationForRoom}
                          disabled={geocodingRoom}
                          className="h-8 text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Use Live GPS Location
                        </Button>
                      </div>
                    </div>

                    {roomCoords && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Location Coordinates Marked ✓</span>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              Latitude: {roomCoords.lat.toFixed(4)}, Longitude: {roomCoords.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${roomCoords.lat}&mlon=${roomCoords.lng}#map=16/${roomCoords.lat}/${roomCoords.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-medium flex items-center gap-1 text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Map
                          </a>
                          <button
                            type="button"
                            onClick={() => setRoomCoords(null)}
                            className="text-destructive hover:underline text-[11px]"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="room-price">Monthly Rent (₹) *</Label>
                      <Input
                        id="room-price"
                        type="number"
                        value={roomForm.price}
                        onChange={(e) => setRoomForm({ ...roomForm, price: e.target.value })}
                        placeholder="e.g., 5500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="room-deposit">Security Deposit (₹)</Label>
                      <Input
                        id="room-deposit"
                        type="number"
                        value={roomForm.deposit}
                        onChange={(e) => setRoomForm({ ...roomForm, deposit: e.target.value })}
                        placeholder="e.g., 10000"
                      />
                    </div>
                  </div>

                  {/* Facilities */}
                  <div>
                    <Label className="mb-2 block">Facilities & Amenities</Label>
                    <div className="flex flex-wrap gap-2">
                      {facilityOptions.map((facility) => (
                        <button
                          key={facility}
                          type="button"
                          onClick={() => toggleFacility(facility)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${roomForm.facilities.includes(facility)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                          {facility}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="room-available">Available From</Label>
                      <Input
                        id="room-available"
                        type="date"
                        value={roomForm.available_from}
                        onChange={(e) => setRoomForm({ ...roomForm, available_from: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="room-tenants">Preferred Tenants</Label>
                      <Input
                        id="room-tenants"
                        value={roomForm.preferred_tenants}
                        onChange={(e) => setRoomForm({ ...roomForm, preferred_tenants: e.target.value })}
                        placeholder="e.g., Students, Working Professionals"
                      />
                    </div>
                  </div>

                  {/* Rules */}
                  <div>
                    <Label htmlFor="room-rules">House Rules</Label>
                    <Textarea
                      id="room-rules"
                      value={roomForm.rules}
                      onChange={(e) => setRoomForm({ ...roomForm, rules: e.target.value })}
                      placeholder="e.g., No smoking, No pets, Visitors allowed till 9 PM"
                      rows={2}
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleSaveRoom}
                    className="w-full"
                    size="lg"
                    disabled={savingRoom}
                  >
                    {savingRoom ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add Room Listing
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Add Mess Tab */}
            <TabsContent value="add-mess">
              <div className="bg-card rounded-2xl p-6 shadow-soft max-w-4xl">
                <h2 className="font-heading font-semibold text-xl mb-6">Add New Mess</h2>

                <div className="space-y-6">
                  {/* Image Upload */}
                  <div>
                    <Label className="mb-2 block">Mess Photos (Max 6)</Label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                      {messImagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeMessImage(index)}
                            className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {messImagePreviews.length < 6 && (
                        <button
                          onClick={() => messImageInputRef.current?.click()}
                          className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
                        >
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Add Photo</span>
                        </button>
                      )}
                    </div>
                    <input
                      ref={messImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMessImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Basic Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mess-name">Mess Name *</Label>
                      <Input
                        id="mess-name"
                        value={messForm.name}
                        onChange={(e) => setMessForm({ ...messForm, name: e.target.value })}
                        placeholder="e.g., Shahu Bhojanalaya"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mess-food-type">Food Type</Label>
                      <select
                        id="mess-food-type"
                        value={messForm.food_type}
                        onChange={(e) => setMessForm({ ...messForm, food_type: e.target.value as "veg" | "non-veg" | "both" })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="veg">Pure Vegetarian</option>
                        <option value="non-veg">Non-Vegetarian</option>
                        <option value="both">Both Veg & Non-Veg</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="mess-desc">Description</Label>
                    <Textarea
                      id="mess-desc"
                      value={messForm.description}
                      onChange={(e) => setMessForm({ ...messForm, description: e.target.value })}
                      placeholder="Describe your mess - specialties, cooking style, hygiene standards, etc."
                      rows={4}
                    />
                  </div>

                  {/* Address */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mess-address">Full Address *</Label>
                      <Input
                        id="mess-address"
                        value={messForm.address}
                        onChange={(e) => setMessForm({ ...messForm, address: e.target.value })}
                        placeholder="e.g., Near Shivaji University Gate"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mess-city">City *</Label>
                      <Input
                        id="mess-city"
                        value={messForm.city}
                        onChange={(e) => setMessForm({ ...messForm, city: e.target.value })}
                        placeholder="e.g., Kolhapur"
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
                          onClick={geocodeMessAddress}
                          disabled={geocodingMess}
                          className="h-8 text-xs gap-1.5"
                        >
                          {geocodingMess ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                          )}
                          Get Location Coordinates
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={useCurrentDeviceLocationForMess}
                          disabled={geocodingMess}
                          className="h-8 text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Use Live GPS Location
                        </Button>
                      </div>
                    </div>

                    {messCoords && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Location Coordinates Marked ✓</span>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              Latitude: {messCoords.lat.toFixed(4)}, Longitude: {messCoords.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${messCoords.lat}&mlon=${messCoords.lng}#map=16/${messCoords.lat}/${messCoords.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-medium flex items-center gap-1 text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Map
                          </a>
                          <button
                            type="button"
                            onClick={() => setMessCoords(null)}
                            className="text-destructive hover:underline text-[11px]"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price & Timings */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mess-price">Monthly Price (₹) *</Label>
                      <Input
                        id="mess-price"
                        type="number"
                        value={messForm.price_per_month}
                        onChange={(e) => setMessForm({ ...messForm, price_per_month: e.target.value })}
                        placeholder="e.g., 2500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mess-timings">Timings</Label>
                      <Input
                        id="mess-timings"
                        value={messForm.timings}
                        onChange={(e) => setMessForm({ ...messForm, timings: e.target.value })}
                        placeholder="e.g., 7AM - 10PM"
                      />
                    </div>
                  </div>

                  {/* Menu Highlights */}
                  <div>
                    <Label htmlFor="mess-menu">Menu Highlights (comma separated)</Label>
                    <Input
                      id="mess-menu"
                      value={messForm.menu_highlights}
                      onChange={(e) => setMessForm({ ...messForm, menu_highlights: e.target.value })}
                      placeholder="e.g., Misal Pav, Thali, Tambda Rassa, Pandhra Rassa"
                    />
                  </div>

                  {/* Weekly Menu Schedule Editor */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <Label className="text-base font-semibold block text-foreground">Weekly Menu Schedule</Label>
                        <p className="text-xs text-muted-foreground">Specify Lunch and Dinner menus for each day of the week</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const defaultMenu = {
                            Monday: { lunch: "Varan Bhaat, Bhaji, Chapati, Salad", dinner: "Misal Pav, Buttermilk" },
                            Tuesday: { lunch: "Usal, Rice, Chapati, Papad", dinner: "Dal Khichdi, Kadhi" },
                            Wednesday: { lunch: "Tambda Rassa, Rice, Bhakri", dinner: "Veg Pulao, Raita" },
                            Thursday: { lunch: "Matki Usal, Chapati, Rice", dinner: "Chole Bhature" },
                            Friday: { lunch: "Pandhra Rassa, Rice, Bhakri", dinner: "Pav Bhaji" },
                            Saturday: { lunch: "Special Thali", dinner: "Biryani (Veg/Non-veg)" },
                            Sunday: { lunch: "Mutton Thali / Paneer Thali", dinner: "Light Dinner" }
                          };
                          setMessForm({ ...messForm, weekly_menu: defaultMenu });
                          toast({ title: "Weekly Menu pre-populated ✓" });
                        }}
                        className="h-8 text-xs px-3"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5 text-primary" />
                        Load Standard Menu Template
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 border rounded-xl p-3 bg-muted/20">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                        const dayMenu = (() => {
                          if (!messForm.weekly_menu) return { lunch: "", dinner: "" };
                          const menu = typeof messForm.weekly_menu === 'string'
                            ? JSON.parse(messForm.weekly_menu)
                            : messForm.weekly_menu;
                          return menu[day] || { lunch: "", dinner: "" };
                        })();

                        return (
                          <div key={day} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center p-2.5 bg-card rounded-lg border">
                            <span className="font-semibold text-sm text-foreground">{day}</span>
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Lunch</Label>
                              <Input
                                placeholder="e.g. Varan Bhaat, Bhaji, Chapati"
                                value={dayMenu.lunch || ""}
                                onChange={(e) => {
                                  const currentMenu = (() => {
                                    if (!messForm.weekly_menu) return {};
                                    return typeof messForm.weekly_menu === 'string'
                                      ? JSON.parse(messForm.weekly_menu)
                                      : { ...messForm.weekly_menu };
                                  })();
                                  currentMenu[day] = {
                                    ...currentMenu[day],
                                    lunch: e.target.value
                                  };
                                  setMessForm({ ...messForm, weekly_menu: currentMenu });
                                }}
                                className="h-8 text-xs text-foreground bg-background mt-0.5"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Dinner</Label>
                              <Input
                                placeholder="e.g. Misal Pav, Buttermilk"
                                value={dayMenu.dinner || ""}
                                onChange={(e) => {
                                  const currentMenu = (() => {
                                    if (!messForm.weekly_menu) return {};
                                    return typeof messForm.weekly_menu === 'string'
                                      ? JSON.parse(messForm.weekly_menu)
                                      : { ...messForm.weekly_menu };
                                  })();
                                  currentMenu[day] = {
                                    ...currentMenu[day],
                                    dinner: e.target.value
                                  };
                                  setMessForm({ ...messForm, weekly_menu: currentMenu });
                                }}
                                className="h-8 text-xs text-foreground bg-background mt-0.5"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleSaveMess}
                    className="w-full"
                    size="lg"
                    disabled={savingMess}
                  >
                    {savingMess ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add Mess Listing
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="moderation">
              <div className="space-y-6 text-foreground text-left">
                {/* Stats Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div
                    onClick={() => setActiveModSubTab("users")}
                    className="bg-card p-5 rounded-2xl shadow-card border flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Total Revenue</p>
                      <h3 className="font-heading font-bold text-2xl text-primary mt-1">₹{(roomBookings.reduce((sum, b) => sum + (b.amount || 0), 0) + subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0)).toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                      <Coins className="w-6 h-6" />
                    </div>
                  </div>
                  <div
                    onClick={() => setActiveModSubTab("users")}
                    className="bg-card p-5 rounded-2xl shadow-card border flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Total Customers</p>
                      <h3 className="font-heading font-bold text-2xl text-foreground mt-1">{getUniqueCustomers().length}</h3>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-950/20 rounded-full text-blue-500">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setActiveModSubTab("reviews");
                      setShowCustomerReviewsModal(true);
                    }}
                    className="bg-card p-5 rounded-2xl shadow-card border flex items-center justify-between cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
                    title="Click to view total customer reviews"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold group-hover:text-amber-500 transition-colors">Total Customer Reviews</p>
                      <h3 className="font-heading font-bold text-2xl text-foreground mt-1 flex items-center gap-1.5">
                        {reviews.filter(r => myRooms.some(room => room.id === r.listing_id) || myMess.some(m => m.id === r.listing_id)).length}
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-normal group-hover:underline ml-1">View All &rarr;</span>
                      </h3>
                    </div>
                    <div className="p-3 bg-amber-100 dark:bg-amber-950/20 rounded-full text-amber-500 group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                  </div>
                  <div
                    onClick={() => setActiveModSubTab("users")}
                    className="bg-card p-5 rounded-2xl shadow-card border flex items-center justify-between cursor-pointer hover:border-red-500/50 transition-all"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Blocked Users</p>
                      <h3 className="font-heading font-bold text-2xl text-foreground mt-1">{blockedUsers.length}</h3>
                    </div>
                    <div className="p-3 bg-red-100 dark:bg-red-950/20 rounded-full text-red-500">
                      <Ban className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Sub navigation buttons */}
                <div className="flex gap-2 border-b pb-2">
                  <Button 
                    variant={activeModSubTab === "users" ? "default" : "ghost"} 
                    onClick={() => setActiveModSubTab("users")}
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Customers & Bookings
                  </Button>
                  <Button 
                    variant={activeModSubTab === "reviews" ? "default" : "ghost"} 
                    onClick={() => setActiveModSubTab("reviews")}
                    className="gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Reviews Control
                  </Button>
                  <Button 
                    variant={activeModSubTab === "reports" ? "default" : "ghost"} 
                    onClick={() => setActiveModSubTab("reports")}
                    className="gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Reports & Logs
                  </Button>
                </div>

                {/* Sub tabs content */}
                {activeModSubTab === "users" && (
                  <div className="bg-card p-6 rounded-2xl shadow-card border">
                    <h3 className="font-heading font-semibold text-lg mb-4">Customer Directory</h3>
                    {getUniqueCustomers().length === 0 ? (
                      <p className="text-sm text-muted-foreground italic text-center py-6">No enquired or booked customers found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted-foreground">
                          <thead className="text-xs text-foreground uppercase bg-muted/50 rounded-lg">
                            <tr>
                              <th className="px-6 py-3">Customer Name</th>
                              <th className="px-6 py-3">Contact</th>
                              <th className="px-6 py-3">Bookings</th>
                              <th className="px-6 py-3">Total Paid</th>
                              <th className="px-6 py-3">Blocked Status</th>
                              <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getUniqueCustomers().map((cust) => {
                              const isBlocked = blockedUsers.includes(cust.id);
                              return (
                                <tr key={cust.id} className="border-b hover:bg-muted/20">
                                  <td className="px-6 py-4 font-medium text-foreground">{cust.name}</td>
                                  <td className="px-6 py-4">
                                    <div className="text-xs">
                                      <p>{cust.email}</p>
                                      <p>{cust.phone}</p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">{cust.bookings.length} active</td>
                                  <td className="px-6 py-4 font-bold text-foreground">₹{cust.totalPaid.toLocaleString()}</td>
                                  <td className="px-6 py-4">
                                    <Badge variant={isBlocked ? "destructive" : "secondary"}>
                                      {isBlocked ? "Blocked" : "Active"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => setSelectedUserHistory(cust)}>
                                      <FileText className="w-3.5 h-3.5 mr-1" />
                                      History
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant={isBlocked ? "outline" : "destructive"} 
                                      onClick={() => handleToggleBlock(cust.id)}
                                    >
                                      {isBlocked ? <UserCheck className="w-3.5 h-3.5 mr-1" /> : <Ban className="w-3.5 h-3.5 mr-1" />}
                                      {isBlocked ? "Unblock" : "Block"}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setReportingUser(cust)}>
                                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                      Report
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeModSubTab === "reviews" && (
                  <div className="bg-card p-6 rounded-2xl shadow-card border space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                      <div>
                        <h3 className="font-heading font-semibold text-lg">Reviews on Your Listings</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Manage and respond to customer reviews for your rooms and mess listings</p>
                      </div>
                      <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                        <Button
                          variant={reviewListingTypeFilter === "all" ? "default" : "ghost"}
                          size="sm"
                          className="h-8 text-xs font-medium px-3 rounded-lg"
                          onClick={() => setReviewListingTypeFilter("all")}
                        >
                          All ({reviews.filter(r => myRooms.some(room => room.id === r.listing_id) || myMess.some(m => m.id === r.listing_id)).length})
                        </Button>
                        <Button
                          variant={reviewListingTypeFilter === "room" ? "default" : "ghost"}
                          size="sm"
                          className="h-8 text-xs font-medium px-3 rounded-lg gap-1"
                          onClick={() => setReviewListingTypeFilter("room")}
                        >
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          Rooms ({reviews.filter(r => myRooms.some(room => room.id === r.listing_id)).length})
                        </Button>
                        <Button
                          variant={reviewListingTypeFilter === "mess" ? "default" : "ghost"}
                          size="sm"
                          className="h-8 text-xs font-medium px-3 rounded-lg gap-1"
                          onClick={() => setReviewListingTypeFilter("mess")}
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                          Mess ({reviews.filter(r => myMess.some(m => m.id === r.listing_id)).length})
                        </Button>
                      </div>
                    </div>

                    {(() => {
                      const allOwnerReviews = reviews.filter(r => myRooms.some(room => room.id === r.listing_id) || myMess.some(m => m.id === r.listing_id));
                      const filteredReviews = allOwnerReviews.filter(r => {
                        const isRoom = myRooms.some(room => room.id === r.listing_id);
                        const isMess = myMess.some(m => m.id === r.listing_id);
                        if (reviewListingTypeFilter === "room") return isRoom;
                        if (reviewListingTypeFilter === "mess") return isMess;
                        return true;
                      });

                      if (filteredReviews.length === 0) {
                        return <p className="text-sm text-muted-foreground italic text-center py-6">No reviews found for this filter.</p>;
                      }
                      return (
                        <div className="space-y-6">
                          {filteredReviews.map((rev) => {
                            const room = myRooms.find(r => r.id === rev.listing_id);
                            const mess = myMess.find(m => m.id === rev.listing_id);
                            const title = room ? `Room: "${room.title}"` : mess ? `Mess: "${mess.name}"` : "Unknown Listing";
                            return (
                              <div key={rev.id} className="p-4 bg-muted/30 rounded-xl border space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[10px] text-primary uppercase font-bold tracking-wider">{title}</span>
                                    <h4 className="font-semibold text-sm mt-0.5">Rating: {rev.rating}★</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">Reviewed on: {new Date(rev.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <Badge variant={rev.status === "flagged" ? "destructive" : "secondary"}>
                                    {rev.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-foreground italic">"{rev.comment}"</p>
                                
                                {/* Owner reply display / input */}
                                <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                                  {rev.owner_reply ? (
                                    <div className="bg-muted/80 p-3 rounded border border-border flex justify-between items-start">
                                      <div>
                                        <p className="font-bold text-xs text-primary">Your Response:</p>
                                        <p className="text-xs text-foreground italic mt-1">"{rev.owner_reply}"</p>
                                        {rev.owner_replied_at && (
                                          <p className="text-[9px] text-muted-foreground mt-1">Replied on: {new Date(rev.owner_replied_at).toLocaleDateString()}</p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" className="h-6 text-xs text-primary" onClick={() => {
                                          setSelectedReviewForReply(rev.id);
                                          setReplyText(rev.owner_reply || "");
                                        }}>
                                          <Edit className="w-3 h-3 mr-1" />
                                          Edit
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => handleReplyDelete(rev.id)}>
                                          <Trash2 className="w-3 h-3 mr-1" />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    selectedReviewForReply === rev.id ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={replyText}
                                          onChange={(e) => setReplyText(e.target.value)}
                                          placeholder="Type your response to this customer..."
                                          className="text-xs text-foreground bg-background"
                                        />
                                        <div className="flex justify-end gap-2">
                                          <Button size="sm" variant="outline" onClick={() => {
                                            setSelectedReviewForReply(null);
                                            setReplyText("");
                                          }}>
                                            Cancel
                                          </Button>
                                          <Button size="sm" onClick={() => handleReplySubmit(rev.id)} disabled={submittingReply}>
                                            {submittingReply ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                                            Post Response
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button size="sm" variant="outline" onClick={() => setSelectedReviewForReply(rev.id)}>
                                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                        Write Response
                                      </Button>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeModSubTab === "reports" && (
                  <div className="bg-card p-6 rounded-2xl shadow-card border">
                    <h3 className="font-heading font-semibold text-lg mb-4">Report Logs</h3>
                    {(() => {
                      const filteredReports = reports.filter(r => 
                        r.reporter_id === user.id || 
                        (r.target_type === "listing" && (myRooms.some(room => room.id === r.target_id) || myMess.some(m => m.id === r.target_id)))
                      );
                      if (filteredReports.length === 0) {
                        return <p className="text-sm text-muted-foreground italic text-center py-6">No reports filed or received.</p>;
                      }
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left text-muted-foreground">
                            <thead className="text-xs text-foreground uppercase bg-muted/50">
                              <tr>
                                <th className="px-6 py-3">Report Date</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Reason</th>
                                <th className="px-6 py-3">Direction</th>
                                <th className="px-6 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredReports.map((rep) => {
                                const isFiledByMe = rep.reporter_id === user.id;
                                return (
                                  <tr key={rep.id} className="border-b hover:bg-muted/20">
                                    <td className="px-6 py-4">{new Date(rep.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 uppercase font-semibold text-foreground text-xs">{rep.target_type}</td>
                                    <td className="px-6 py-4 italic text-foreground text-sm">"{rep.reason}"</td>
                                    <td className="px-6 py-4 text-xs">
                                      <Badge variant={isFiledByMe ? "default" : "outline"}>
                                        {isFiledByMe ? "Filed by Me" : "Received"}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge className={rep.status === "open" ? "bg-amber-600 text-white" : "bg-success text-white"}>
                                        {rep.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
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
          <div className="bg-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border text-foreground">
            <div className="flex items-center justify-between mb-6 pb-2 border-b">
              <h3 className="font-heading font-semibold text-xl">Edit Room Listing</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingRoom(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-room-title">Room Title *</Label>
                <Input
                  id="edit-room-title"
                  value={editingRoom.title}
                  onChange={(e) => setEditingRoom({ ...editingRoom, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-room-desc">Description</Label>
                <Textarea
                  id="edit-room-desc"
                  value={editingRoom.description || ""}
                  onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-room-loc">Area / Landmark *</Label>
                  <Input
                    id="edit-room-loc"
                    value={editingRoom.location}
                    onChange={(e) => setEditingRoom({ ...editingRoom, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-room-addr">Address *</Label>
                  <Input
                    id="edit-room-addr"
                    value={editingRoom.address || ""}
                    onChange={(e) => setEditingRoom({ ...editingRoom, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-room-city">City *</Label>
                  <Input
                    id="edit-room-city"
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
                      disabled={geocodingRoom}
                      className="h-8 text-xs gap-1.5"
                    >
                      {geocodingRoom ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      )}
                      Get Location Coordinates
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={useCurrentDeviceLocationForEditingRoom}
                      disabled={geocodingRoom}
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

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-room-price">Monthly Price (₹) *</Label>
                  <Input
                    id="edit-room-price"
                    type="number"
                    value={editingRoom.price}
                    onChange={(e) => setEditingRoom({ ...editingRoom, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-room-deposit">Deposit (₹)</Label>
                  <Input
                    id="edit-room-deposit"
                    type="number"
                    value={editingRoom.deposit || ""}
                    onChange={(e) => setEditingRoom({ ...editingRoom, deposit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-room-type">Room Type *</Label>
                  <select
                    id="edit-room-type"
                    value={editingRoom.room_type}
                    onChange={(e) => setEditingRoom({ ...editingRoom, room_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                  >
                    <option value="Single">Single</option>
                    <option value="Shared">Shared</option>
                    <option value="Double">Double</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-room-tenants">Preferred Tenants</Label>
                  <Input
                    id="edit-room-tenants"
                    value={editingRoom.preferred_tenants || ""}
                    onChange={(e) => setEditingRoom({ ...editingRoom, preferred_tenants: e.target.value })}
                    placeholder="e.g. Students / Employees"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-room-avail">Available From</Label>
                  <Input
                    id="edit-room-avail"
                    type="date"
                    value={editingRoom.available_from || ""}
                    onChange={(e) => setEditingRoom({ ...editingRoom, available_from: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-room-rules">Rules</Label>
                <Input
                  id="edit-room-rules"
                  value={editingRoom.rules || ""}
                  onChange={(e) => setEditingRoom({ ...editingRoom, rules: e.target.value })}
                  placeholder="e.g. No smoking, No pets"
                />
              </div>

              <div>
                <Label className="mb-2 block">Facilities</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {facilityOptions.map((facility) => {
                    const hasFacility = editingRoom.facilities?.includes(facility);
                    return (
                      <label key={facility} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasFacility}
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
                    id="new-room-image-url"
                    className="flex-1"
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
                      const input = document.getElementById("new-room-image-url") as HTMLInputElement;
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

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
                <Button onClick={saveRoom} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
          <div className="bg-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border text-foreground">
            <div className="flex items-center justify-between mb-6 pb-2 border-b">
              <h3 className="font-heading font-semibold text-xl">Edit Mess Listing</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingMess(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-mess-name">Mess Name *</Label>
                <Input
                  id="edit-mess-name"
                  value={editingMess.name}
                  onChange={(e) => setEditingMess({ ...editingMess, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-mess-desc">Description</Label>
                <Textarea
                  id="edit-mess-desc"
                  value={editingMess.description || ""}
                  onChange={(e) => setEditingMess({ ...editingMess, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-mess-loc">Area / Landmark *</Label>
                  <Input
                    id="edit-mess-loc"
                    value={editingMess.location}
                    onChange={(e) => setEditingMess({ ...editingMess, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mess-addr">Address *</Label>
                  <Input
                    id="edit-mess-addr"
                    value={editingMess.address || ""}
                    onChange={(e) => setEditingMess({ ...editingMess, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mess-city">City *</Label>
                  <Input
                    id="edit-mess-city"
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
                      disabled={geocodingMess}
                      className="h-8 text-xs gap-1.5"
                    >
                      {geocodingMess ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      )}
                      Get Location Coordinates
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={useCurrentDeviceLocationForEditingMess}
                      disabled={geocodingMess}
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
                  <Label htmlFor="edit-mess-price">Monthly Price (₹) *</Label>
                  <Input
                    id="edit-mess-price"
                    type="number"
                    value={editingMess.price_per_month}
                    onChange={(e) => setEditingMess({ ...editingMess, price_per_month: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mess-food">Food Type *</Label>
                  <select
                    id="edit-mess-food"
                    value={editingMess.food_type}
                    onChange={(e) => setEditingMess({ ...editingMess, food_type: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                  >
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-mess-timings">Timings</Label>
                  <Input
                    id="edit-mess-timings"
                    value={editingMess.timings || ""}
                    onChange={(e) => setEditingMess({ ...editingMess, timings: e.target.value })}
                    placeholder="e.g. 7AM - 10PM"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-mess-menu">Menu Highlights (comma separated)</Label>
                <Input
                  id="edit-mess-menu"
                  value={Array.isArray(editingMess.menu_highlights) ? editingMess.menu_highlights.join(", ") : editingMess.menu_highlights || ""}
                  onChange={(e) => setEditingMess({ ...editingMess, menu_highlights: e.target.value as any })}
                  placeholder="e.g. Misal Pav, Thali, Tambda Rassa"
                />
              </div>

              <div>
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
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste image URL here"
                    id="new-mess-image-url"
                    className="flex-1"
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
                      const input = document.getElementById("new-mess-image-url") as HTMLInputElement;
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

              <div>
                <div className="flex items-center justify-between mb-2 border-b pb-1">
                  <Label className="font-semibold text-base">Weekly Menu (Lunch & Dinner)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
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
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                    const dayMenu = (() => {
                      if (!editingMess.weekly_menu) return { lunch: "", dinner: "" };
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

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingMess(null)}>Cancel</Button>
                <Button onClick={saveMess} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {promotingListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md text-center border">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
            <h3 className="font-heading font-semibold text-xl mb-2">Promote Your Listing</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Feature <strong>"{promotingListing.title}"</strong> at the top of search results and home screen for 30 days to get 5x more enquiries!
            </p>
            <div className="bg-muted p-3 rounded-lg mb-6 text-sm flex justify-between items-center">
              <span className="text-muted-foreground">Promotion Charge:</span>
              <span className="font-bold text-lg text-primary">₹{featuredListingPrice}</span>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setPromotingListing(null)} disabled={promoting}>
                Cancel
              </Button>
              <Button onClick={handlePromoteListing} disabled={promoting} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
                {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Pay & Feature Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedUserHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-foreground text-left">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="font-heading font-semibold text-lg">Booking History: {selectedUserHistory.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedUserHistory(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Contact Info</p>
                <p className="text-sm mt-0.5">Email: {selectedUserHistory.email}</p>
                <p className="text-sm">Phone: {selectedUserHistory.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Bookings & Payments</p>
                <div className="space-y-2">
                  {selectedUserHistory.bookings.map((booking: any) => (
                    <div key={booking.id} className="p-3 bg-muted/50 rounded-lg border flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{booking.title}</p>
                        <p className="text-muted-foreground mt-0.5">Type: <span className="uppercase font-semibold">{booking.type}</span></p>
                        <p className="text-muted-foreground mt-0.5">Date: {new Date(booking.date).toLocaleDateString()}</p>
                        <Badge className="mt-1" variant={booking.status === "active" || booking.status === "confirmed" ? "secondary" : "default"}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground text-[10px]">Amount Paid</p>
                        <p className="font-bold text-primary text-sm mt-0.5">₹{booking.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t mt-4">
              <Button onClick={() => setSelectedUserHistory(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {reportingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-foreground text-left">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="font-heading font-semibold text-lg">Report User: {reportingUser.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setReportingUser(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Describe the issue you encountered with this user. Your report will be sent to the administrator panel for review.
              </p>
              <div>
                <Label htmlFor="report-reason">Reason for Report</Label>
                <Textarea
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="e.g. Failure to make payments, violation of listing rules, toxic behaviour..."
                  rows={4}
                  className="mt-1 text-sm bg-background text-foreground"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setReportingUser(null)}>Cancel</Button>
              <Button onClick={handleUserReportSubmit} disabled={submittingReport} variant="destructive">
                {submittingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCustomerReviewsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-foreground text-left">
          <div className="bg-card rounded-2xl p-6 w-full max-w-3xl shadow-2xl border max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-heading font-bold text-xl flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  Total Customer Reviews (Rooms & Mess)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Comprehensive review logs submitted by customers for your listings</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCustomerReviewsModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {(() => {
              const allOwnerReviews = reviews.filter(r => myRooms.some(room => room.id === r.listing_id) || myMess.some(m => m.id === r.listing_id));
              const roomReviews = allOwnerReviews.filter(r => myRooms.some(room => room.id === r.listing_id));
              const messReviews = allOwnerReviews.filter(r => myMess.some(m => m.id === r.listing_id));
              const avgRating = allOwnerReviews.length > 0 ? (allOwnerReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / allOwnerReviews.length).toFixed(1) : "N/A";

              const displayReviews = allOwnerReviews.filter(r => {
                const isRoom = myRooms.some(room => room.id === r.listing_id);
                const isMess = myMess.some(m => m.id === r.listing_id);
                if (reviewListingTypeFilter === "room") return isRoom;
                if (reviewListingTypeFilter === "mess") return isMess;
                return true;
              });

              return (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-muted/40 rounded-xl border">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Reviews</p>
                      <p className="text-xl font-bold text-foreground mt-0.5">{allOwnerReviews.length}</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/50">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Average Rating</p>
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{avgRating} ★</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50 dark:border-blue-900/50">
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold">Room Reviews</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">{roomReviews.length}</p>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Mess Reviews</p>
                      <p className="text-xl font-bold text-foreground mt-0.5">{messReviews.length}</p>
                    </div>
                  </div>

                  {/* Filter Subtabs */}
                  <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                    <Button
                      variant={reviewListingTypeFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs font-medium px-3 rounded-lg"
                      onClick={() => setReviewListingTypeFilter("all")}
                    >
                      All Reviews ({allOwnerReviews.length})
                    </Button>
                    <Button
                      variant={reviewListingTypeFilter === "room" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs font-medium px-3 rounded-lg gap-1"
                      onClick={() => setReviewListingTypeFilter("room")}
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      Rooms ({roomReviews.length})
                    </Button>
                    <Button
                      variant={reviewListingTypeFilter === "mess" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs font-medium px-3 rounded-lg gap-1"
                      onClick={() => setReviewListingTypeFilter("mess")}
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                      Mess ({messReviews.length})
                    </Button>
                  </div>

                  {/* Reviews List */}
                  {displayReviews.length === 0 ? (
                    <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed">
                      <p className="text-sm text-muted-foreground italic">No customer reviews found for this selection.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {displayReviews.map((rev) => {
                        const room = myRooms.find(r => r.id === rev.listing_id);
                        const mess = myMess.find(m => m.id === rev.listing_id);
                        const title = room ? `Room: "${room.title}"` : mess ? `Mess: "${mess.name}"` : "Unknown Listing";
                        return (
                          <div key={rev.id} className="p-4 bg-muted/30 rounded-xl border space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] text-primary uppercase font-bold tracking-wider">{title}</span>
                                <h4 className="font-semibold text-sm mt-0.5 text-amber-500">Rating: {rev.rating}★</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Reviewed on: {new Date(rev.created_at).toLocaleDateString()}</p>
                              </div>
                              <Badge variant={rev.status === "flagged" ? "destructive" : "secondary"}>
                                {rev.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground italic">"{rev.comment}"</p>

                            {/* Owner Response Display */}
                            <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                              {rev.owner_reply ? (
                                <div className="bg-muted/80 p-3 rounded border border-border flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-xs text-primary">Your Response:</p>
                                    <p className="text-xs text-foreground italic mt-1">"{rev.owner_reply}"</p>
                                    {rev.owner_replied_at && (
                                      <p className="text-[9px] text-muted-foreground mt-1">Replied on: {new Date(rev.owner_replied_at).toLocaleDateString()}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" className="h-6 text-xs text-primary" onClick={() => {
                                      setSelectedReviewForReply(rev.id);
                                      setReplyText(rev.owner_reply || "");
                                    }}>
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => handleReplyDelete(rev.id)}>
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                selectedReviewForReply === rev.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder="Type your response to this customer..."
                                      className="text-xs text-foreground bg-background"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" onClick={() => {
                                        setSelectedReviewForReply(null);
                                        setReplyText("");
                                      }}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => handleReplySubmit(rev.id)} disabled={submittingReply}>
                                        {submittingReply ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                                        Submit Response
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                                    setSelectedReviewForReply(rev.id);
                                    setReplyText("");
                                  }}>
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    Reply to Customer
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setShowCustomerReviewsModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default OwnerDashboard;
