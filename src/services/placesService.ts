// Places Service - Uses Nominatim (OpenStreetMap) for geocoding
// Free alternative to Google Places API

export interface GooglePlace {
    place_id: string;
    name: string;
    address: string;
    location: {
        lat: number;
        lng: number;
    };
    rating?: number;
    user_ratings_total?: number;
    photos?: string[];
    types: string[];
    opening_hours?: {
        open_now: boolean;
    };
    price_level?: number;
}

export interface PlaceDetails extends GooglePlace {
    phone?: string;
    website?: string;
    reviews?: Array<{
        author_name: string;
        rating: number;
        text: string;
        time: number;
    }>;
}

// Geocode an address to get coordinates using Nominatim
export const geocodeAddress = async (
    address: string
): Promise<{ lat: number; lng: number } | null> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
            {
                headers: {
                    "User-Agent": "RoomAndMessFinder/1.0",
                },
            }
        );
        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
            };
        }
        return null;
    } catch (error) {
        console.error("Error geocoding address:", error);
        return null;
    }
};

// Reverse geocode coordinates to get address using Nominatim
export const reverseGeocode = async (
    latitude: number,
    longitude: number
): Promise<{ address: string; city: string; area: string } | null> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`,
            {
                headers: {
                    "User-Agent": "RoomAndMessFinder/1.0",
                },
            }
        );
        const data = await response.json();

        if (data && data.address) {
            return {
                address: data.display_name || "",
                city: data.address.city || data.address.town || data.address.village || "",
                area: data.address.suburb || data.address.neighbourhood || data.address.locality || "",
            };
        }
        return null;
    } catch (error) {
        console.error("Error reverse geocoding:", error);
        return null;
    }
};

// Get photo URL - returns a default image since OSM doesn't have photos
export const getPhotoUrl = (photoReference: string, maxWidth: number = 400): string => {
    // Since Nominatim doesn't have photos, return appropriate default images
    const defaultImages = [
        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    ];
    const index = Math.abs(photoReference.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % defaultImages.length;
    return defaultImages[index];
};

// Search for places using Nominatim
export const searchPlaces = async (
    query: string,
    latitude?: number,
    longitude?: number
): Promise<Array<{ lat: number; lng: number; display_name: string; type: string }>> => {
    try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`;

        // Add viewbox if location is provided to prioritize nearby results
        if (latitude && longitude) {
            const delta = 0.1; // ~10km
            url += `&viewbox=${longitude - delta},${latitude + delta},${longitude + delta},${latitude - delta}&bounded=0`;
        }

        const response = await fetch(url, {
            headers: {
                "User-Agent": "RoomAndMessFinder/1.0",
            },
        });
        const data = await response.json();

        return data.map((item: any) => ({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            display_name: item.display_name,
            type: item.type,
        }));
    } catch (error) {
        console.error("Error searching places:", error);
        return [];
    }
};

// Legacy functions - kept for backward compatibility but using OSM
export const searchNearbyPGs = async (
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000
): Promise<GooglePlace[]> => {
    // This functionality is now in osmPlacesService.ts
    console.log("Using OSM - nearby search moved to osmPlacesService");
    return [];
};

export const searchNearbyMess = async (
    latitude: number,
    longitude: number,
    radiusMeters: number = 3000
): Promise<GooglePlace[]> => {
    // This functionality is now in osmPlacesService.ts
    console.log("Using OSM - nearby search moved to osmPlacesService");
    return [];
};

export const getPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    // Nominatim doesn't have detailed place info like Google
    console.log("Place details not available with Nominatim");
    return null;
};
