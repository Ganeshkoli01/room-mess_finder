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
}

export interface UpdateRoomInput extends Partial<CreateRoomInput> {
    is_active?: boolean;
}

// Get all rooms (public)
export const getRooms = async (): Promise<Room[]> => {
    console.log("Fetching rooms from Supabase...");
    try {
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .eq("is_active", true)
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

// Get rooms by owner
export const getRoomsByOwner = async (ownerId: string): Promise<Room[]> => {
    const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
};

// Create a new room
export const createRoom = async (room: CreateRoomInput): Promise<Room> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
        .from("rooms")
        .insert({
            ...room,
            owner_id: user.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Update a room
export const updateRoom = async (id: string, updates: UpdateRoomInput): Promise<Room> => {
    const { data, error } = await supabase
        .from("rooms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Delete a room
export const deleteRoom = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", id);

    if (error) throw error;
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
