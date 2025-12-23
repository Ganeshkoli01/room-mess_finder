import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SearchBar from "@/components/search/SearchBar";
import MessCard from "@/components/cards/MessCard";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Filter, X, Leaf, Flame, Navigation, MapPin, Loader2, MapPinned, Database } from "lucide-react";
import { getAllMess, getMessNearLocation, searchMess, Mess } from "@/services/messService";
import { searchNearbyMess, MessPlace } from "@/services/osmPlacesService";
import { cacheMess } from "@/services/osmCacheService";

type FoodType = "veg" | "non-veg" | "both";

const MessListings = () => {
  const [searchParams] = useSearchParams();
  const { location: userLocation, calculateDistance, requestLocation, loading: locationLoading } = useLocation();
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 6000]);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<FoodType[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location") || "");

  const [messList, setMessList] = useState<any[]>([]);
  const [googleMess, setGoogleMess] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [showGooglePlaces, setShowGooglePlaces] = useState(true);
  const [dataSource, setDataSource] = useState<"all" | "database" | "google">("all");

  // Auto-request location on page load
  useEffect(() => {
    requestLocation();
  }, []);

  // Fetch mess from database
  useEffect(() => {
    const fetchMess = async () => {
      setLoading(true);
      try {
        let data: Mess[];

        if (userLocation) {
          data = await getMessNearLocation(
            userLocation.latitude,
            userLocation.longitude,
            50
          );
        } else {
          data = await getAllMess();
        }

        if (data.length > 0) {
          const transformedMess = data.map(mess => ({
            id: mess.id,
            name: mess.name,
            location: mess.location,
            pricePerMonth: mess.price_per_month,
            foodType: mess.food_type,
            image: mess.images?.[0] || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
            rating: mess.rating || 0,
            reviews: mess.reviews_count || 0,
            timings: mess.timings || "",
            menuHighlights: mess.menu_highlights || [],
            isVerified: mess.is_verified,
            lat: mess.latitude,
            lng: mess.longitude,
            distance: mess.distance,
            isFromGoogle: false,
          }));
          setMessList(transformedMess);
        } else {
          setMessList([]);
        }
      } catch (error) {
        console.error("Error fetching mess:", error);
        setMessList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMess();
  }, [userLocation]);

  // Fetch nearby places from OSM
  useEffect(() => {
    const fetchGooglePlaces = async () => {
      if (!userLocation || !showGooglePlaces) {
        setGoogleMess([]);
        return;
      }

      setLoadingGoogle(true);
      try {
        const places = await searchNearbyMess(
          userLocation.latitude,
          userLocation.longitude,
          50000 // 50km radius
        );

        // Cache the OSM data for detail pages (100% accuracy)
        cacheMess(places);

        // Transform to match card props
        const transformedPlaces = places.map(place => ({
          id: place.id,
          name: place.name,
          location: place.location,
          pricePerMonth: place.pricePerMonth,
          foodType: place.foodType,
          image: place.image,
          rating: place.rating,
          reviews: place.reviews,
          timings: place.timings,
          menuHighlights: place.menuHighlights,
          isVerified: false,
          lat: place.lat,
          lng: place.lng,
          distance: place.distance,
          isFromGoogle: true,
          isOpen: place.isOpen,
        }));

        setGoogleMess(transformedPlaces);
      } catch (error) {
        console.error("Error fetching OSM Places:", error);
        setGoogleMess([]);
      } finally {
        setLoadingGoogle(false);
      }
    };

    fetchGooglePlaces();
  }, [userLocation, showGooglePlaces]);

  const handleFoodTypeChange = (type: FoodType, checked: boolean) => {
    if (checked) {
      setSelectedFoodTypes([...selectedFoodTypes, type]);
    } else {
      setSelectedFoodTypes(selectedFoodTypes.filter((t) => t !== type));
    }
  };

  const clearFilters = () => {
    setPriceRange([0, 6000]);
    setSelectedFoodTypes([]);
    setVerifiedOnly(false);
    setLocationFilter("");
  };

  // Combine and filter mess
  const allMess = useMemo(() => {
    let combined: any[] = [];

    if (dataSource === "all" || dataSource === "database") {
      combined = [...combined, ...messList];
    }

    if ((dataSource === "all" || dataSource === "google") && showGooglePlaces) {
      combined = [...combined, ...googleMess];
    }

    // Filter
    let filtered = combined.filter((mess) => {
      if (mess.pricePerMonth < priceRange[0] || mess.pricePerMonth > priceRange[1]) return false;
      if (selectedFoodTypes.length > 0 && !selectedFoodTypes.includes(mess.foodType)) return false;
      if (verifiedOnly && !mess.isVerified) return false;
      if (locationFilter && !mess.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
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
  }, [messList, googleMess, priceRange, selectedFoodTypes, verifiedOnly, locationFilter, userLocation, dataSource, showGooglePlaces, calculateDistance]);

  const handleSearch = async (query: string) => {
    setLocationFilter(query);

    if (query) {
      try {
        const results = await searchMess(query);
        if (results.length > 0) {
          const transformedMess = results.map(mess => ({
            id: mess.id,
            name: mess.name,
            location: mess.location,
            pricePerMonth: mess.price_per_month,
            foodType: mess.food_type,
            image: mess.images?.[0] || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
            rating: mess.rating || 0,
            reviews: mess.reviews_count || 0,
            timings: mess.timings || "",
            menuHighlights: mess.menu_highlights || [],
            isVerified: mess.is_verified,
            lat: mess.latitude,
            lng: mess.longitude,
            isFromGoogle: false,
          }));
          setMessList(transformedMess);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }
  };

  const dbCount = messList.length;
  const googleCount = googleMess.length;

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

      {/* Food Type */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Food Type</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="veg"
              checked={selectedFoodTypes.includes("veg")}
              onCheckedChange={(checked) => handleFoodTypeChange("veg", checked as boolean)}
            />
            <Label htmlFor="veg" className="text-sm cursor-pointer flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-success" />
              Pure Vegetarian
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="non-veg"
              checked={selectedFoodTypes.includes("non-veg")}
              onCheckedChange={(checked) => handleFoodTypeChange("non-veg", checked as boolean)}
            />
            <Label htmlFor="non-veg" className="text-sm cursor-pointer flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-destructive" />
              Non-Vegetarian
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="both"
              checked={selectedFoodTypes.includes("both")}
              onCheckedChange={(checked) => handleFoodTypeChange("both", checked as boolean)}
            />
            <Label htmlFor="both" className="text-sm cursor-pointer flex items-center gap-1.5">
              <span className="flex">
                <Leaf className="w-3.5 h-3.5 text-success" />
                <Flame className="w-3.5 h-3.5 text-destructive" />
              </span>
              Both Options
            </Label>
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Monthly Budget</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={6000}
          step={200}
          className="mb-3"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>₹{priceRange[0].toLocaleString()}</span>
          <span>₹{priceRange[1].toLocaleString()}</span>
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
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-3xl text-foreground">Find Mess</h1>
                  <p className="text-muted-foreground">
                    {loading || locationLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {locationLoading ? "Detecting location..." : "Loading mess..."}
                      </span>
                    ) : userLocation ? (
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Found {allMess.length} mess options near you
                      </span>
                    ) : (
                      `Found ${allMess.length} mess options`
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
            <SearchBar type="mess" onSearch={handleSearch} />
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
              ) : allMess.length === 0 ? (
                <div className="text-center py-16">
                  <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-xl text-foreground mb-2">No mess found</h3>
                  <p className="text-muted-foreground mb-4">
                    {userLocation
                      ? "Try increasing search radius or changing filters"
                      : "Enable location to find mess near you"}
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
                    {allMess.map((mess) => {
                      const distance = mess.distance || (userLocation ? calculateDistance(mess.lat, mess.lng) : null);
                      return (
                        <div key={mess.id} className="relative">
                          {/* Distance Badge */}
                          {userLocation && distance !== null && (
                            <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-primary" />
                              <span className="text-xs font-medium">{distance.toFixed(1)} km</span>
                            </div>
                          )}
                          {/* Source Badge */}
                          {mess.isFromGoogle && (
                            <div className="absolute top-3 right-3 z-10">
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <MapPinned className="w-3 h-3" />
                                OSM
                              </Badge>
                            </div>
                          )}
                          {/* Open Badge */}
                          {mess.isOpen !== undefined && (
                            <div className="absolute top-12 right-3 z-10">
                              <Badge variant={mess.isOpen ? "default" : "outline"} className="text-xs">
                                {mess.isOpen ? "Open" : "Closed"}
                              </Badge>
                            </div>
                          )}
                          <MessCard {...mess} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Load More */}
                  <div className="mt-10 text-center">
                    <Button variant="outline" size="lg">
                      Load More Mess
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

export default MessListings;
