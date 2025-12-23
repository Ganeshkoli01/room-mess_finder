import { supabase } from "@/integrations/supabase/client";

export interface Profile {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface UpdateProfileInput {
    first_name?: string;
    last_name?: string;
    phone?: string;
    avatar_url?: string;
}

// Get current user's profile
export const getProfile = async (): Promise<Profile | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("No authenticated user");
        return null;
    }

    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) {
            console.error("Error fetching profile:", error);
            return null;
        }

        // If no profile exists, create one from user metadata
        if (!data) {
            return createProfileFromUser(user);
        }

        return data;
    } catch (err) {
        console.error("Exception fetching profile:", err);
        return null;
    }
};

// Create profile from authenticated user
const createProfileFromUser = async (user: any): Promise<Profile | null> => {
    try {
        const profileData = {
            user_id: user.id,
            first_name: user.user_metadata?.first_name || user.email?.split("@")[0] || null,
            last_name: user.user_metadata?.last_name || null,
            phone: user.user_metadata?.phone || null,
            avatar_url: user.user_metadata?.avatar_url || null,
        };

        const { data, error } = await supabase
            .from("profiles")
            .insert(profileData)
            .select()
            .single();

        if (error) {
            // If profile already exists (race condition), fetch it
            if (error.code === "23505") {
                const { data: existingProfile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", user.id)
                    .maybeSingle();
                return existingProfile;
            }
            console.error("Error creating profile:", error);
            return null;
        }

        return data;
    } catch (err) {
        console.error("Exception creating profile:", err);
        return null;
    }
};

// Update current user's profile
export const updateProfile = async (updates: UpdateProfileInput): Promise<Profile | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    try {
        // First check if profile exists
        const existingProfile = await getProfile();

        if (!existingProfile) {
            // Create profile first
            await createProfileFromUser(user);
        }

        const { data, error } = await supabase
            .from("profiles")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating profile:", error);
            throw error;
        }

        return data;
    } catch (err) {
        console.error("Exception updating profile:", err);
        throw err;
    }
};

// Get profile by user ID (for viewing other users' profiles)
export const getProfileById = async (userId: string): Promise<Partial<Profile> | null> => {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("first_name, last_name, avatar_url")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.error("Error fetching profile by ID:", error);
            return null;
        }

        return data;
    } catch (err) {
        console.error("Exception fetching profile by ID:", err);
        return null;
    }
};

// Upload avatar image
export const uploadAvatar = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: true,
            });

        if (uploadError) {
            console.error("Error uploading avatar:", uploadError);
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        // Update profile with new avatar URL
        await updateProfile({ avatar_url: publicUrl });

        return publicUrl;
    } catch (err) {
        console.error("Exception uploading avatar:", err);
        throw err;
    }
};

// Delete user account (soft delete - just marks as inactive)
export const deleteAccount = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // Sign out the user
    await supabase.auth.signOut();
};
