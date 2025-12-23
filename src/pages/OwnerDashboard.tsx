import { useState, useEffect, useRef } from "react";
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
  CheckCircle
} from "lucide-react";
import { createRoom, updateRoom, deleteRoom, getRoomsByOwner, toggleRoomActive, Room } from "@/services/roomService";
import { createMess, updateMess, deleteMess, getMessByOwner, toggleMessActive, Mess } from "@/services/messService";
import { geocodeAddress } from "@/services/placesService";

const OwnerDashboard = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("my-rooms");

  // Data states
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [myMess, setMyMess] = useState<Mess[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMess, setLoadingMess] = useState(false);

  // Form states for Room
  const [roomForm, setRoomForm] = useState({
    title: "",
    description: "",
    location: "",
    address: "",
    city: "",
    price: "",
    room_type: "Single",
    facilities: [] as string[],
    images: [] as string[],
    deposit: "",
    available_from: "",
    preferred_tenants: "",
    rules: "",
  });
  const [roomImages, setRoomImages] = useState<File[]>([]);
  const [roomImagePreviews, setRoomImagePreviews] = useState<string[]>([]);
  const [savingRoom, setSavingRoom] = useState(false);
  const [geocodingRoom, setGeocodingRoom] = useState(false);
  const [roomCoords, setRoomCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Form states for Mess
  const [messForm, setMessForm] = useState({
    name: "",
    description: "",
    location: "",
    address: "",
    city: "",
    price_per_month: "",
    food_type: "both",
    timings: "",
    menu_highlights: "",
    images: [] as string[],
  });
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
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyRooms();
      fetchMyMess();
    }
  }, [user]);

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

  // Geocode room address
  const geocodeRoomAddress = async () => {
    if (!roomForm.address || !roomForm.city) {
      toast({
        title: "Address Required",
        description: "Please enter address and city first",
        variant: "destructive",
      });
      return;
    }

    setGeocodingRoom(true);
    try {
      const fullAddress = `${roomForm.address}, ${roomForm.city}`;
      const result = await geocodeAddress(fullAddress);
      if (result) {
        setRoomCoords({ lat: result.lat, lng: result.lng });
        setRoomForm(prev => ({
          ...prev,
          location: `${result.area || roomForm.city}, ${result.city}`,
        }));
        toast({
          title: "Location Found",
          description: `Coordinates: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
        });
      } else {
        toast({
          title: "Location Not Found",
          description: "Could not find coordinates for this address",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Geocoding Failed",
        description: "Failed to get location coordinates",
        variant: "destructive",
      });
    } finally {
      setGeocodingRoom(false);
    }
  };

  // Geocode mess address
  const geocodeMessAddress = async () => {
    if (!messForm.address || !messForm.city) {
      toast({
        title: "Address Required",
        description: "Please enter address and city first",
        variant: "destructive",
      });
      return;
    }

    setGeocodingMess(true);
    try {
      const fullAddress = `${messForm.address}, ${messForm.city}`;
      const result = await geocodeAddress(fullAddress);
      if (result) {
        setMessCoords({ lat: result.lat, lng: result.lng });
        setMessForm(prev => ({
          ...prev,
          location: `${result.area || messForm.city}, ${result.city}`,
        }));
        toast({
          title: "Location Found",
          description: `Coordinates: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`,
        });
      } else {
        toast({
          title: "Location Not Found",
          description: "Could not find coordinates for this address",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setGeocodingMess(false);
    }
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
      setActiveTab("my-rooms");
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
        menu_highlights: messForm.menu_highlights.split(",").map(s => s.trim()).filter(Boolean),
        images: imageUrls,
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
      });
      setMessImages([]);
      setMessImagePreviews([]);
      setMessCoords(null);

      fetchMyMess();
      setActiveTab("my-mess");
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-8">
              <TabsTrigger value="my-rooms" className="gap-2">
                <Building2 className="w-4 h-4" />
                My Rooms
              </TabsTrigger>
              <TabsTrigger value="my-mess" className="gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                My Mess
              </TabsTrigger>
              <TabsTrigger value="add-room" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Room
              </TabsTrigger>
              <TabsTrigger value="add-mess" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Mess
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
                            {!room.is_active && (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{room.location}</p>
                          <p className="font-semibold text-primary">₹{room.price?.toLocaleString()}/month</p>
                        </div>
                        <div className="flex items-center gap-2">
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
                            {!mess.is_active && (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{mess.location}</p>
                          <p className="font-semibold text-primary">₹{mess.price_per_month?.toLocaleString()}/month</p>
                        </div>
                        <div className="flex items-center gap-2">
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

                  {/* Geocode Button */}
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={geocodeRoomAddress}
                      disabled={geocodingRoom}
                    >
                      {geocodingRoom ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4 mr-2" />
                      )}
                      Get Location Coordinates
                    </Button>
                    {roomCoords && (
                      <span className="text-sm text-success flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Location found!
                      </span>
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
                        onChange={(e) => setMessForm({ ...messForm, food_type: e.target.value })}
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

                  {/* Geocode */}
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={geocodeMessAddress}
                      disabled={geocodingMess}
                    >
                      {geocodingMess ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4 mr-2" />
                      )}
                      Get Location Coordinates
                    </Button>
                    {messCoords && (
                      <span className="text-sm text-success flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Location found!
                      </span>
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
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OwnerDashboard;
