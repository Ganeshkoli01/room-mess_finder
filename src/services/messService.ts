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
    weekly_menu?: any;
    is_featured?: boolean;
    featured_until?: string;
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
    weekly_menu?: any;
}

export interface UpdateMessInput extends Partial<CreateMessInput> {
    is_active?: boolean;
    is_featured?: boolean;
    featured_until?: string | null;
}

// Get all mess (public)
export const getAllMess = async (): Promise<Mess[]> => {
    console.log("Fetching mess from Supabase...");
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
            .from("mess")
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

// Get mess by owner with fallback to local storage
export const getMessByOwner = async (ownerId: string): Promise<Mess[]> => {
    let dbMess: Mess[] = [];
    try {
        const { data, error } = await supabase
            .from("mess")
            .select("*")
            .eq("owner_id", ownerId)
            .order("created_at", { ascending: false });

        if (!error && data) {
            dbMess = data;
        }
    } catch (err) {
        console.warn("Supabase fetch mess by owner error:", err);
    }

    try {
        const localMess: Mess[] = JSON.parse(localStorage.getItem("rm_mess") || "[]")
            .filter((m: any) => m.owner_id === ownerId);

        const dbIds = new Set(dbMess.map(m => m.id));
        const uniqueLocal = localMess.filter(m => !dbIds.has(m.id));
        return [...dbMess, ...uniqueLocal];
    } catch {
        return dbMess;
    }
};

// Helper to save mess to local storage
const saveMessToLocal = (mess: Mess) => {
    try {
        const localMess: Mess[] = JSON.parse(localStorage.getItem("rm_mess") || "[]");
        const existingIndex = localMess.findIndex(m => m.id === mess.id);
        if (existingIndex !== -1) {
            localMess[existingIndex] = mess;
        } else {
            localMess.unshift(mess);
        }
        localStorage.setItem("rm_mess", JSON.stringify(localMess));
    } catch (e) {
        console.error("Failed to save mess to localStorage", e);
    }
};

// Create a new mess
export const createMess = async (mess: CreateMessInput & { owner_id?: string }): Promise<Mess> => {
    const { data: { user } } = await supabase.auth.getUser();
    const activeOwnerId = user?.id || mess.owner_id || "demo_owner";

    const newMess: Mess = {
        id: `mess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        owner_id: activeOwnerId,
        name: mess.name,
        description: mess.description || "",
        location: mess.location,
        address: mess.address || "",
        city: mess.city || "",
        latitude: mess.latitude,
        longitude: mess.longitude,
        price_per_month: mess.price_per_month,
        food_type: mess.food_type,
        timings: mess.timings || "7 AM - 10 PM",
        menu_highlights: mess.menu_highlights || [],
        images: mess.images || [],
        is_verified: false,
        is_active: true,
        rating: 4.5,
        reviews_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        weekly_menu: mess.weekly_menu || null,
    };

    try {
        const { data, error } = await supabase
            .from("mess")
            .insert({
                ...mess,
                owner_id: activeOwnerId,
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        if (data) {
            saveMessToLocal(data);
            return data;
        }
    } catch (err: any) {
        console.error("Supabase mess creation error:", err);
        throw err;
    }

    saveMessToLocal(newMess);
    return newMess;
};

// Update a mess
export const updateMess = async (id: string, updates: UpdateMessInput): Promise<Mess> => {
    try {
        const { data, error } = await supabase
            .from("mess")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        if (data) {
            saveMessToLocal(data);
            return data;
        }
    } catch (err: any) {
        console.error("Supabase mess update error:", err);
        throw err;
    }

    const localMess: Mess[] = JSON.parse(localStorage.getItem("rm_mess") || "[]");
    const messIndex = localMess.findIndex(m => m.id === id);
    if (messIndex !== -1) {
        localMess[messIndex] = { ...localMess[messIndex], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem("rm_mess", JSON.stringify(localMess));
        return localMess[messIndex];
    }
    throw new Error("Mess not found");
};

// Delete a mess
export const deleteMess = async (id: string): Promise<void> => {
    // Try deleting from Supabase database
    try {
        await supabase
            .from("mess")
            .delete()
            .eq("id", id);
    } catch (err) {
        console.warn("Supabase delete mess warning:", err);
    }

    // Always remove from localStorage
    try {
        const localMess: Mess[] = JSON.parse(localStorage.getItem("rm_mess") || "[]");
        const filtered = localMess.filter(m => m.id !== id);
        localStorage.setItem("rm_mess", JSON.stringify(filtered));
    } catch (err) {
        console.error("Local storage delete mess error:", err);
    }
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
