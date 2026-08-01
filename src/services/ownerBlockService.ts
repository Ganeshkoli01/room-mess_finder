import { supabase } from "@/integrations/supabase/client";
import logger from "@/lib/logger";

const STORAGE_KEY = "rm_owner_blocks";

// Local storage fallback helper to get blocks
const getLocalBlocks = (): { id: string; owner_id: string; user_id: string; created_at: string }[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Local storage fallback helper to save blocks
const saveLocalBlocks = (blocks: any[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  } catch (err) {
    logger.error("Error saving local blocks:", err);
  }
};

// Block a user
export const blockUser = async (ownerId: string, userId: string): Promise<boolean> => {
  const newBlock = {
    owner_id: ownerId,
    user_id: userId,
  };

  try {
    const { error } = await (supabase as any)
      .from("owner_blocks")
      .insert([newBlock]);

    if (error) throw error;
    logger.info(`User ${userId} successfully blocked by owner ${ownerId} in database`);
  } catch (err) {
    logger.warn(`Failed to block in DB, using local storage fallback:`, { data: err });
  }

  // Update local storage fallback anyway
  const localBlocks = getLocalBlocks();
  const alreadyBlocked = localBlocks.some(b => b.owner_id === ownerId && b.user_id === userId);
  if (!alreadyBlocked) {
    localBlocks.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      owner_id: ownerId,
      user_id: userId,
      created_at: new Date().toISOString()
    });
    saveLocalBlocks(localBlocks);
  }
  return true;
};

// Unblock a user
export const unblockUser = async (ownerId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from("owner_blocks")
      .delete()
      .eq("owner_id", ownerId)
      .eq("user_id", userId);

    if (error) throw error;
    logger.info(`User ${userId} successfully unblocked by owner ${ownerId} in database`);
  } catch (err) {
    logger.warn(`Failed to unblock in DB, using local storage fallback:`, { data: err });
  }

  // Update local storage fallback anyway
  const localBlocks = getLocalBlocks();
  const updatedBlocks = localBlocks.filter(b => !(b.owner_id === ownerId && b.user_id === userId));
  saveLocalBlocks(updatedBlocks);
  return true;
};

// Get list of blocked user IDs for an owner
export const getBlockedUsers = async (ownerId: string): Promise<string[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from("owner_blocks")
      .select("user_id")
      .eq("owner_id", ownerId);

    if (error) throw error;
    if (data) {
      const dbIds = data.map((b: any) => b.user_id);
      
      // Merge with local blocks
      const localBlocks = getLocalBlocks();
      const localIds = localBlocks.filter(b => b.owner_id === ownerId).map(b => b.user_id);
      
      return Array.from(new Set([...dbIds, ...localIds]));
    }
  } catch (err) {
    logger.warn(`Failed to fetch blocked users from DB, returning local storage fallback:`, { data: err });
  }

  const localBlocks = getLocalBlocks();
  return localBlocks.filter(b => b.owner_id === ownerId).map(b => b.user_id);
};

// Check if user is blocked by owner
export const isUserBlocked = async (ownerId: string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await (supabase as any)
      .from("owner_blocks")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) return true;
  } catch (err) {
    logger.warn(`Failed to check block in DB, using local fallback`, { data: err });
  }

  const localBlocks = getLocalBlocks();
  return localBlocks.some(b => b.owner_id === ownerId && b.user_id === userId);
};
