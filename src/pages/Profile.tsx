import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    User,
    Phone,
    Mail,
    Save,
    Loader2,
    ArrowLeft,
    Shield,
    Calendar,
    LogOut,
    Building2,
    UtensilsCrossed,
    LayoutDashboard,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    Search,
    Users,
    Plus,
} from "lucide-react";
import { getProfile, updateProfile, Profile } from "@/services/profileService";
import { getRoomsByOwner, deleteRoom, toggleRoomActive, Room } from "@/services/roomService";
import { getMessByOwner, deleteMess, toggleMessActive, Mess } from "@/services/messService";
import { supabase } from "@/integrations/supabase/client";

interface OwnerWithListings {
    id: string;
    name: string;
    email: string;
    phone?: string;
    rooms: Room[];
    mess: Mess[];
    created_at: string;
}

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, userRole, signOut, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editProfile, setEditProfile] = useState({
        first_name: "",
        last_name: "",
        phone: "",
    });

    // Owner-specific states
    const [myRooms, setMyRooms] = useState<Room[]>([]);
    const [myMess, setMyMess] = useState<Mess[]>([]);
    const [loadingListings, setLoadingListings] = useState(false);

    // Admin-specific states
    const [allOwners, setAllOwners] = useState<OwnerWithListings[]>([]);
    const [loadingOwners, setLoadingOwners] = useState(false);
    const [ownerSearch, setOwnerSearch] = useState("");
    const [selectedOwner, setSelectedOwner] = useState<OwnerWithListings | null>(null);

    // Active tab
    const [activeTab, setActiveTab] = useState("profile");

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        }
    }, [user, authLoading, navigate]);

    // Load profile data
    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;

            setLoading(true);
            try {
                const profileData = await getProfile();
                if (profileData) {
                    setProfile(profileData);
                    setEditProfile({
                        first_name: profileData.first_name || "",
                        last_name: profileData.last_name || "",
                        phone: profileData.phone || "",
                    });
                }
            } catch (err) {
                console.error("Error loading profile:", err);
                toast({
                    title: "Error",
                    description: "Failed to load profile data.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user, toast]);

    // Load owner's listings
    useEffect(() => {
        const loadMyListings = async () => {
            if (!user || userRole !== "owner") return;

            setLoadingListings(true);
            try {
                const [rooms, mess] = await Promise.all([
                    getRoomsByOwner(user.id),
                    getMessByOwner(user.id),
                ]);
                setMyRooms(rooms);
                setMyMess(mess);
            } catch (err) {
                console.error("Error loading listings:", err);
            } finally {
                setLoadingListings(false);
            }
        };

        loadMyListings();
    }, [user, userRole]);

    // Load all owners for admin
    useEffect(() => {
        const loadAllOwners = async () => {
            if (!user || userRole !== "admin") return;

            setLoadingOwners(true);
            try {
                // Get all owners from user_roles
                const { data: rolesData } = await supabase
                    .from("user_roles")
                    .select("user_id, role")
                    .eq("role", "owner");

                if (!rolesData) {
                    setAllOwners([]);
                    return;
                }

                // Get profiles for these owners
                const ownerIds = rolesData.map((r) => r.user_id);
                const { data: profilesData } = await supabase
                    .from("profiles")
                    .select("*")
                    .in("user_id", ownerIds);

                // Get all rooms
                const { data: roomsData } = await supabase
                    .from("rooms")
                    .select("*")
                    .in("owner_id", ownerIds);

                // Get all mess
                const { data: messData } = await supabase
                    .from("mess")
                    .select("*")
                    .in("owner_id", ownerIds);

                // Combine data
                const ownersWithListings: OwnerWithListings[] = ownerIds.map((ownerId) => {
                    const profile = profilesData?.find((p) => p.user_id === ownerId);
                    const ownerRooms = (roomsData || []).filter((r) => r.owner_id === ownerId) as Room[];
                    const ownerMess = (messData || []).filter((m) => m.owner_id === ownerId) as Mess[];

                    return {
                        id: ownerId,
                        name: profile
                            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Owner"
                            : "Unknown",
                        email: ownerId.substring(0, 8) + "...",
                        phone: profile?.phone || "",
                        rooms: ownerRooms,
                        mess: ownerMess,
                        created_at: profile?.created_at || "",
                    };
                });

                setAllOwners(ownersWithListings);
            } catch (err) {
                console.error("Error loading owners:", err);
            } finally {
                setLoadingOwners(false);
            }
        };

        loadAllOwners();
    }, [user, userRole]);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await updateProfile(editProfile);
            toast({
                title: "Profile Updated",
                description: "Your profile has been saved successfully.",
            });
            const updatedProfile = await getProfile();
            if (updatedProfile) {
                setProfile(updatedProfile);
            }
        } catch {
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate("/");
    };

    const getDashboardLink = () => {
        switch (userRole) {
            case "admin":
                return "/admin/dashboard";
            case "owner":
                return "/owner/dashboard";
            default:
                return "/dashboard";
        }
    };

    const getRoleBadge = () => {
        switch (userRole) {
            case "admin":
                return <Badge className="bg-purple-500">Admin</Badge>;
            case "owner":
                return <Badge className="bg-blue-500">Property Owner</Badge>;
            default:
                return <Badge variant="outline">User</Badge>;
        }
    };

    // Owner functions
    const handleToggleRoom = async (roomId: string, currentStatus: boolean) => {
        try {
            await toggleRoomActive(roomId, !currentStatus);
            toast({ title: currentStatus ? "Room Hidden" : "Room Visible" });
            // Reload rooms
            if (user) {
                const rooms = await getRoomsByOwner(user.id);
                setMyRooms(rooms);
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        if (!confirm("Are you sure you want to delete this room?")) return;
        try {
            await deleteRoom(roomId);
            toast({ title: "Room Deleted" });
            if (user) {
                const rooms = await getRoomsByOwner(user.id);
                setMyRooms(rooms);
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleToggleMess = async (messId: string, currentStatus: boolean) => {
        try {
            await toggleMessActive(messId, !currentStatus);
            toast({ title: currentStatus ? "Mess Hidden" : "Mess Visible" });
            if (user) {
                const mess = await getMessByOwner(user.id);
                setMyMess(mess);
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleDeleteMess = async (messId: string) => {
        if (!confirm("Are you sure you want to delete this mess?")) return;
        try {
            await deleteMess(messId);
            toast({ title: "Mess Deleted" });
            if (user) {
                const mess = await getMessByOwner(user.id);
                setMyMess(mess);
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    // Admin functions
    const handleAdminToggleRoom = async (roomId: string, currentStatus: boolean) => {
        try {
            await supabase.from("rooms").update({ is_active: !currentStatus }).eq("id", roomId);
            toast({ title: currentStatus ? "Room Hidden" : "Room Visible" });
            // Reload the selected owner's data
            if (selectedOwner) {
                const { data } = await supabase.from("rooms").select("*").eq("owner_id", selectedOwner.id);
                setSelectedOwner({ ...selectedOwner, rooms: (data as Room[]) || [] });
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleAdminDeleteRoom = async (roomId: string) => {
        if (!confirm("Are you sure you want to permanently delete this room?")) return;
        try {
            await supabase.from("rooms").delete().eq("id", roomId);
            toast({ title: "Room Deleted" });
            if (selectedOwner) {
                const { data } = await supabase.from("rooms").select("*").eq("owner_id", selectedOwner.id);
                setSelectedOwner({ ...selectedOwner, rooms: (data as Room[]) || [] });
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleAdminVerifyRoom = async (roomId: string, currentStatus: boolean) => {
        try {
            await supabase.from("rooms").update({ is_verified: !currentStatus }).eq("id", roomId);
            toast({ title: currentStatus ? "Room Unverified" : "Room Verified ✓" });
            if (selectedOwner) {
                const { data } = await supabase.from("rooms").select("*").eq("owner_id", selectedOwner.id);
                setSelectedOwner({ ...selectedOwner, rooms: (data as Room[]) || [] });
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleAdminToggleMess = async (messId: string, currentStatus: boolean) => {
        try {
            await supabase.from("mess").update({ is_active: !currentStatus }).eq("id", messId);
            toast({ title: currentStatus ? "Mess Hidden" : "Mess Visible" });
            if (selectedOwner) {
                const { data } = await supabase.from("mess").select("*").eq("owner_id", selectedOwner.id);
                setSelectedOwner({ ...selectedOwner, mess: (data as Mess[]) || [] });
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleAdminDeleteMess = async (messId: string) => {
        if (!confirm("Are you sure you want to permanently delete this mess?")) return;
        try {
            await supabase.from("mess").delete().eq("id", messId);
            toast({ title: "Mess Deleted" });
            if (selectedOwner) {
                const { data } = await supabase.from("mess").select("*").eq("owner_id", selectedOwner.id);
                setSelectedOwner({ ...selectedOwner, mess: (data as Mess[]) || [] });
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleAdminVerifyMess = async (messId: string, currentStatus: boolean) => {
        try {
            await supabase.from("mess").update({ is_verified: !currentStatus }).eq("id", messId);
            toast({ title: currentStatus ? "Mess Unverified" : "Mess Verified ✓" });
            if (selectedOwner) {
                const { data } = await supabase.from("mess").select("*").eq("owner_id", selectedOwner.id);
                setSelectedOwner({ ...selectedOwner, mess: (data as Mess[]) || [] });
            }
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const filteredOwners = allOwners.filter(
        (owner) =>
            owner.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
            owner.phone?.toLowerCase().includes(ownerSearch.toLowerCase())
    );

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 flex items-center justify-center min-h-[60vh]">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Loading profile...</p>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    // Determine service type for owners
    const getOwnerServiceType = () => {
        const hasRooms = myRooms.length > 0;
        const hasMess = myMess.length > 0;

        if (hasRooms && hasMess) return "Both Rooms & Mess";
        if (hasRooms) return "Rooms Only";
        if (hasMess) return "Mess Only";
        return "No Listings Yet";
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-6 gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>

                    {/* Page Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="font-heading font-bold text-3xl text-foreground">
                                My Profile
                            </h1>
                            <p className="text-muted-foreground">
                                Manage your account settings and preferences
                            </p>
                        </div>
                        <div className="ml-auto">{getRoleBadge()}</div>
                    </div>

                    {/* Tabs for different sections */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid w-full" style={{ gridTemplateColumns: userRole === "admin" ? "repeat(3, 1fr)" : userRole === "owner" ? "repeat(2, 1fr)" : "1fr" }}>
                            <TabsTrigger value="profile" className="gap-2">
                                <User className="w-4 h-4" />
                                Profile
                            </TabsTrigger>
                            {userRole === "owner" && (
                                <TabsTrigger value="my-listings" className="gap-2">
                                    <Building2 className="w-4 h-4" />
                                    My Listings ({myRooms.length + myMess.length})
                                </TabsTrigger>
                            )}
                            {userRole === "admin" && (
                                <>
                                    <TabsTrigger value="manage-owners" className="gap-2">
                                        <Users className="w-4 h-4" />
                                        Manage Owners ({allOwners.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="admin-actions" className="gap-2">
                                        <Shield className="w-4 h-4" />
                                        Admin Panel
                                    </TabsTrigger>
                                </>
                            )}
                        </TabsList>

                        {/* Profile Tab */}
                        <TabsContent value="profile" className="space-y-6">
                            {/* Personal Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        Personal Information
                                    </CardTitle>
                                    <CardDescription>
                                        Update your personal details below
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="first_name">First Name</Label>
                                            <Input
                                                id="first_name"
                                                value={editProfile.first_name}
                                                onChange={(e) =>
                                                    setEditProfile({ ...editProfile, first_name: e.target.value })
                                                }
                                                placeholder="Enter your first name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last_name">Last Name</Label>
                                            <Input
                                                id="last_name"
                                                value={editProfile.last_name}
                                                onChange={(e) =>
                                                    setEditProfile({ ...editProfile, last_name: e.target.value })
                                                }
                                                placeholder="Enter your last name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                value={editProfile.phone}
                                                onChange={(e) =>
                                                    setEditProfile({ ...editProfile, phone: e.target.value })
                                                }
                                                placeholder="+91 98765 43210"
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="gap-2"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save Changes
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Account Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        Account Information
                                    </CardTitle>
                                    <CardDescription>
                                        Your account details and role
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Email Address</p>
                                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                            Verified
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Account Type</p>
                                                <p className="text-sm text-muted-foreground capitalize">
                                                    {userRole || "User"}
                                                </p>
                                            </div>
                                        </div>
                                        {getRoleBadge()}
                                    </div>

                                    {/* Owner Service Type */}
                                    {userRole === "owner" && (
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <Building2 className="w-5 h-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">Service Type</p>
                                                    <p className="text-sm text-muted-foreground">{getOwnerServiceType()}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline">
                                                {myRooms.length} Rooms, {myMess.length} Mess
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Member Since</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {user?.created_at
                                                        ? new Date(user.created_at).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "long",
                                                            year: "numeric",
                                                        })
                                                        : "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <LayoutDashboard className="w-5 h-5" />
                                        Quick Actions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                        onClick={() => navigate(getDashboardLink())}
                                    >
                                        <LayoutDashboard className="w-5 h-5" />
                                        Go to Dashboard
                                    </Button>

                                    {userRole === "owner" && (
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start gap-3"
                                            onClick={() => navigate("/owner/dashboard")}
                                        >
                                            <Plus className="w-5 h-5" />
                                            Add New Listing
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                        onClick={() => navigate("/rooms")}
                                    >
                                        <Building2 className="w-5 h-5" />
                                        Browse Rooms
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                        onClick={() => navigate("/mess")}
                                    >
                                        <UtensilsCrossed className="w-5 h-5" />
                                        Browse Mess
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Sign Out */}
                            <Card className="border-destructive/50">
                                <CardHeader>
                                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                                    <CardDescription>
                                        Irreversible account actions
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="destructive"
                                        onClick={handleSignOut}
                                        className="gap-2"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Owner's My Listings Tab */}
                        {userRole === "owner" && (
                            <TabsContent value="my-listings" className="space-y-6">
                                {loadingListings ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Rooms Section */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Building2 className="w-5 h-5" />
                                                        My Rooms ({myRooms.length})
                                                    </CardTitle>
                                                    <CardDescription>Manage your room listings</CardDescription>
                                                </div>
                                                <Button onClick={() => navigate("/owner/dashboard")} className="gap-2">
                                                    <Plus className="w-4 h-4" />
                                                    Add Room
                                                </Button>
                                            </CardHeader>
                                            <CardContent>
                                                {myRooms.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                                        <p className="text-muted-foreground">No rooms added yet</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {myRooms.map((room) => (
                                                            <div key={room.id} className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                                                                <img
                                                                    src={room.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200"}
                                                                    alt={room.title}
                                                                    className="w-16 h-16 object-cover rounded-lg"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-semibold truncate">{room.title}</h4>
                                                                        {room.is_verified && (
                                                                            <Badge className="bg-green-500 text-white">Verified</Badge>
                                                                        )}
                                                                        {!room.is_active && (
                                                                            <Badge variant="secondary">Hidden</Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">{room.location}</p>
                                                                    <p className="font-semibold text-primary">₹{room.price?.toLocaleString()}/month</p>
                                                                </div>
                                                                <div className="flex gap-2">
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
                                                                        onClick={() => navigate(`/rooms/${room.id}`)}
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
                                            </CardContent>
                                        </Card>

                                        {/* Mess Section */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <UtensilsCrossed className="w-5 h-5" />
                                                        My Mess ({myMess.length})
                                                    </CardTitle>
                                                    <CardDescription>Manage your mess listings</CardDescription>
                                                </div>
                                                <Button onClick={() => navigate("/owner/dashboard")} className="gap-2">
                                                    <Plus className="w-4 h-4" />
                                                    Add Mess
                                                </Button>
                                            </CardHeader>
                                            <CardContent>
                                                {myMess.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                                        <p className="text-muted-foreground">No mess added yet</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {myMess.map((mess) => (
                                                            <div key={mess.id} className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                                                                <img
                                                                    src={mess.images?.[0] || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200"}
                                                                    alt={mess.name}
                                                                    className="w-16 h-16 object-cover rounded-lg"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-semibold truncate">{mess.name}</h4>
                                                                        {mess.is_verified && (
                                                                            <Badge className="bg-green-500 text-white">Verified</Badge>
                                                                        )}
                                                                        {!mess.is_active && (
                                                                            <Badge variant="secondary">Hidden</Badge>
                                                                        )}
                                                                        <Badge variant="outline">{mess.food_type}</Badge>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">{mess.location}</p>
                                                                    <p className="font-semibold text-primary">₹{mess.price_per_month?.toLocaleString()}/month</p>
                                                                </div>
                                                                <div className="flex gap-2">
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
                                                                        onClick={() => navigate(`/mess/${mess.id}`)}
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
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </TabsContent>
                        )}

                        {/* Admin Manage Owners Tab */}
                        {userRole === "admin" && (
                            <TabsContent value="manage-owners" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Users className="w-5 h-5" />
                                                    All Property Owners
                                                </CardTitle>
                                                <CardDescription>
                                                    View and manage all registered property owners and their listings
                                                </CardDescription>
                                            </div>
                                            <div className="relative w-64">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search owners..."
                                                    value={ownerSearch}
                                                    onChange={(e) => setOwnerSearch(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {loadingOwners ? (
                                            <div className="flex justify-center py-12">
                                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                            </div>
                                        ) : filteredOwners.length === 0 ? (
                                            <div className="text-center py-12">
                                                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                                <p className="text-muted-foreground">No owners found</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {filteredOwners.map((owner) => (
                                                    <div
                                                        key={owner.id}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOwner?.id === owner.id
                                                                ? "border-primary bg-primary/5"
                                                                : "border-transparent bg-muted hover:border-primary/50"
                                                            }`}
                                                        onClick={() => setSelectedOwner(selectedOwner?.id === owner.id ? null : owner)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                                    <User className="w-6 h-6 text-blue-500" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold">{owner.name}</h4>
                                                                    <p className="text-sm text-muted-foreground">{owner.phone || owner.email}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Badge className="gap-1">
                                                                    <Building2 className="w-3 h-3" />
                                                                    {owner.rooms.length} Rooms
                                                                </Badge>
                                                                <Badge variant="outline" className="gap-1">
                                                                    <UtensilsCrossed className="w-3 h-3" />
                                                                    {owner.mess.length} Mess
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        {/* Expanded view when selected */}
                                                        {selectedOwner?.id === owner.id && (
                                                            <div className="mt-6 space-y-4 border-t pt-4">
                                                                {/* Owner's Rooms */}
                                                                <div>
                                                                    <h5 className="font-semibold mb-3 flex items-center gap-2">
                                                                        <Building2 className="w-4 h-4" />
                                                                        Rooms ({owner.rooms.length})
                                                                    </h5>
                                                                    {owner.rooms.length === 0 ? (
                                                                        <p className="text-sm text-muted-foreground">No rooms</p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {owner.rooms.map((room) => (
                                                                                <div key={room.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                                                                    <img
                                                                                        src={room.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=100"}
                                                                                        alt=""
                                                                                        className="w-12 h-12 object-cover rounded"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="font-medium truncate">{room.title}</p>
                                                                                        <p className="text-xs text-muted-foreground">{room.location}</p>
                                                                                    </div>
                                                                                    <p className="text-sm font-semibold text-primary">
                                                                                        ₹{room.price?.toLocaleString()}
                                                                                    </p>
                                                                                    <div className="flex gap-1">
                                                                                        <Button
                                                                                            variant={room.is_verified ? "default" : "outline"}
                                                                                            size="icon"
                                                                                            className="h-8 w-8"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleAdminVerifyRoom(room.id, room.is_verified);
                                                                                            }}
                                                                                        >
                                                                                            {room.is_verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="icon"
                                                                                            className="h-8 w-8"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleAdminToggleRoom(room.id, room.is_active);
                                                                                            }}
                                                                                        >
                                                                                            {room.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="destructive"
                                                                                            size="icon"
                                                                                            className="h-8 w-8"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleAdminDeleteRoom(room.id);
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Owner's Mess */}
                                                                <div>
                                                                    <h5 className="font-semibold mb-3 flex items-center gap-2">
                                                                        <UtensilsCrossed className="w-4 h-4" />
                                                                        Mess ({owner.mess.length})
                                                                    </h5>
                                                                    {owner.mess.length === 0 ? (
                                                                        <p className="text-sm text-muted-foreground">No mess</p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {owner.mess.map((mess) => (
                                                                                <div key={mess.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                                                                    <img
                                                                                        src={mess.images?.[0] || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100"}
                                                                                        alt=""
                                                                                        className="w-12 h-12 object-cover rounded"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="font-medium truncate">{mess.name}</p>
                                                                                        <p className="text-xs text-muted-foreground">{mess.location}</p>
                                                                                    </div>
                                                                                    <p className="text-sm font-semibold text-primary">
                                                                                        ₹{mess.price_per_month?.toLocaleString()}
                                                                                    </p>
                                                                                    <div className="flex gap-1">
                                                                                        <Button
                                                                                            variant={mess.is_verified ? "default" : "outline"}
                                                                                            size="icon"
                                                                                            className="h-8 w-8"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleAdminVerifyMess(mess.id, mess.is_verified);
                                                                                            }}
                                                                                        >
                                                                                            {mess.is_verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="icon"
                                                                                            className="h-8 w-8"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleAdminToggleMess(mess.id, mess.is_active);
                                                                                            }}
                                                                                        >
                                                                                            {mess.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="destructive"
                                                                                            size="icon"
                                                                                            className="h-8 w-8"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleAdminDeleteMess(mess.id);
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}

                        {/* Admin Panel Tab */}
                        {userRole === "admin" && (
                            <TabsContent value="admin-actions" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="w-5 h-5" />
                                            Admin Authority
                                        </CardTitle>
                                        <CardDescription>
                                            Full administrative control over the platform
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <Button
                                                variant="outline"
                                                className="h-auto p-4 flex flex-col items-start gap-2"
                                                onClick={() => navigate("/admin/dashboard")}
                                            >
                                                <div className="flex items-center gap-2 font-semibold">
                                                    <LayoutDashboard className="w-5 h-5" />
                                                    Admin Dashboard
                                                </div>
                                                <p className="text-sm text-muted-foreground text-left">
                                                    Access full admin dashboard with analytics and moderation tools
                                                </p>
                                            </Button>

                                            <Button
                                                variant="outline"
                                                className="h-auto p-4 flex flex-col items-start gap-2"
                                                onClick={() => setActiveTab("manage-owners")}
                                            >
                                                <div className="flex items-center gap-2 font-semibold">
                                                    <Users className="w-5 h-5" />
                                                    Manage Owners
                                                </div>
                                                <p className="text-sm text-muted-foreground text-left">
                                                    View all owners and manage their room & mess listings
                                                </p>
                                            </Button>
                                        </div>

                                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                                            <div className="flex items-center gap-2 text-purple-600 font-semibold mb-2">
                                                <Shield className="w-5 h-5" />
                                                Admin Privileges
                                            </div>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                <li>✓ View all owners and their listings</li>
                                                <li>✓ Verify or unverify any room/mess listing</li>
                                                <li>✓ Hide or show any listing</li>
                                                <li>✓ Delete any room or mess</li>
                                                <li>✓ Manage user roles</li>
                                                <li>✓ Access platform analytics</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ProfilePage;
