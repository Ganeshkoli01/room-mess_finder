import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SearchBar from "@/components/search/SearchBar";
import RoomCard from "@/components/cards/RoomCard";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Building2, Filter, X, Navigation, MapPin, Loader2, MapPinned, Database } from "lucide-react";
import { getRooms, getRoomsNearLocation, searchRooms, Room } from "@/services/roomService";
import { searchNearbyRooms, RoomPlace } from "@/services/osmPlacesService";
import { cacheRooms } from "@/services/osmCacheService";

const roomTypes = ["Single", "Double", "Shared", "PG", "Hostel", "Hotel"];
const facilitiesList = ["WiFi", "AC", "Parking", "Security", "Power Backup", "Water Supply"];

const RoomListings = () => {
  const [searchParams] = useSearchParams();
  const { location: userLocation, calculateDistance, requestLocation, loading: locationLoading } = useLocation();
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location") || "");

  const [rooms, setRooms] = useState<any[]>([]);
  const [googleRooms, setGoogleRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [showGooglePlaces, setShowGooglePlaces] = useState(true);
  const [dataSource, setDataSource] = useState<"all" | "database" | "google">("all");

  // Auto-request location on page load
  useEffect(() => {
    requestLocation();
  }, []);

  // Fetch rooms from database
  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        let data: Room[];

        if (userLocation) {
          data = await getRoomsNearLocation(
            userLocation.latitude,
            userLocation.longitude,
            50
          );
        } else {
          data = await getRooms();
        }

        if (data.length > 0) {
          const transformedRooms = data.map(room => ({
            id: room.id,
            title: room.title,
            location: room.location,
            price: room.price,
            roomType: room.room_type,
            image: room.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
            rating: room.rating || 0,
            reviews: room.reviews_count || 0,
            facilities: room.facilities || [],
            isVerified: room.is_verified,
            lat: room.latitude,
            lng: room.longitude,
            distance: room.distance,
            isFromGoogle: false,
          }));
          setRooms(transformedRooms);
        } else {
          setRooms([]);
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [userLocation]);

  // Fetch nearby places from OSM
  useEffect(() => {
    const fetchGooglePlaces = async () => {
      if (!userLocation || !showGooglePlaces) {
        setGoogleRooms([]);
        return;
      }

      setLoadingGoogle(true);
      try {
        const places = await searchNearbyRooms(
          userLocation.latitude,
          userLocation.longitude,
          50000 // 50km radius
        );

        // Cache the OSM data for detail pages (100% accuracy)
        cacheRooms(places);

        // Transform to match card props
        const transformedPlaces = places.map(place => ({
          id: place.id,
          title: place.title,
          location: place.location,
          price: place.price,
          roomType: place.roomType,
          image: place.image,
          rating: place.rating,
          reviews: place.reviews,
          facilities: place.facilities,
          isVerified: false,
          lat: place.lat,
          lng: place.lng,
          distance: place.distance,
          isFromGoogle: true,
          isOpen: place.isOpen,
        }));

        setGoogleRooms(transformedPlaces);
      } catch (error) {
        console.error("Error fetching OSM Places:", error);
        setGoogleRooms([]);
      } finally {
        setLoadingGoogle(false);
      }
    };

    fetchGooglePlaces();
  }, [userLocation, showGooglePlaces]);

  const handleRoomTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedRoomTypes([...selectedRoomTypes, type]);
    } else {
      setSelectedRoomTypes(selectedRoomTypes.filter((t) => t !== type));
    }
  };

  const handleFacilityChange = (facility: string, checked: boolean) => {
    if (checked) {
      setSelectedFacilities([...selectedFacilities, facility.toLowerCase()]);
    } else {
      setSelectedFacilities(selectedFacilities.filter((f) => f !== facility.toLowerCase()));
    }
  };

  const clearFilters = () => {
    setPriceRange([0, 20000]);
    setSelectedRoomTypes([]);
    setSelectedFacilities([]);
    setVerifiedOnly(false);
    setLocationFilter("");
  };

  // Combine and filter rooms
  const allRooms = useMemo(() => {
    let combined: any[] = [];

    if (dataSource === "all" || dataSource === "database") {
      combined = [...combined, ...rooms];
    }

    if ((dataSource === "all" || dataSource === "google") && showGooglePlaces) {
      combined = [...combined, ...googleRooms];
    }

    // Filter
    let filtered = combined.filter((room) => {
      if (room.price < priceRange[0] || room.price > priceRange[1]) return false;
      if (selectedRoomTypes.length > 0 && !selectedRoomTypes.includes(room.roomType)) return false;
      if (selectedFacilities.length > 0) {
        const hasAllFacilities = selectedFacilities.every((f) =>
          room.facilities?.some((rf: string) => rf.toLowerCase().includes(f.toLowerCase()))
        );
        if (!hasAllFacilities) return false;
      }
      if (verifiedOnly && !room.isVerified) return false;
      if (locationFilter && !room.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      return true;
    });

    // Sort by distance
    if (userLocation) {
      filtered = filtered.sort((a, b) => {
        const distA = a.distance || calculateDistance(a.lat, a.lng) || Infinity;
        const distB = b.distance || calculateDistance(b.lat, b.lng) || Infinity;
        return distA - distB;
      });
    }

    return filtered;
  }, [rooms, googleRooms, priceRange, selectedRoomTypes, selectedFacilities, verifiedOnly, locationFilter, userLocation, dataSource, showGooglePlaces, calculateDistance]);

  const handleSearch = async (query: string) => {
    setLocationFilter(query);

    if (query) {
      try {
        const results = await searchRooms(query);
        if (results.length > 0) {
          const transformedRooms = results.map(room => ({
            id: room.id,
            title: room.title,
            location: room.location,
            price: room.price,
            roomType: room.room_type,
            image: room.images?.[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
            rating: room.rating || 0,
            reviews: room.reviews_count || 0,
            facilities: room.facilities || [],
            isVerified: room.is_verified,
            lat: room.latitude,
            lng: room.longitude,
            isFromGoogle: false,
          }));
          setRooms(transformedRooms);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }
  };

  const dbCount = rooms.length;
  const googleCount = googleRooms.length;

  const FilterContent = () => (
    <>
      {/* Data Source Toggle */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Data Source</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dataSource"
              checked={dataSource === "all"}
              onChange={() => setDataSource("all")}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm">All Sources</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dataSource"
              checked={dataSource === "database"}
              onChange={() => setDataSource("database")}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm flex items-center gap-1">
              <Database className="w-3 h-3" />
              Our Listings ({dbCount})
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dataSource"
              checked={dataSource === "google"}
              onChange={() => setDataSource("google")}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm flex items-center gap-1">
              <MapPinned className="w-3 h-3" />
              OpenStreetMap ({googleCount})
            </span>
          </label>
        </div>
      </div>

      {/* Room Type */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Room Type</h3>
        <div className="space-y-3">
          {roomTypes.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`room-${type.toLowerCase()}`}
                checked={selectedRoomTypes.includes(type)}
                onCheckedChange={(checked) => handleRoomTypeChange(type, checked as boolean)}
              />
              <Label htmlFor={`room-${type.toLowerCase()}`} className="text-sm cursor-pointer">
                {type}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Price Range</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={20000}
          step={500}
          className="mb-3"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>₹{priceRange[0].toLocaleString()}</span>
          <span>₹{priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      {/* Facilities */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Facilities</h3>
        <div className="space-y-3">
          {facilitiesList.map((facility) => (
            <div key={facility} className="flex items-center gap-2">
              <Checkbox
                id={`facility-${facility.toLowerCase().replace(" ", "-")}`}
                checked={selectedFacilities.includes(facility.toLowerCase())}
                onCheckedChange={(checked) => handleFacilityChange(facility, checked as boolean)}
              />
              <Label htmlFor={`facility-${facility.toLowerCase().replace(" ", "-")}`} className="text-sm cursor-pointer">
                {facility}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Verification */}
      <div>
        <h3 className="font-semibold mb-3">Verification</h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="verified-only"
            checked={verifiedOnly}
            onCheckedChange={(checked) => setVerifiedOnly(checked as boolean)}
          />
          <Label htmlFor="verified-only" className="text-sm cursor-pointer">
            Show verified only
          </Label>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-3xl text-foreground">Find Rooms</h1>
                  <p className="text-muted-foreground">
                    {loading || locationLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {locationLoading ? "Detecting location..." : "Loading rooms..."}
                      </span>
                    ) : userLocation ? (
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Found {allRooms.length} rooms near you
                      </span>
                    ) : (
                      `Found ${allRooms.length} rooms`
                    )}
                  </p>
                </div>
              </div>

              {/* Source Badges */}
              <div className="flex items-center gap-2">
                {dbCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Database className="w-3 h-3" />
                    {dbCount} Listed
                  </Badge>
                )}
                {loadingGoogle ? (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading OSM...
                  </Badge>
                ) : googleCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <MapPinned className="w-3 h-3" />
                    {googleCount} from OSM
                  </Badge>
                )}
              </div>

              {/* Location Badge */}
              {userLocation && (
                <div className="hidden md:flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                  <Navigation className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {userLocation.area || userLocation.city || "Near You"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <SearchBar type="room" onSearch={handleSearch} />
          </div>

          <div className="flex gap-8">
            {/* Filters Sidebar - Desktop */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="bg-card rounded-2xl p-6 shadow-soft sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading font-semibold text-lg">Filters</h2>
                  <Button variant="ghost" size="sm" className="text-primary" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
                <FilterContent />
              </div>
            </aside>

            {/* Mobile Filter Button */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
              <Button onClick={() => setShowFilters(true)} className="shadow-lg gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>

            {/* Mobile Filters Modal */}
            {showFilters && (
              <div className="lg:hidden fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm">
                <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading font-semibold text-xl">Filters</h2>
                    <button onClick={() => setShowFilters(false)}>
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <FilterContent />
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="flex-1" onClick={clearFilters}>
                      Clear All
                    </Button>
                    <Button className="flex-1" onClick={() => setShowFilters(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1">
              {loading && loadingGoogle ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : allRooms.length === 0 ? (
                <div className="text-center py-16">
                  <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-xl text-foreground mb-2">No rooms found</h3>
                  <p className="text-muted-foreground mb-4">
                    {userLocation
                      ? "Try increasing search radius or changing filters"
                      : "Enable location to find rooms near you"}
                  </p>
                  {!userLocation && (
                    <Button onClick={requestLocation} className="gap-2">
                      <Navigation className="w-4 h-4" />
                      Enable Location
                    </Button>
                  )}
                  <Button variant="outline" onClick={clearFilters} className="ml-2">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allRooms.map((room) => {
                      const distance = room.distance || (userLocation ? calculateDistance(room.lat, room.lng) : null);
                      return (
                        <div key={room.id} className="relative">
                          {/* Distance Badge */}
                          {userLocation && distance !== null && (
                            <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-primary" />
                              <span className="text-xs font-medium">{distance.toFixed(1)} km</span>
                            </div>
                          )}
                          {/* Source Badge */}
                          {room.isFromGoogle && (
                            <div className="absolute top-3 right-3 z-10">
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <MapPinned className="w-3 h-3" />
                                OSM
                              </Badge>
                            </div>
                          )}
                          <RoomCard {...room} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Load More */}
                  <div className="mt-10 text-center">
                    <Button variant="outline" size="lg">
                      Load More Rooms
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RoomListings;
