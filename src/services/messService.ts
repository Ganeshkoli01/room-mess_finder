import { supabase } from "@/integrations/supabase/client";

export interface Mess {
    id: string;
    owner_id: string;
    name: string;
    description?: string;
    location: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    price_per_month: number;
    food_type: string;
    timings?: string;
    menu_highlights: string[];
    images: string[];
    is_verified: boolean;
    is_active: boolean;
    rating?: number;
    reviews_count?: number;
    created_at: string;
    updated_at: string;
    distance?: number;
}

export interface CreateMessInput {
    name: string;
    description?: string;
    location: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    price_per_month: number;
    food_type: "veg" | "non-veg" | "both";
    timings?: string;
    menu_highlights?: string[];
    images?: string[];
}

export interface UpdateMessInput extends Partial<CreateMessInput> {
    is_active?: boolean;
}

// Get all mess (public)
export const getAllMess = async (): Promise<Mess[]> => {
    console.log("Fetching mess from Supabase...");
    try {
        const { data, error } = await supabase
            .from("mess")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching mess:", error);
            // Return empty array instead of throwing to allow fallback to demo data
            return [];
        }
        console.log("Mess fetched:", data?.length || 0, "mess found");
        return data || [];
    } catch (err) {
        console.error("Exception fetching mess:", err);
        return [];
    }
};

// Get mess near a location
export const getMessNearLocation = async (
    latitude: number,
    longitude: number,
    radiusKm: number = 50
): Promise<Mess[]> => {
    try {
        // Try RPC function if it exists
        const { data, error } = await supabase.rpc("get_mess_near_location" as any, {
            user_lat: latitude,
            user_lng: longitude,
            radius_km: radiusKm,
        });

        if (error) {
            console.warn("RPC get_mess_near_location not available, falling back to regular query");
            // Fallback to regular query if RPC fails
            return getAllMess();
        }

        return (data as Mess[]) || [];
    } catch {
        // Fallback to regular query
        return getAllMess();
    }
};

// Get mess by ID
export const getMessById = async (id: string): Promise<Mess | null> => {
    const { data, error } = await supabase
        .from("mess")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
};

// Get mess by owner
export const getMessByOwner = async (ownerId: string): Promise<Mess[]> => {
    const { data, error } = await supabase
        .from("mess")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
};

// Create a new mess
export const createMess = async (mess: CreateMessInput): Promise<Mess> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
        .from("mess")
        .insert({
            ...mess,
            owner_id: user.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Update a mess
export const updateMess = async (id: string, updates: UpdateMessInput): Promise<Mess> => {
    const { data, error } = await supabase
        .from("mess")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Delete a mess
export const deleteMess = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from("mess")
        .delete()
        .eq("id", id);

    if (error) throw error;
};

// Toggle mess active status
export const toggleMessActive = async (id: string, isActive: boolean): Promise<Mess> => {
    return updateMess(id, { is_active: isActive });
};

// Search mess by city or location
export const searchMess = async (query: string): Promise<Mess[]> => {
    const { data, error } = await supabase
        .from("mess")
        .select("*")
        .eq("is_active", true)
        .or(`location.ilike.%${query}%,city.ilike.%${query}%,name.ilike.%${query}%`)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
};
