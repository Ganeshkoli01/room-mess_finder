// OpenStreetMap + Nominatim Places Service
// Free alternative to Google Places API
// Uses Overpass API for nearby search and Nominatim for geocoding
import { getPremiumImagesForListing, getSmartImagesForListing } from "./imageService";
import { extractContactFromOSMTags, ContactInfo } from "./contactService";

// Contact information interface for real owner/business details
export interface PlaceContactInfo {
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    ownerName?: string;
    operatorName?: string;
    hasContact: boolean;
}

export interface NearbyPlace {
    id: string;
    place_id: string;
    name: string;
    location: string;
    address: string;
    lat: number;
    lng: number;
    rating: number;
    reviews: number;
    price_level?: number;
    isOpen?: boolean;
    image: string;
    photos: string[];
    types: string[];
    isFromGoogle: boolean;
    // Real contact information from OSM
    contact?: PlaceContactInfo;
}

export interface RoomPlace extends NearbyPlace {
    title: string;
    price: number;
    roomType: string;
    facilities: string[];
    isVerified: boolean;
    distance?: number;
}

export interface MessPlace extends NearbyPlace {
    pricePerMonth: number;
    foodType: "veg" | "non-veg" | "both";
    timings: string;
    menuHighlights: string[];
    isVerified: boolean;
    distance?: number;
}

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Default images for places without photos
const defaultRoomImages = [
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800",
];

const defaultMessImages = [
    "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
];

// Overpass API query to find nearby hostels/PGs/hotels - EXPANDED search
const buildRoomQuery = (lat: number, lng: number, radiusMeters: number): string => {
    return `
        [out:json][timeout:60];
        (
            // Tourism accommodations
            node["tourism"="hostel"](around:${radiusMeters},${lat},${lng});
            node["tourism"="guest_house"](around:${radiusMeters},${lat},${lng});
            node["tourism"="hotel"](around:${radiusMeters},${lat},${lng});
            node["tourism"="motel"](around:${radiusMeters},${lat},${lng});
            node["tourism"="apartment"](around:${radiusMeters},${lat},${lng});
            node["tourism"="chalet"](around:${radiusMeters},${lat},${lng});
            
            // Building types for accommodation
            node["building"="dormitory"](around:${radiusMeters},${lat},${lng});
            node["building"="hotel"](around:${radiusMeters},${lat},${lng});
            node["building"="apartments"](around:${radiusMeters},${lat},${lng});
            
            // Amenities
            node["amenity"="dormitory"](around:${radiusMeters},${lat},${lng});
            node["amenity"="shelter"](around:${radiusMeters},${lat},${lng});
            
            // Lodging places
            node["lodging"](around:${radiusMeters},${lat},${lng});
            
            // Way elements (buildings/areas)
            way["tourism"="hostel"](around:${radiusMeters},${lat},${lng});
            way["tourism"="guest_house"](around:${radiusMeters},${lat},${lng});
            way["tourism"="hotel"](around:${radiusMeters},${lat},${lng});
            way["tourism"="motel"](around:${radiusMeters},${lat},${lng});
            way["tourism"="apartment"](around:${radiusMeters},${lat},${lng});
            way["building"="hotel"](around:${radiusMeters},${lat},${lng});
            way["building"="dormitory"](around:${radiusMeters},${lat},${lng});
            way["building"="apartments"](around:${radiusMeters},${lat},${lng});
            
            // Relations
            relation["tourism"="hotel"](around:${radiusMeters},${lat},${lng});
            relation["tourism"="hostel"](around:${radiusMeters},${lat},${lng});
        );
        out body center;
    `;
};

// Overpass API query to find nearby restaurants/mess - EXPANDED search
const buildMessQuery = (lat: number, lng: number, radiusMeters: number): string => {
    return `
        [out:json][timeout:60];
        (
            // Restaurants and eating places
            node["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
            node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
            node["amenity"="fast_food"](around:${radiusMeters},${lat},${lng});
            node["amenity"="food_court"](around:${radiusMeters},${lat},${lng});
            node["amenity"="canteen"](around:${radiusMeters},${lat},${lng});
            node["amenity"="pub"](around:${radiusMeters},${lat},${lng});
            node["amenity"="bar"](around:${radiusMeters},${lat},${lng});
            node["amenity"="biergarten"](around:${radiusMeters},${lat},${lng});
            node["amenity"="ice_cream"](around:${radiusMeters},${lat},${lng});
            
            // Shops with food
            node["shop"="deli"](around:${radiusMeters},${lat},${lng});
            node["shop"="bakery"](around:${radiusMeters},${lat},${lng});
            node["shop"="confectionery"](around:${radiusMeters},${lat},${lng});
            
            // Way elements
            way["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
            way["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
            way["amenity"="fast_food"](around:${radiusMeters},${lat},${lng});
            way["amenity"="food_court"](around:${radiusMeters},${lat},${lng});
            way["amenity"="canteen"](around:${radiusMeters},${lat},${lng});
        );
        out body center;
    `;
};

// Cache for OSM results to avoid repeated slow requests
const osmRoomCache: Map<string, { data: RoomPlace[]; timestamp: number }> = new Map();
const OSM_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Multiple Overpass API endpoints (fallback servers)
const OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// Track which server to use (rotates on failure)
let currentServerIndex = 0;
let lastServerRotation = 0;

// Fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = 15000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
};

// Fetch from Overpass API with fallback servers and retry logic
const fetchOverpassWithFallback = async (query: string): Promise<Response | null> => {
    const maxRetries = OVERPASS_SERVERS.length;
    let lastError: Error | null = null;

    for (let retry = 0; retry < maxRetries; retry++) {
        const serverUrl = OVERPASS_SERVERS[(currentServerIndex + retry) % OVERPASS_SERVERS.length];

        try {
            console.log(`🌐 Trying Overpass server: ${serverUrl}`);

            const response = await fetchWithTimeout(
                serverUrl,
                {
                    method: "POST",
                    body: query,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                },
                25000 // 25 second timeout
            );

            // If rate limited (429), try next server
            if (response.status === 429) {
                console.warn(`⚠️ Server ${serverUrl} rate limited (429), trying next...`);
                // Rotate to next server for future requests
                if (Date.now() - lastServerRotation > 60000) { // Rotate at most once per minute
                    currentServerIndex = (currentServerIndex + 1) % OVERPASS_SERVERS.length;
                    lastServerRotation = Date.now();
                }
                continue;
            }

            if (!response.ok) {
                console.warn(`⚠️ Server ${serverUrl} returned ${response.status}, trying next...`);
                continue;
            }

            return response;
        } catch (error: any) {
            console.warn(`❌ Server ${serverUrl} failed: ${error.message}`);
            lastError = error;
        }
    }

    console.error("All Overpass servers failed", lastError);
    return null;
};

// Search for nearby rooms using Overpass API
export const searchNearbyRooms = async (
    latitude: number,
    longitude: number,
    radiusMeters: number = 50000 // Default 50km radius
): Promise<RoomPlace[]> => {
    const cacheKey = `${latitude.toFixed(2)}-${longitude.toFixed(2)}-${radiusMeters}`;

    // Check cache first
    const cached = osmRoomCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < OSM_CACHE_DURATION) {
        console.log(`🚀 Using cached OSM room data (${cached.data.length} rooms)`);
        return cached.data;
    }

    try {
        console.log(`🔍 Searching for rooms within ${radiusMeters / 1000}km of (${latitude}, ${longitude})`);

        const query = buildRoomQuery(latitude, longitude, radiusMeters);

        // Use fallback servers with retry logic
        const response = await fetchOverpassWithFallback(query);

        if (!response) {
            console.error("All Overpass servers failed");
            return cached?.data || [];
        }

        const data = await response.json();
        const elements = data.elements || [];

        console.log(`📍 Found ${elements.length} raw elements from OSM`);

        const rooms: RoomPlace[] = elements
            .filter((el: any) => el.tags?.name) // Only include places with names
            .map((el: any, index: number) => {
                const placeLat = el.lat || el.center?.lat || latitude;
                const placeLng = el.lon || el.center?.lon || longitude;
                const distance = calculateDistance(latitude, longitude, placeLat, placeLng);

                // Determine room type from tags
                let roomType = "PG";
                const tourism = el.tags?.tourism || "";
                const amenity = el.tags?.amenity || "";
                const building = el.tags?.building || "";
                const name = (el.tags?.name || "").toLowerCase();

                if (tourism === "hostel" || building === "dormitory" || amenity === "dormitory" || name.includes("hostel")) {
                    roomType = "Hostel";
                } else if (tourism === "hotel" || tourism === "motel" || building === "hotel" || name.includes("hotel")) {
                    roomType = "Hotel";
                } else if (tourism === "guest_house" || name.includes("guest house") || name.includes("lodge")) {
                    roomType = "Guest House";
                } else if (tourism === "apartment" || building === "apartments" || name.includes("apartment")) {
                    roomType = "Apartment";
                } else if (name.includes("pg") || name.includes("paying guest")) {
                    roomType = "PG";
                }

                // Generate estimated price based on type
                const priceMultiplier: Record<string, number> = {
                    Hostel: 1,
                    PG: 1.2,
                    "Guest House": 1.5,
                    Apartment: 1.8,
                    Hotel: 2,
                };
                const basePrice = 3000;
                const estimatedPrice = Math.round(
                    basePrice * (priceMultiplier[roomType] || 1) + (Math.random() * 1000)
                );

                // Get address from tags
                const address = [
                    el.tags?.["addr:street"],
                    el.tags?.["addr:city"] || el.tags?.["addr:suburb"],
                    el.tags?.["addr:district"],
                    el.tags?.["addr:postcode"],
                ]
                    .filter(Boolean)
                    .join(", ") || el.tags?.["addr:full"] || `${distance.toFixed(1)} km away`;

                // Generate 5 relevant images for this listing
                const { images: listingImages } = getPremiumImagesForListing({
                    type: 'room',
                    name: el.tags?.name || '',
                    location: address,
                    roomType: roomType,
                    city: el.tags?.["addr:city"] || '',
                });

                // Extract REAL contact information from OSM tags
                const contactInfo = extractContactFromOSMTags(el.tags);

                return {
                    id: `osm-room-${el.id}`,
                    place_id: `osm-${el.id}`,
                    name: el.tags?.name || "Unknown Place",
                    title: el.tags?.name || "Unknown Place",
                    location: address,
                    address: address,
                    lat: placeLat,
                    lng: placeLng,
                    rating: parseFloat(el.tags?.stars || "0") || (3.5 + Math.random() * 1.5), // 3.5-5 if not available
                    reviews: Math.floor(Math.random() * 80) + 10,
                    price: estimatedPrice,
                    roomType,
                    facilities: extractFacilities(el.tags),
                    isOpen: true,
                    image: listingImages[0],
                    photos: listingImages, // Now 5 unique relevant images
                    types: [tourism, amenity, building].filter(Boolean),
                    isFromGoogle: false,
                    isVerified: contactInfo.hasContact, // Verified if has real contact info
                    distance,
                    // Real contact information from OSM
                    contact: contactInfo,
                };
            });

        console.log(`✅ Processed ${rooms.length} rooms with names`);

        // Sort by distance
        rooms.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        // Cache the results
        osmRoomCache.set(cacheKey, { data: rooms, timestamp: Date.now() });

        return rooms;
    } catch (error: any) {
        console.error("Error searching nearby rooms:", error.message || error);
        // Return cached data if available, otherwise empty array
        return cached?.data || [];
    }
};

// Cache for OSM mess results
const osmMessCache: Map<string, { data: MessPlace[]; timestamp: number }> = new Map();

// Search for nearby mess/restaurants using Overpass API
export const searchNearbyMess = async (
    latitude: number,
    longitude: number,
    radiusMeters: number = 50000 // Default 50km radius
): Promise<MessPlace[]> => {
    const cacheKey = `mess-${latitude.toFixed(2)}-${longitude.toFixed(2)}-${radiusMeters}`;

    // Check cache first
    const cached = osmMessCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < OSM_CACHE_DURATION) {
        console.log(`🚀 Using cached OSM mess data (${cached.data.length} mess)`);
        return cached.data;
    }

    try {
        console.log(`🔍 Searching for mess/restaurants within ${radiusMeters / 1000}km of (${latitude}, ${longitude})`);

        const query = buildMessQuery(latitude, longitude, radiusMeters);

        // Use fallback servers with retry logic
        const response = await fetchOverpassWithFallback(query);

        if (!response) {
            console.error("All Overpass servers failed");
            return cached?.data || [];
        }

        const data = await response.json();
        const elements = data.elements || [];

        console.log(`📍 Found ${elements.length} raw elements from OSM`);

        const messPlaces: MessPlace[] = elements
            .filter((el: any) => el.tags?.name) // Only include places with names
            .map((el: any, index: number) => {
                const placeLat = el.lat || el.center?.lat || latitude;
                const placeLng = el.lon || el.center?.lon || longitude;
                const distance = calculateDistance(latitude, longitude, placeLat, placeLng);

                // Determine food type
                let foodType: "veg" | "non-veg" | "both" = "both";
                const cuisine = (el.tags?.cuisine || "").toLowerCase();
                const name = (el.tags?.name || "").toLowerCase();
                const diet = el.tags?.["diet:vegetarian"];

                if (
                    diet === "only" ||
                    cuisine.includes("vegetarian") ||
                    name.includes("veg") && !name.includes("non") ||
                    cuisine.includes("indian_vegetarian")
                ) {
                    foodType = "veg";
                } else if (
                    cuisine.includes("chicken") ||
                    cuisine.includes("meat") ||
                    cuisine.includes("non-veg") ||
                    name.includes("non-veg") ||
                    cuisine.includes("seafood")
                ) {
                    foodType = "non-veg";
                }

                // Estimate price based on type
                const amenity = el.tags?.amenity || "";
                let basePrice = 2500;
                if (amenity === "fast_food") basePrice = 1500;
                else if (amenity === "cafe") basePrice = 2000;
                else if (amenity === "restaurant") basePrice = 3000;

                const estimatedPrice = basePrice + Math.floor(Math.random() * 1500);

                // Get address
                const address = [
                    el.tags?.["addr:street"],
                    el.tags?.["addr:city"] || el.tags?.["addr:suburb"],
                    el.tags?.["addr:district"],
                    el.tags?.["addr:postcode"],
                ]
                    .filter(Boolean)
                    .join(", ") || el.tags?.["addr:full"] || `${distance.toFixed(1)} km away`;

                // Extract menu highlights from cuisine
                const menuHighlights = extractMenuHighlights(el.tags);

                // Generate 5 relevant images for this mess listing
                const { images: messImages } = getPremiumImagesForListing({
                    type: 'mess',
                    name: el.tags?.name || '',
                    location: address,
                    foodType: foodType,
                    city: el.tags?.["addr:city"] || '',
                });

                // Extract REAL contact information from OSM tags
                const contactInfo = extractContactFromOSMTags(el.tags);

                return {
                    id: `osm-mess-${el.id}`,
                    place_id: `osm-${el.id}`,
                    name: el.tags?.name || "Unknown Restaurant",
                    location: address,
                    address: address,
                    lat: placeLat,
                    lng: placeLng,
                    rating: 3.5 + Math.random() * 1.5, // 3.5-5
                    reviews: Math.floor(Math.random() * 150) + 20,
                    pricePerMonth: estimatedPrice,
                    foodType,
                    timings: el.tags?.opening_hours || "Check timings",
                    menuHighlights,
                    isOpen: true,
                    image: messImages[0],
                    photos: messImages, // Now 5 unique relevant images
                    types: [el.tags?.amenity, el.tags?.cuisine].filter(Boolean),
                    isFromGoogle: false,
                    isVerified: contactInfo.hasContact, // Verified if has real contact info
                    distance,
                    // Real contact information from OSM
                    contact: contactInfo,
                };
            });

        console.log(`✅ Processed ${messPlaces.length} mess/restaurants with names`);

        // Sort by distance
        messPlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        // Cache the results
        osmMessCache.set(cacheKey, { data: messPlaces, timestamp: Date.now() });

        return messPlaces;
    } catch (error: any) {
        console.error("Error searching nearby mess:", error.message || error);
        return cached?.data || [];
    }
};

// Extract facilities from OSM tags
const extractFacilities = (tags: any): string[] => {
    const facilities: string[] = [];

    if (tags?.internet_access === "wlan" || tags?.internet_access === "yes" || tags?.wifi === "yes") {
        facilities.push("WiFi");
    }
    if (tags?.air_conditioning === "yes" || tags?.["air_conditioning"] === "yes") {
        facilities.push("AC");
    }
    if (tags?.parking === "yes" || tags?.["parking"]) {
        facilities.push("Parking");
    }
    if (tags?.breakfast === "yes") {
        facilities.push("Breakfast");
    }
    if (tags?.wheelchair === "yes") {
        facilities.push("Wheelchair Access");
    }
    if (tags?.["smoking"] === "no") {
        facilities.push("Non-Smoking");
    }
    if (tags?.["pool"] === "yes" || tags?.swimming_pool === "yes") {
        facilities.push("Pool");
    }
    if (tags?.["gym"] === "yes" || tags?.fitness_centre === "yes") {
        facilities.push("Gym");
    }
    if (tags?.["restaurant"] === "yes") {
        facilities.push("Restaurant");
    }
    if (tags?.["room_service"] === "yes") {
        facilities.push("Room Service");
    }
    if (tags?.["laundry"] === "yes") {
        facilities.push("Laundry");
    }
    if (tags?.["24_hour_front_desk"] === "yes") {
        facilities.push("24/7 Reception");
    }

    // Add default facilities if none found
    if (facilities.length === 0) {
        facilities.push("Basic Amenities");
    }

    return facilities;
};

// Extract menu highlights from OSM tags
const extractMenuHighlights = (tags: any): string[] => {
    const highlights: string[] = [];
    const cuisine = (tags?.cuisine || "").toLowerCase();
    const amenity = tags?.amenity || "";

    if (cuisine.includes("indian")) highlights.push("Indian");
    if (cuisine.includes("chinese")) highlights.push("Chinese");
    if (cuisine.includes("pizza")) highlights.push("Pizza");
    if (cuisine.includes("burger")) highlights.push("Burgers");
    if (cuisine.includes("south_indian")) highlights.push("South Indian");
    if (cuisine.includes("north_indian")) highlights.push("North Indian");
    if (cuisine.includes("thali")) highlights.push("Thali");
    if (cuisine.includes("biryani")) highlights.push("Biryani");
    if (cuisine.includes("international")) highlights.push("International");
    if (cuisine.includes("continental")) highlights.push("Continental");
    if (cuisine.includes("italian")) highlights.push("Italian");
    if (cuisine.includes("mughlai")) highlights.push("Mughlai");

    // Type-based highlights
    if (amenity === "cafe") highlights.push("Coffee", "Snacks");
    if (amenity === "fast_food") highlights.push("Fast Food");
    if (amenity === "bakery") highlights.push("Bakery");

    // Default highlights if none found
    if (highlights.length === 0) {
        highlights.push("Home Food", "Thali");
    }

    return highlights.slice(0, 4); // Limit to 4 highlights
};

// Geocode an address using Nominatim with smart fallback
export const geocodeAddress = async (
    address: string
): Promise<{ lat: number; lng: number } | null> => {
    try {
        const cleanedAddress = address.replace(/\bkolhapure\b/gi, 'Kolhapur').trim();
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedAddress)}&limit=1`,
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

        // Fallback default coordinates (Kolhapur area)
        return { lat: 16.7050, lng: 74.2433 };
    } catch (error) {
        console.error("Error geocoding address:", error);
        return { lat: 16.7050, lng: 74.2433 };
    }
};

// Reverse geocode coordinates using Nominatim
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

// Search for places by text using Nominatim
export const searchPlaces = async (
    query: string,
    viewbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number }
): Promise<Array<{ lat: number; lng: number; display_name: string; type: string }>> => {
    try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`;

        if (viewbox) {
            url += `&viewbox=${viewbox.minLng},${viewbox.maxLat},${viewbox.maxLng},${viewbox.minLat}&bounded=1`;
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

// Get OSM element by ID using Overpass API
export const getOsmElementById = async (osmId: string): Promise<any | null> => {
    try {
        // Extract the numeric ID from osm-room-12345 or osm-mess-12345
        const numericId = osmId.replace(/^osm-(room|mess)-/, '');

        const query = `
            [out:json][timeout:30];
            (
                node(${numericId});
                way(${numericId});
                relation(${numericId});
            );
            out body center;
        `;

        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        if (!response.ok) {
            console.error("Overpass API error:", response.statusText);
            return null;
        }

        const data = await response.json();
        const elements = data.elements || [];

        if (elements.length > 0) {
            return elements[0];
        }
        return null;
    } catch (error) {
        console.error("Error fetching OSM element:", error);
        return null;
    }
};

// Get room details by OSM ID
export const getOsmRoomById = async (osmId: string): Promise<RoomPlace | null> => {
    try {
        const element = await getOsmElementById(osmId);

        if (!element || !element.tags) {
            return null;
        }

        const el = element;
        const placeLat = el.lat || el.center?.lat;
        const placeLng = el.lon || el.center?.lon;

        // Determine room type from tags
        let roomType = "PG";
        const tourism = el.tags?.tourism || "";
        const amenity = el.tags?.amenity || "";
        const building = el.tags?.building || "";
        const name = (el.tags?.name || "").toLowerCase();

        if (tourism === "hostel" || building === "dormitory" || amenity === "dormitory" || name.includes("hostel")) {
            roomType = "Hostel";
        } else if (tourism === "hotel" || tourism === "motel" || building === "hotel" || name.includes("hotel")) {
            roomType = "Hotel";
        } else if (tourism === "guest_house" || name.includes("guest house") || name.includes("lodge")) {
            roomType = "Guest House";
        } else if (tourism === "apartment" || building === "apartments" || name.includes("apartment")) {
            roomType = "Apartment";
        }

        // Generate estimated price based on type
        const priceMultiplier: Record<string, number> = {
            Hostel: 1,
            PG: 1.2,
            "Guest House": 1.5,
            Apartment: 1.8,
            Hotel: 2,
        };
        const basePrice = 3000;
        const estimatedPrice = Math.round(basePrice * (priceMultiplier[roomType] || 1) + 500);

        // Get address from tags or reverse geocode
        let address = [
            el.tags?.["addr:street"],
            el.tags?.["addr:city"] || el.tags?.["addr:suburb"],
            el.tags?.["addr:district"],
            el.tags?.["addr:state"],
            el.tags?.["addr:postcode"],
        ]
            .filter(Boolean)
            .join(", ") || el.tags?.["addr:full"];

        // If no address in tags, try to get it from reverse geocoding
        if (!address && placeLat && placeLng) {
            const geoResult = await reverseGeocode(placeLat, placeLng);
            if (geoResult) {
                address = geoResult.address;
            }
        }

        // Extract REAL contact information from OSM tags
        const contactInfo = extractContactFromOSMTags(el.tags);

        return {
            id: osmId,
            place_id: `osm-${el.id}`,
            name: el.tags?.name || "Unknown Place",
            title: el.tags?.name || "Unknown Place",
            location: address || "Location available on map",
            address: address || "Location available on map",
            lat: placeLat,
            lng: placeLng,
            rating: parseFloat(el.tags?.stars || "0") || 4.2,
            reviews: Math.floor(Math.random() * 80) + 20,
            price: estimatedPrice,
            roomType,
            facilities: extractFacilities(el.tags),
            isOpen: true,
            image: defaultRoomImages[0],
            photos: defaultRoomImages,
            types: [tourism, amenity, building].filter(Boolean),
            isFromGoogle: false,
            isVerified: contactInfo.hasContact,
            // Real contact information from OSM
            contact: contactInfo,
        };
    } catch (error) {
        console.error("Error fetching OSM room by ID:", error);
        return null;
    }
};

// Get mess details by OSM ID
export const getOsmMessById = async (osmId: string): Promise<MessPlace | null> => {
    try {
        const element = await getOsmElementById(osmId);

        if (!element || !element.tags) {
            return null;
        }

        const el = element;
        const placeLat = el.lat || el.center?.lat;
        const placeLng = el.lon || el.center?.lon;

        // Determine food type
        let foodType: "veg" | "non-veg" | "both" = "both";
        const cuisine = (el.tags?.cuisine || "").toLowerCase();
        const name = (el.tags?.name || "").toLowerCase();
        const diet = el.tags?.["diet:vegetarian"];

        if (
            diet === "only" ||
            cuisine.includes("vegetarian") ||
            (name.includes("veg") && !name.includes("non")) ||
            cuisine.includes("indian_vegetarian")
        ) {
            foodType = "veg";
        } else if (
            cuisine.includes("chicken") ||
            cuisine.includes("meat") ||
            cuisine.includes("non-veg") ||
            name.includes("non-veg") ||
            cuisine.includes("seafood")
        ) {
            foodType = "non-veg";
        }

        // Estimate price based on type
        const amenity = el.tags?.amenity || "";
        let basePrice = 2500;
        if (amenity === "fast_food") basePrice = 1500;
        else if (amenity === "cafe") basePrice = 2000;
        else if (amenity === "restaurant") basePrice = 3000;

        const estimatedPrice = basePrice + 500;

        // Get address
        let address = [
            el.tags?.["addr:street"],
            el.tags?.["addr:city"] || el.tags?.["addr:suburb"],
            el.tags?.["addr:district"],
            el.tags?.["addr:state"],
            el.tags?.["addr:postcode"],
        ]
            .filter(Boolean)
            .join(", ") || el.tags?.["addr:full"];

        // If no address in tags, try to get it from reverse geocoding
        if (!address && placeLat && placeLng) {
            const geoResult = await reverseGeocode(placeLat, placeLng);
            if (geoResult) {
                address = geoResult.address;
            }
        }

        // Extract REAL contact information from OSM tags
        const contactInfo = extractContactFromOSMTags(el.tags);

        return {
            id: osmId,
            place_id: `osm-${el.id}`,
            name: el.tags?.name || "Unknown Restaurant",
            location: address || "Location available on map",
            address: address || "Location available on map",
            lat: placeLat,
            lng: placeLng,
            rating: 4.0 + Math.random() * 0.8,
            reviews: Math.floor(Math.random() * 150) + 30,
            pricePerMonth: estimatedPrice,
            foodType,
            timings: el.tags?.opening_hours || "Check timings",
            menuHighlights: extractMenuHighlights(el.tags),
            isOpen: true,
            image: defaultMessImages[0],
            photos: defaultMessImages,
            types: [el.tags?.amenity, el.tags?.cuisine].filter(Boolean),
            isFromGoogle: false,
            isVerified: contactInfo.hasContact,
            // Real contact information from OSM
            contact: contactInfo,
        };
    } catch (error) {
        console.error("Error fetching OSM mess by ID:", error);
        return null;
    }
};
