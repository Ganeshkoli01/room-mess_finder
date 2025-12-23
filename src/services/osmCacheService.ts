// OSM Cache Service
// Stores OSM data in memory to ensure consistency between listing and detail pages
// This ensures 100% accuracy - what you see on the card is exactly what you get on the detail page

import { RoomPlace, MessPlace } from './osmPlacesService';
import logger from '@/lib/logger';

// In-memory cache for OSM places
const roomsCache = new Map<string, RoomPlace>();
const messCache = new Map<string, MessPlace>();

// Store rooms in cache
export const cacheRooms = (rooms: RoomPlace[]): void => {
    rooms.forEach(room => {
        roomsCache.set(room.id, room);
    });
    logger.debug(`Cached ${rooms.length} rooms. Total in cache: ${roomsCache.size}`, { context: 'OSMCache' });
};

// Store mess in cache
export const cacheMess = (messPlaces: MessPlace[]): void => {
    messPlaces.forEach(mess => {
        messCache.set(mess.id, mess);
    });
    logger.debug(`Cached ${messPlaces.length} mess places. Total in cache: ${messCache.size}`, { context: 'OSMCache' });
};

// Get room from cache
export const getCachedRoom = (id: string): RoomPlace | null => {
    const room = roomsCache.get(id);
    if (room) {
        logger.debug(`Found room in cache: ${room.title}`, { context: 'OSMCache' });
    }
    return room || null;
};

// Get mess from cache
export const getCachedMess = (id: string): MessPlace | null => {
    const mess = messCache.get(id);
    if (mess) {
        logger.debug(`Found mess in cache: ${mess.name}`, { context: 'OSMCache' });
    }
    return mess || null;
};

// Clear room cache
export const clearRoomCache = (): void => {
    roomsCache.clear();
    logger.debug('Room cache cleared', { context: 'OSMCache' });
};

// Clear mess cache
export const clearMessCache = (): void => {
    messCache.clear();
    logger.debug('Mess cache cleared', { context: 'OSMCache' });
};

// Get cache stats
export const getCacheStats = (): { rooms: number; mess: number } => {
    return {
        rooms: roomsCache.size,
        mess: messCache.size,
    };
};

// Check if room exists in cache
export const isRoomCached = (id: string): boolean => {
    return roomsCache.has(id);
};

// Check if mess exists in cache
export const isMessCached = (id: string): boolean => {
    return messCache.has(id);
};
