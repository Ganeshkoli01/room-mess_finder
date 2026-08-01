import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export interface DuplicatePair {
  listing1_id: string;
  listing1_title: string;
  listing1_type: "room" | "mess";
  listing2_id: string;
  listing2_title: string;
  similarity: number;
}

export interface BlacklistEntry {
  id: string;
  email: string | null;
  phone: string | null;
  reason: string | null;
  created_at: string;
}

// 1. Fetch all candidate duplicate listings
export const fetchDuplicateListings = async (): Promise<DuplicatePair[]> => {
  try {
    const { data, error } = await supabase.rpc("get_all_duplicate_listings");
    if (error) throw error;
    return (data || []).map((item: any) => ({
      listing1_id: item.listing1_id,
      listing1_title: item.listing1_title,
      listing1_type: item.listing1_type,
      listing2_id: item.listing2_id,
      listing2_title: item.listing2_title,
      similarity: Math.round(Number(item.similarity || 0) * 100) / 100,
    }));
  } catch (err) {
    console.error("Error fetching duplicate listings:", err);
    return [];
  }
};

// 2. Find duplicates for a specific room listing
export const findDuplicateRoomsForId = async (roomId: string) => {
  try {
    const { data, error } = await supabase.rpc("find_duplicate_rooms", { target_room_id: roomId });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error finding duplicate rooms:", err);
    return [];
  }
};

// 3. Find duplicates for a specific mess listing
export const findDuplicateMessForId = async (messId: string) => {
  try {
    const { data, error } = await supabase.rpc("find_duplicate_mess", { target_mess_id: messId });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error finding duplicate mess:", err);
    return [];
  }
};

// 4. Fetch Blacklist Entries
export const fetchBlacklistEntries = async (): Promise<BlacklistEntry[]> => {
  try {
    const { data, error } = await supabase.rpc("get_blacklist_entries");
    if (!error && data) return data;

    // Fallback table query
    const { data: tableData, error: tableErr } = await supabase
      .from("blacklist")
      .select("*")
      .order("created_at", { ascending: false });

    if (tableErr) throw tableErr;
    return tableData || [];
  } catch (err) {
    console.error("Error fetching blacklist entries:", err);
    return [];
  }
};

// 5. Add Entry to Blacklist (Explicit Admin Action)
export const addToBlacklist = async (entry: {
  email?: string;
  phone?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> => {
  if (!entry.email && !entry.phone) {
    return { success: false, error: "Must provide at least an email address or phone number" };
  }

  try {
    const { error } = await supabase.from("blacklist").insert({
      email: entry.email ? entry.email.trim().toLowerCase() : null,
      phone: entry.phone ? entry.phone.trim() : null,
      reason: entry.reason ? entry.reason.trim() : "Flagged by Administrator",
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error adding entry to blacklist:", err);
    return { success: false, error: err.message || "Database insert failed" };
  }
};

// 6. Remove Entry from Blacklist (Explicit Admin Action)
export const removeFromBlacklist = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("blacklist").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error removing entry from blacklist:", err);
    return false;
  }
};

// 7. Check if Email or Phone is Blacklisted before registration
export const checkIsBlacklisted = async (email?: string, phone?: string): Promise<boolean> => {
  if (!email && !phone) return false;
  try {
    const { data, error } = await supabase.rpc("is_blacklisted", {
      check_email: email || null,
      check_phone: phone || null,
    });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error("Error checking blacklist:", err);
    return false;
  }
};
