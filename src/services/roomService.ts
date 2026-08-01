import { supabase } from "@/integrations/supabase/client";

export interface Room {
    id: string;
    owner_id: string;
    title: string;
    description?: string;
    location: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    price: number;
    room_type: string;
    facilities: string[];
    images: string[];
    is_verified: boolean;
    is_active: boolean;
    rating?: number;
    reviews_count?: number;
    created_at: string;
    updated_at: string;
    distance?: number;
    deposit?: number;
    available_from?: string;
    preferred_tenants?: string;
    rules?: string;
    is_featured?: boolean;
    featured_until?: string;
}

export interface CreateRoomInput {
    title: string;
    description?: string;
    location: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    price: number;
    room_type: string;
    facilities?: string[];
    images?: string[];
    deposit?: number;
    available_from?: string;
    preferred_tenants?: string;
    rules?: string;
}

export interface UpdateRoomInput extends Partial<CreateRoomInput> {
    is_active?: boolean;
    is_featured?: boolean;
    featured_until?: string | null;
}

// Get all rooms (public)
export const getRooms = async (): Promise<Room[]> => {
    console.log("Fetching rooms from Supabase...");
    try {
        // Query shadow banned users
        let shadowBannedIds: string[] = [];
        try {
            const { data: sbData } = await (supabase as any)
                .from("profiles")
                .select("user_id")
                .eq("shadow_banned", true);
            if (sbData) {
                shadowBannedIds = sbData.map(u => u.user_id);
            }
        } catch (e) {
            console.warn("Could not query shadow banned profiles:", e);
        }

        let query: any = (supabase as any)
            .from("rooms")
            .select("*")
            .eq("is_active", true)
            .eq("status", "approved")
            .or("flagged.eq.false,flagged.is.null");

        if (shadowBannedIds.length > 0) {
            query = query.not("owner_id", "in", `(${shadowBannedIds.join(",")})`);
        }

        const { data, error } = await query
            .order("is_featured", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching rooms:", error);
            // Return empty array instead of throwing to allow fallback to demo data
            return [];
        }
        console.log("Rooms fetched:", data?.length || 0, "rooms found");
        return data || [];
    } catch (err) {
        console.error("Exception fetching rooms:", err);
        return [];
    }
};

// Get rooms near a location
export const getRoomsNearLocation = async (
    latitude: number,
    longitude: number,
    radiusKm: number = 50
): Promise<Room[]> => {
    try {
        // Try RPC function if it exists
        const { data, error } = await supabase.rpc("get_rooms_near_location" as any, {
            user_lat: latitude,
            user_lng: longitude,
            radius_km: radiusKm,
        });

        if (error) {
            console.warn("RPC get_rooms_near_location not available, falling back to regular query");
            // Fallback to regular query if RPC fails
            return getRooms();
        }

        return (data as Room[]) || [];
    } catch {
        // Fallback to regular query
        return getRooms();
    }
};

// Get room by ID
export const getRoomById = async (id: string): Promise<Room | null> => {
    const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
};

// Get rooms by owner with fallback to local storage
export const getRoomsByOwner = async (ownerId: string): Promise<Room[]> => {
    let dbRooms: Room[] = [];
    try {
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .eq("owner_id", ownerId)
            .order("created_at", { ascending: false });

        if (!error && data) {
            dbRooms = data;
        }
    } catch (err) {
        console.warn("Supabase fetch rooms by owner error:", err);
    }

    try {
        const localRooms: Room[] = JSON.parse(localStorage.getItem("rm_rooms") || "[]")
            .filter((r: any) => r.owner_id === ownerId);

        const dbIds = new Set(dbRooms.map(r => r.id));
        const uniqueLocal = localRooms.filter(r => !dbIds.has(r.id));
        return [...dbRooms, ...uniqueLocal];
    } catch {
        return dbRooms;
    }
};

// Helper to save room to local storage
const saveRoomToLocal = (room: Room) => {
    try {
        const localRooms: Room[] = JSON.parse(localStorage.getItem("rm_rooms") || "[]");
        const existingIndex = localRooms.findIndex(r => r.id === room.id);
        if (existingIndex !== -1) {
            localRooms[existingIndex] = room;
        } else {
            localRooms.unshift(room);
        }
        localStorage.setItem("rm_rooms", JSON.stringify(localRooms));
    } catch (e) {
        console.error("Failed to save room to localStorage", e);
    }
};

// Create a new room
export const createRoom = async (room: CreateRoomInput & { owner_id?: string }): Promise<Room> => {
    const { data: { user } } = await supabase.auth.getUser();
    const activeOwnerId = user?.id || room.owner_id || "demo_owner";

    const newRoom: Room = {
        id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        owner_id: activeOwnerId,
        title: room.title,
        description: room.description || "",
        location: room.location,
        address: room.address || "",
        city: room.city || "",
        latitude: room.latitude,
        longitude: room.longitude,
        price: room.price,
        room_type: room.room_type,
        facilities: room.facilities || [],
        images: room.images || [],
        deposit: room.deposit,
        available_from: room.available_from,
        preferred_tenants: room.preferred_tenants,
        rules: room.rules,
        is_verified: false,
        is_active: true,
        rating: 4.5,
        reviews_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    try {
        const { data, error } = await supabase
            .from("rooms")
            .insert({
                ...room,
                owner_id: activeOwnerId,
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        if (data) {
            saveRoomToLocal(data);
            return data;
        }
    } catch (err: any) {
        console.error("Supabase room creation error:", err);
        throw err;
    }

    saveRoomToLocal(newRoom);
    return newRoom;
};

// Update a room
export const updateRoom = async (id: string, updates: UpdateRoomInput): Promise<Room> => {
    try {
        const { data, error } = await supabase
            .from("rooms")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        if (data) {
            saveRoomToLocal(data);
            return data;
        }
    } catch (err: any) {
        console.error("Supabase room update error:", err);
        throw err;
    }

    const localRooms: Room[] = JSON.parse(localStorage.getItem("rm_rooms") || "[]");
    const roomIndex = localRooms.findIndex(r => r.id === id);
    if (roomIndex !== -1) {
        localRooms[roomIndex] = { ...localRooms[roomIndex], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem("rm_rooms", JSON.stringify(localRooms));
        return localRooms[roomIndex];
    }
    throw new Error("Room not found");
};

// Delete a room
export const deleteRoom = async (id: string): Promise<void> => {
    // Try deleting from Supabase database
    try {
        await supabase
            .from("rooms")
            .delete()
            .eq("id", id);
    } catch (err) {
        console.warn("Supabase delete room warning:", err);
    }

    // Always remove from localStorage
    try {
        const localRooms: Room[] = JSON.parse(localStorage.getItem("rm_rooms") || "[]");
        const filtered = localRooms.filter(r => r.id !== id);
        localStorage.setItem("rm_rooms", JSON.stringify(filtered));
    } catch (err) {
        console.error("Local storage delete room error:", err);
    }
};

// Toggle room active status
export const toggleRoomActive = async (id: string, isActive: boolean): Promise<Room> => {
    return updateRoom(id, { is_active: isActive });
};

// Search rooms by city or location
export const searchRooms = async (query: string): Promise<Room[]> => {
    const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .or(`location.ilike.%${query}%,city.ilike.%${query}%,title.ilike.%${query}%`)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
};
