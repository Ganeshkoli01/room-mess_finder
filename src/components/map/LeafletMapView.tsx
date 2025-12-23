import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2, Building2, UtensilsCrossed, Locate } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons
const createCustomIcon = (color: string, type: "room" | "mess" | "user") => {
    const svgIcon = type === "user"
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="3"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
           </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="9" r="3" fill="white"/>
           </svg>`;

    return L.divIcon({
        html: svgIcon,
        className: "custom-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
    });
};

const userIcon = createCustomIcon("#14b8a6", "user");
const roomIcon = createCustomIcon("#3b82f6", "room");
const messIcon = createCustomIcon("#f97316", "mess");

interface Listing {
    id: string;
    title: string;
    location: string;
    price: number;
    type: "room" | "mess";
    lat: number;
    lng: number;
    rating: number;
    isVerified: boolean;
}

interface LeafletMapViewProps {
    listings: Listing[];
    height?: string;
    showUserLocation?: boolean;
    onListingClick?: (id: string, type: "room" | "mess") => void;
}

// Component to handle map center updates
const MapUpdater = ({ center, shouldUpdate }: { center: [number, number]; shouldUpdate: boolean }) => {
    const map = useMap();

    useEffect(() => {
        if (shouldUpdate && center) {
            map.setView(center, 13);
        }
    }, [center, shouldUpdate, map]);

    return null;
};

// Component to fit bounds to all markers
const FitBoundsToMarkers = ({
    listings,
    userLocation
}: {
    listings: Listing[];
    userLocation: { lat: number; lng: number } | null;
}) => {
    const map = useMap();
    const hasFitted = useRef(false);

    useEffect(() => {
        if (hasFitted.current || listings.length === 0) return;

        const bounds = L.latLngBounds([]);

        if (userLocation) {
            bounds.extend([userLocation.lat, userLocation.lng]);
        }

        listings.forEach((listing) => {
            bounds.extend([listing.lat, listing.lng]);
        });

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            hasFitted.current = true;
        }
    }, [listings, userLocation, map]);

    return null;
};

// Locate me button component
const LocateControl = ({ onLocate }: { onLocate: () => void }) => {
    return (
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: "80px", marginRight: "10px" }}>
            <div className="leaflet-control">
                <Button
                    size="icon"
                    variant="secondary"
                    className="bg-white shadow-lg hover:bg-gray-100"
                    onClick={onLocate}
                >
                    <Locate className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
};

const LeafletMapView = ({
    listings,
    height = "400px",
    showUserLocation = true,
    onListingClick
}: LeafletMapViewProps) => {
    const { location, loading, requestLocation } = useLocation();
    const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
    const mapRef = useRef<L.Map | null>(null);

    const center: [number, number] = location
        ? [location.latitude, location.longitude]
        : [12.9716, 77.5946]; // Default: Bangalore

    const handleLocateMe = () => {
        if (location && mapRef.current) {
            mapRef.current.setView([location.latitude, location.longitude], 14);
        } else {
            requestLocation();
        }
    };

    // Location not enabled state
    if (!location && !loading) {
        return (
            <div
                className="bg-muted rounded-2xl flex flex-col items-center justify-center gap-4 p-8"
                style={{ height }}
            >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-lg text-foreground">Enable Location</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        Allow location access to see rooms and mess on the map
                    </p>
                </div>
                <Button onClick={requestLocation} className="gap-2">
                    <Navigation className="w-4 h-4" />
                    Enable Location
                </Button>
            </div>
        );
    }

    // Loading location state
    if (loading) {
        return (
            <div
                className="bg-muted rounded-2xl flex flex-col items-center justify-center gap-4"
                style={{ height }}
            >
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground">Detecting your location...</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden shadow-lg relative" style={{ height }}>
            <style>{`
                .custom-marker {
                    background: transparent;
                    border: none;
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    padding: 0;
                }
                .leaflet-popup-content {
                    margin: 0;
                    min-width: 200px;
                }
                .leaflet-popup-tip {
                    background: white;
                }
            `}</style>
            <MapContainer
                center={center}
                zoom={13}
                style={{ width: "100%", height: "100%" }}
                ref={mapRef}
            >
                {/* OpenStreetMap Tiles */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Map Updater */}
                <MapUpdater center={center} shouldUpdate={!!location} />

                {/* Fit bounds to markers */}
                {listings.length > 0 && (
                    <FitBoundsToMarkers
                        listings={listings}
                        userLocation={location ? { lat: location.latitude, lng: location.longitude } : null}
                    />
                )}

                {/* User Location Circle */}
                {showUserLocation && location && (
                    <Circle
                        center={[location.latitude, location.longitude]}
                        radius={500}
                        pathOptions={{
                            fillColor: "#14b8a6",
                            fillOpacity: 0.1,
                            color: "#14b8a6",
                            weight: 2,
                            opacity: 0.3,
                        }}
                    />
                )}

                {/* User Location Marker */}
                {showUserLocation && location && (
                    <Marker
                        position={[location.latitude, location.longitude]}
                        icon={userIcon}
                    >
                        <Popup>
                            <div className="p-2 text-center">
                                <p className="font-semibold text-gray-800">📍 You are here</p>
                                {location.area && (
                                    <p className="text-sm text-gray-600">{location.area}</p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Listing Markers */}
                {listings.map((listing) => (
                    <Marker
                        key={`${listing.type}-${listing.id}`}
                        position={[listing.lat, listing.lng]}
                        icon={listing.type === "room" ? roomIcon : messIcon}
                        eventHandlers={{
                            click: () => setSelectedListing(listing),
                        }}
                    >
                        <Popup>
                            <div className="p-3 min-w-[200px] max-w-[280px]">
                                <div className="flex items-center gap-2 mb-2">
                                    {listing.type === "room" ? (
                                        <Badge className="bg-blue-500 text-white gap-1 text-xs">
                                            <Building2 className="w-3 h-3" />
                                            Room
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-orange-500 text-white gap-1 text-xs">
                                            <UtensilsCrossed className="w-3 h-3" />
                                            Mess
                                        </Badge>
                                    )}
                                    {listing.isVerified && (
                                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                            Verified
                                        </Badge>
                                    )}
                                </div>
                                <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                                    {listing.title}
                                </h4>
                                <p className="text-xs text-gray-600 mb-2">{listing.location}</p>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-yellow-500">★</span>
                                    <span className="text-sm text-gray-700">{listing.rating.toFixed(1)}</span>
                                </div>
                                <p className="font-bold text-blue-600 text-base mb-3">
                                    ₹{listing.price.toLocaleString()}/month
                                </p>
                                <Button
                                    size="sm"
                                    className="w-full text-xs h-8"
                                    onClick={() => onListingClick?.(listing.id, listing.type)}
                                >
                                    View Details
                                </Button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Locate Me Button */}
            <div className="absolute bottom-4 right-4 z-[1000]">
                <Button
                    size="icon"
                    variant="secondary"
                    className="bg-white shadow-lg hover:bg-gray-100 w-10 h-10"
                    onClick={handleLocateMe}
                    title="Locate me"
                >
                    <Locate className="h-5 w-5 text-primary" />
                </Button>
            </div>
        </div>
    );
};

export default LeafletMapView;
