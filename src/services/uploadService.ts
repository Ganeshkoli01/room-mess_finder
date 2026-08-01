import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to Supabase storage (listings bucket)
 * and returns the public URL.
 */
export const uploadListingImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("listings")
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
        });

    if (uploadError) {
        console.error("Error uploading to listings bucket:", uploadError);
        throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
        .from("listings")
        .getPublicUrl(filePath);

    return publicUrl;
};
