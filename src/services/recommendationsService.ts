// AI Recommendations Service
// Provides personalized recommendations based on user behavior and preferences

import { RoomPlace, MessPlace } from './osmPlacesService';
import logger from '@/lib/logger';

// User preference storage keys
const STORAGE_KEYS = {
    VIEWED_ROOMS: 'rm_viewed_rooms',
    VIEWED_MESS: 'rm_viewed_mess',
    FAVORITES: 'rm_favorites',
    SEARCH_HISTORY: 'rm_search_history',
    PREFERENCES: 'rm_preferences',
};

export interface UserPreferences {
    preferredRoomTypes: string[];
    preferredFoodTypes: string[];
    preferredPriceRange: { min: number; max: number };
    preferredFacilities: string[];
    preferredLocations: string[];
}

export interface ViewedItem {
    id: string;
    type: 'room' | 'mess';
    title: string;
    location: string;
    price: number;
    timestamp: number;
}

export interface FavoriteItem extends ViewedItem {
    image: string;
    rating: number;
}

export interface SearchHistoryItem {
    query: string;
    timestamp: number;
    type: 'room' | 'mess' | 'both';
}

// Get recently viewed items
export const getRecentlyViewed = (): ViewedItem[] => {
    try {
        const rooms = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIEWED_ROOMS) || '[]');
        const mess = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIEWED_MESS) || '[]');
        return [...rooms, ...mess]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
    } catch {
        return [];
    }
};

// Add to recently viewed
export const addToRecentlyViewed = (item: ViewedItem): void => {
    try {
        const key = item.type === 'room' ? STORAGE_KEYS.VIEWED_ROOMS : STORAGE_KEYS.VIEWED_MESS;
        const items: ViewedItem[] = JSON.parse(localStorage.getItem(key) || '[]');

        // Remove duplicate if exists
        const filtered = items.filter(i => i.id !== item.id);

        // Add to beginning
        filtered.unshift({ ...item, timestamp: Date.now() });

        // Keep only last 20
        const trimmed = filtered.slice(0, 20);

        localStorage.setItem(key, JSON.stringify(trimmed));
        logger.debug(`Added to recently viewed: ${item.title}`, { context: 'Recommendations' });
    } catch (error) {
        logger.error('Failed to save recently viewed', error, { context: 'Recommendations' });
    }
};

// Get favorites
export const getFavorites = (): FavoriteItem[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
    } catch {
        return [];
    }
};

// Add to favorites
export const addToFavorites = (item: FavoriteItem): boolean => {
    try {
        const favorites = getFavorites();

        // Check if already exists
        if (favorites.some(f => f.id === item.id)) {
            return false;
        }

        favorites.unshift({ ...item, timestamp: Date.now() });
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        logger.debug(`Added to favorites: ${item.title}`, { context: 'Recommendations' });
        return true;
    } catch {
        return false;
    }
};

// Remove from favorites
export const removeFromFavorites = (id: string): boolean => {
    try {
        const favorites = getFavorites();
        const filtered = favorites.filter(f => f.id !== id);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
        return true;
    } catch {
        return false;
    }
};

// Check if item is favorited
export const isFavorite = (id: string): boolean => {
    return getFavorites().some(f => f.id === id);
};

// Get search history
export const getSearchHistory = (): SearchHistoryItem[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY) || '[]')
            .slice(0, 10);
    } catch {
        return [];
    }
};

// Add to search history
export const addToSearchHistory = (query: string, type: 'room' | 'mess' | 'both'): void => {
    try {
        const history = getSearchHistory();

        // Remove duplicate
        const filtered = history.filter(h => h.query.toLowerCase() !== query.toLowerCase());

        filtered.unshift({ query, type, timestamp: Date.now() });

        localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(filtered.slice(0, 20)));
    } catch {
        // Ignore errors
    }
};

// Clear search history
export const clearSearchHistory = (): void => {
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
};

// Get user preferences based on browsing history
export const inferUserPreferences = (): UserPreferences => {
    const viewedRooms: ViewedItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIEWED_ROOMS) || '[]');
    const favorites: FavoriteItem[] = getFavorites();

    // Default preferences
    const preferences: UserPreferences = {
        preferredRoomTypes: [],
        preferredFoodTypes: [],
        preferredPriceRange: { min: 0, max: 20000 },
        preferredFacilities: [],
        preferredLocations: [],
    };

    // Extract locations from viewed items
    const locations = [...viewedRooms, ...favorites]
        .map(item => item.location)
        .filter(Boolean);

    // Count location frequency
    const locationCounts: Record<string, number> = {};
    locations.forEach(loc => {
        const city = loc.split(',')[0].trim();
        locationCounts[city] = (locationCounts[city] || 0) + 1;
    });

    preferences.preferredLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([loc]) => loc);

    // Calculate average price range
    const prices = [...viewedRooms, ...favorites]
        .map(item => item.price)
        .filter(p => p > 0);

    if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        preferences.preferredPriceRange = {
            min: Math.max(0, avgPrice - 2000),
            max: avgPrice + 3000,
        };
    }

    return preferences;
};

// Generate AI-powered recommendations
export const getRecommendations = async (
    allRooms: RoomPlace[],
    allMess: MessPlace[],
    userLocation?: { lat: number; lng: number }
): Promise<{ rooms: RoomPlace[]; mess: MessPlace[] }> => {
    const preferences = inferUserPreferences();
    const favorites = getFavorites();
    const recentlyViewed = getRecentlyViewed();

    // Calculate scores for rooms
    const scoredRooms = allRooms.map(room => {
        let score = 0;

        // Prefer items in favorite locations
        if (preferences.preferredLocations.some(loc =>
            room.location.toLowerCase().includes(loc.toLowerCase())
        )) {
            score += 20;
        }

        // Prefer items in price range
        if (room.price >= preferences.preferredPriceRange.min &&
            room.price <= preferences.preferredPriceRange.max) {
            score += 15;
        }

        // Higher rating = higher score
        score += room.rating * 3;

        // Verified items get bonus
        if (room.isVerified) score += 10;

        // Closer distance = higher score
        if (room.distance && room.distance < 5) {
            score += (5 - room.distance) * 5;
        }

        // Avoid recently viewed (for diversity)
        if (recentlyViewed.some(v => v.id === room.id)) {
            score -= 5;
        }

        return { room, score };
    });

    // Calculate scores for mess
    const scoredMess = allMess.map(mess => {
        let score = 0;

        if (preferences.preferredLocations.some(loc =>
            mess.location.toLowerCase().includes(loc.toLowerCase())
        )) {
            score += 20;
        }

        score += mess.rating * 3;
        if (mess.isVerified) score += 10;

        if (mess.distance && mess.distance < 5) {
            score += (5 - mess.distance) * 5;
        }

        if (recentlyViewed.some(v => v.id === mess.id)) {
            score -= 5;
        }

        return { mess, score };
    });

    // Sort by score and return top recommendations
    const recommendedRooms = scoredRooms
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(s => s.room);

    const recommendedMess = scoredMess
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(s => s.mess);

    logger.debug(`Generated ${recommendedRooms.length} room and ${recommendedMess.length} mess recommendations`,
        { context: 'Recommendations' });

    return { rooms: recommendedRooms, mess: recommendedMess };
};

// Clear all user data
export const clearAllUserData = (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    logger.info('Cleared all user data', { context: 'Recommendations' });
};

export default {
    getRecentlyViewed,
    addToRecentlyViewed,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    getSearchHistory,
    addToSearchHistory,
    clearSearchHistory,
    inferUserPreferences,
    getRecommendations,
    clearAllUserData,
};
