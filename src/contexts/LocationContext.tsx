import { useState, useEffect, createContext, useContext, ReactNode } from "react";

interface Location {
    latitude: number;
    longitude: number;
    city?: string;
    area?: string;
}

interface LocationContextType {
    location: Location | null;
    loading: boolean;
    error: string | null;
    permissionState: PermissionState | null;
    requestLocation: () => void;
    calculateDistance: (lat: number, lng: number) => number | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Haversine formula to calculate distance between two coordinates
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
};

// Reverse geocoding to get city/area from coordinates
const reverseGeocode = async (lat: number, lng: number): Promise<{ city?: string; area?: string }> => {
    try {
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
            {
                signal: controller.signal,
                headers: {
                    "User-Agent": "RoomAndMessFinder/1.0",
                    "Accept": "application/json",
                },
            }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn("Nominatim API error:", response.statusText);
            return {};
        }

        const data = await response.json();
        return {
            city: data.address?.city || data.address?.town || data.address?.village || data.address?.county,
            area: data.address?.suburb || data.address?.neighbourhood || data.address?.locality || data.address?.state_district,
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.warn("Reverse geocoding timed out");
        } else {
            console.warn("Reverse geocoding failed:", error.message || error);
        }
        return {};
    }
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
    const [location, setLocation] = useState<Location | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

    // Check permission status on mount
    useEffect(() => {
        if ("permissions" in navigator) {
            navigator.permissions.query({ name: "geolocation" }).then((result) => {
                setPermissionState(result.state);
                result.addEventListener("change", () => {
                    setPermissionState(result.state);
                });

                // Auto-request if already granted
                if (result.state === "granted") {
                    requestLocation();
                }
            });
        }
    }, []);

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        // Check if we have a cached location first
        const cached = localStorage.getItem("user_location");
        if (cached) {
            try {
                const cachedLocation = JSON.parse(cached);
                const cacheAge = Date.now() - cachedLocation.timestamp;
                // Use cached location if less than 10 minutes old
                if (cacheAge < 600000) {
                    setLocation({
                        latitude: cachedLocation.latitude,
                        longitude: cachedLocation.longitude,
                        city: cachedLocation.city,
                        area: cachedLocation.area,
                    });
                    setPermissionState("granted");
                    // Still request fresh location in background
                    requestFreshLocation();
                    return;
                }
            } catch {
                // Invalid cache, proceed with fresh request
            }
        }

        setLoading(true);
        setError(null);
        requestFreshLocation();
    };

    const requestFreshLocation = () => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const geoData = await reverseGeocode(latitude, longitude);

                const locationData = {
                    latitude,
                    longitude,
                    ...geoData,
                };

                setLocation(locationData);
                setLoading(false);
                setPermissionState("granted");

                // Cache the location
                localStorage.setItem("user_location", JSON.stringify({
                    ...locationData,
                    timestamp: Date.now(),
                }));
            },
            (err) => {
                setError(
                    err.code === 1
                        ? "Location access denied. Please enable location in your browser settings."
                        : "Unable to retrieve your location. Please try again."
                );
                setLoading(false);
                if (err.code === 1) {
                    setPermissionState("denied");
                }
            },
            {
                enableHighAccuracy: false, // Use balanced accuracy for faster response
                timeout: 5000, // Reduced timeout to 5 seconds
                maximumAge: 600000, // 10 minutes cache
            }
        );
    };

    const calculateDistance = (lat: number, lng: number): number | null => {
        if (!location) return null;
        return getDistanceFromLatLonInKm(location.latitude, location.longitude, lat, lng);
    };

    return (
        <LocationContext.Provider
            value={{
                location,
                loading,
                error,
                permissionState,
                requestLocation,
                calculateDistance,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error("useLocation must be used within a LocationProvider");
    }
    return context;
};
