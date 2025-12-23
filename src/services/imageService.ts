// Enhanced Image Service
// Fetches relevant images for rooms and mess using Unsplash Source API
// Uses intelligent search queries based on listing type and location

interface ImageSearchParams {
    type: 'room' | 'mess';
    name?: string;
    location?: string;
    roomType?: string;
    foodType?: string;
    city?: string;
}

interface ImageResult {
    images: string[];
    videoUrl?: string;
}

// Unsplash collection IDs for different categories
const COLLECTIONS = {
    indianHotelRooms: '1538150', // Hotel rooms
    hostels: '1163637', // Hostels and dormitories
    apartments: '894', // Apartments
    restaurants: '3330445', // Restaurants
    cafes: '145698', // Cafes
    indianFood: '3407507', // Indian food
};

// Keywords for different room types
const ROOM_KEYWORDS: Record<string, string[]> = {
    'Single': ['single room', 'bedroom', 'small room'],
    'Double': ['double room', 'twin room', 'bedroom'],
    'Shared': ['shared room', 'dormitory', 'hostel bed'],
    'PG': ['paying guest', 'room for rent', 'furnished room'],
    'Hostel': ['hostel room', 'dormitory', 'bunk bed'],
    'Hotel': ['hotel room', 'luxury room', 'hotel bedroom'],
    'Apartment': ['apartment', 'flat interior', 'studio apartment'],
    'Guest House': ['guest house', 'lodge room', 'guesthouse'],
};

// Keywords for different food types
const MESS_KEYWORDS: Record<string, string[]> = {
    'veg': ['vegetarian food', 'indian thali', 'vegetable curry'],
    'non-veg': ['indian restaurant', 'chicken curry', 'biryani'],
    'both': ['indian food', 'restaurant', 'mess food'],
    'restaurant': ['restaurant interior', 'dining', 'indian restaurant'],
    'cafe': ['cafe interior', 'coffee shop', 'bakery'],
    'canteen': ['canteen', 'cafeteria', 'mess hall'],
};

// Generate a consistent seed from a string (for reproducible images)
const stringToSeed = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

// Get Unsplash image URL with specific query
const getUnsplashUrl = (query: string, width: number = 800, seed?: number): string => {
    const encodedQuery = encodeURIComponent(query);
    const seedParam = seed !== undefined ? `&sig=${seed}` : '';
    return `https://source.unsplash.com/${width}x600/?${encodedQuery}${seedParam}`;
};

// Get image from Unsplash with collection (more curated)
const getUnsplashCollectionUrl = (collectionId: string, width: number = 800, seed?: number): string => {
    const seedParam = seed !== undefined ? `/${seed}` : '';
    return `https://source.unsplash.com/collection/${collectionId}/${width}x600${seedParam}`;
};

// Generate multiple unique images for a listing
export const getImagesForListing = (params: ImageSearchParams): ImageResult => {
    const { type, name = '', location = '', roomType = 'Single', foodType = 'both', city = '' } = params;

    // Create a unique seed based on listing details
    const baseSeed = stringToSeed(`${name}-${location}-${type}`);

    const images: string[] = [];

    if (type === 'room') {
        // Get keywords for this room type
        const keywords = ROOM_KEYWORDS[roomType] || ROOM_KEYWORDS['Single'];

        // Build search queries
        const queries = [
            `indian ${roomType.toLowerCase()} room interior`,
            keywords[0] || 'bedroom',
            `${city || 'indian'} hotel room`,
            'room interior furniture',
            'clean room bed',
        ];

        // Generate 5 unique images
        for (let i = 0; i < 5; i++) {
            const query = queries[i % queries.length];
            const seed = baseSeed + i * 100;
            images.push(getUnsplashUrl(query, 800, seed));
        }
    } else {
        // Mess/Restaurant images
        const keywords = MESS_KEYWORDS[foodType] || MESS_KEYWORDS['both'];

        const queries = [
            `indian ${foodType === 'veg' ? 'vegetarian' : ''} restaurant`,
            keywords[0] || 'indian food',
            'indian thali meal',
            'restaurant dining table',
            `${city || 'indian'} restaurant interior`,
        ];

        for (let i = 0; i < 5; i++) {
            const query = queries[i % queries.length];
            const seed = baseSeed + i * 100;
            images.push(getUnsplashUrl(query, 800, seed));
        }
    }

    return { images };
};

// Alternative: Get high-quality curated images from collections
export const getCuratedImagesForListing = (params: ImageSearchParams): ImageResult => {
    const { type, name = '', location = '', roomType = 'Single' } = params;

    const baseSeed = stringToSeed(`${name}-${location}-${type}`);
    const images: string[] = [];

    if (type === 'room') {
        // Select collection based on room type
        let collectionId = COLLECTIONS.indianHotelRooms;
        if (roomType === 'Hostel' || roomType === 'Shared') {
            collectionId = COLLECTIONS.hostels;
        } else if (roomType === 'Apartment') {
            collectionId = COLLECTIONS.apartments;
        }

        // Generate 5 images from the collection
        for (let i = 0; i < 5; i++) {
            images.push(getUnsplashCollectionUrl(collectionId, 800, baseSeed + i));
        }
    } else {
        // Mess images
        const collectionId = COLLECTIONS.restaurants;

        for (let i = 0; i < 5; i++) {
            images.push(getUnsplashCollectionUrl(collectionId, 800, baseSeed + i));
        }
    }

    return { images };
};

// Premium image URLs (high-quality, pre-selected)
const PREMIUM_ROOM_IMAGES = [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', // Modern bedroom
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', // Cozy room
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', // Clean room
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', // Hotel room
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', // Apartment
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', // Hostel
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', // PG room
    'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800', // Furnished room
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800', // Hotel suite
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', // Guest room
];

const PREMIUM_MESS_IMAGES = [
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', // Food plate
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', // Restaurant
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800', // Dining
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', // Restaurant interior
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', // Fine dining
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', // Cafe
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', // Indian food
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800', // Thali
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800', // Indian curry
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', // Street food
];

// Get premium quality images with variety
export const getPremiumImagesForListing = (params: ImageSearchParams): ImageResult => {
    const { type, name = '', location = '' } = params;

    const baseSeed = stringToSeed(`${name}-${location}-${type}`);
    const images: string[] = [];

    const sourceImages = type === 'room' ? PREMIUM_ROOM_IMAGES : PREMIUM_MESS_IMAGES;

    // Select 5 unique images based on seed
    const startIndex = baseSeed % sourceImages.length;
    for (let i = 0; i < 5; i++) {
        const index = (startIndex + i) % sourceImages.length;
        images.push(sourceImages[index]);
    }

    return { images };
};

// Main function to get images - combines best of all methods
export const getSmartImagesForListing = async (params: ImageSearchParams): Promise<ImageResult> => {
    const { type, name = '', location = '', roomType = 'Single', foodType = 'both', city = '' } = params;

    // Create a unique seed for consistent images
    const baseSeed = stringToSeed(`${name}-${location}-${type}`);

    const images: string[] = [];

    // Strategy: Mix of premium curated images and dynamic unsplash queries
    if (type === 'room') {
        // First image: Premium curated
        const premiumIndex = baseSeed % PREMIUM_ROOM_IMAGES.length;
        images.push(PREMIUM_ROOM_IMAGES[premiumIndex]);

        // Remaining images: Dynamic queries
        const queries = [
            `${roomType.toLowerCase()} room india`,
            'furnished room bed',
            'hotel room interior',
            'clean bedroom',
        ];

        for (let i = 0; i < 4; i++) {
            const query = queries[i];
            const seed = baseSeed + (i + 1) * 100;
            images.push(getUnsplashUrl(query, 800, seed));
        }
    } else {
        // Mess/Restaurant
        const premiumIndex = baseSeed % PREMIUM_MESS_IMAGES.length;
        images.push(PREMIUM_MESS_IMAGES[premiumIndex]);

        const queries = [
            `indian ${foodType === 'veg' ? 'vegetarian' : ''} food`,
            'indian restaurant interior',
            'thali meal',
            'restaurant dining',
        ];

        for (let i = 0; i < 4; i++) {
            const query = queries[i];
            const seed = baseSeed + (i + 1) * 100;
            images.push(getUnsplashUrl(query, 800, seed));
        }
    }

    return { images };
};

export default {
    getImagesForListing,
    getCuratedImagesForListing,
    getPremiumImagesForListing,
    getSmartImagesForListing,
};
