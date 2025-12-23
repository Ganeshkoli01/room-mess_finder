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
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  User,
  X,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
}

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
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
  const [saving, setSaving] = useState(false);

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
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAllRooms();
      fetchAllMess();
      fetchAllUsers();
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

  // Fetch all users (profiles + user_roles)
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all user roles first
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: false });

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone, created_at");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Combine data - start with profiles and add roles
      const usersMap = new Map<string, UserItem>();

      // Add users from profiles
      (profilesData || []).forEach(profile => {
        if (profile.user_id) {
          usersMap.set(profile.user_id, {
            id: profile.user_id,
            email: profile.phone || profile.user_id?.substring(0, 8) + "...",
            full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "User",
            role: "user",
            created_at: profile.created_at,
          });
        }
      });

      // Add/update users from roles (this ensures users with roles but no profile are included)
      (rolesData || []).forEach(roleEntry => {
        if (roleEntry.user_id) {
          const existingUser = usersMap.get(roleEntry.user_id);
          if (existingUser) {
            // Update role for existing user
            existingUser.role = roleEntry.role;
          } else {
            // Add user that has role but no profile
            usersMap.set(roleEntry.user_id, {
              id: roleEntry.user_id,
              email: roleEntry.user_id?.substring(0, 12) + "...",
              full_name: "User (No Profile)",
              role: roleEntry.role,
              created_at: roleEntry.created_at,
            });
          }
        }
      });

      // Convert map to array and sort by role priority (admin first, then owner, then user)
      const usersWithRoles = Array.from(usersMap.values()).sort((a, b) => {
        const rolePriority: Record<string, number> = { admin: 0, owner: 1, user: 2 };
        return (rolePriority[a.role] ?? 2) - (rolePriority[b.role] ?? 2);
      });

      setAllUsers(usersWithRoles);
      setStats(prev => ({
        ...prev,
        totalUsers: usersWithRoles.length,
        totalOwners: usersWithRoles.filter(u => u.role === "owner").length,
      }));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Toggle room verification
  const toggleRoomVerification = async (roomId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_verified: !currentStatus })
        .eq("id", roomId);

      if (error) throw error;

      toast({ title: currentStatus ? "Room Unverified" : "Room Verified ✓" });
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
          menu_highlights: editingMess.menu_highlights,
          is_active: editingMess.is_active,
          is_verified: editingMess.is_verified,
        })
        .eq("id", editingMess.id);

      if (error) throw error;

      toast({ title: "Mess Updated Successfully ✓" });
      setEditingMess(null);
      fetchAllMess();
    } catch (error) {
      toast({ title: "Error saving mess", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Change user role
  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      // First try to update existing role
      const { error: updateError } = await supabase
        .from("user_roles")
        .update({ role: newRole as "user" | "owner" | "admin" })
        .eq("user_id", userId);

      // If no row was updated, insert new role
      if (updateError) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: newRole as "user" | "owner" | "admin" });

        if (insertError) throw insertError;
      }

      toast({ title: `User role changed to ${newRole}` });
      fetchAllUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast({ title: "Error changing role", variant: "destructive" });
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
            <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-8">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="rooms" className="gap-2">
                <Building2 className="w-4 h-4" />
                All Rooms ({stats.totalRooms})
              </TabsTrigger>
              <TabsTrigger value="mess" className="gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                All Mess ({stats.totalMess})
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Users ({stats.totalUsers})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-card rounded-2xl p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <Building2 className="w-8 h-8 text-primary" />
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-3xl font-bold">{stats.totalRooms}</p>
                  <p className="text-muted-foreground">Total Rooms</p>
                  <p className="text-sm text-success mt-2">{stats.verifiedRooms} verified</p>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <UtensilsCrossed className="w-8 h-8 text-accent" />
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-3xl font-bold">{stats.totalMess}</p>
                  <p className="text-muted-foreground">Total Mess</p>
                  <p className="text-sm text-success mt-2">{stats.verifiedMess} verified</p>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  <p className="text-muted-foreground">Total Users</p>
                  <p className="text-sm text-muted-foreground mt-2">{stats.totalOwners} owners</p>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <p className="text-3xl font-bold">{stats.activeRooms + stats.activeMess}</p>
                  <p className="text-muted-foreground">Active Listings</p>
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
              </div>
            </TabsContent>

            {/* All Mess Tab */}
            <TabsContent value="mess">
              <div className="bg–card rounded-2xl p-6 shadow-soft">
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
                          <th className="text-left py-3 px-4 font-semibold">Joined</th>
                          <th className="text-right py-3 px-4 font-semibold">Change Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((userData) => (
                          <tr key={userData.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="font-semibold text-primary">
                                    {userData.full_name?.charAt(0) || userData.email?.charAt(0) || "U"}
                                  </span>
                                </div>
                                <span className="font-medium">{userData.full_name || "N/A"}</span>
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
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(userData.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <select
                                value={userData.role || "user"}
                                onChange={(e) => changeUserRole(userData.id, e.target.value)}
                                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                              >
                                <option value="user">User</option>
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                              </select>
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

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMess.is_verified}
                    onChange={(e) => setEditingMess({ ...editingMess, is_verified: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMess.is_active}
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

      <Footer />
    </div>
  );
};

export default AdminDashboard;
