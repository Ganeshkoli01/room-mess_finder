import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlags {
  ai_search: boolean;
  chat: boolean;
  booking_system: boolean;
  reviews: boolean;
  maintenance_banner: boolean;
  location_gps: boolean;
}

export const defaultFeatureFlags: FeatureFlags = {
  ai_search: true,
  chat: true,
  booking_system: true,
  reviews: true,
  maintenance_banner: false,
  location_gps: true,
};

// Fetch current feature flags from platform_settings table
export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  try {
    const { data, error } = await (supabase as any)
      .from("platform_settings")
      .select("feature_flags")
      .limit(1)
      .maybeSingle();

    if (!error && data && data.feature_flags) {
      return { ...defaultFeatureFlags, ...data.feature_flags };
    }
  } catch (err) {
    console.error("Error fetching feature flags:", err);
  }

  // Read from localStorage fallback if offline
  const cached = localStorage.getItem("rm_feature_flags");
  if (cached) {
    try {
      return { ...defaultFeatureFlags, ...JSON.parse(cached) };
    } catch (e) {
      // ignore
    }
  }

  return defaultFeatureFlags;
};

// Update feature flags in database
export const updateFeatureFlags = async (flags: Partial<FeatureFlags>): Promise<FeatureFlags> => {
  const current = await getFeatureFlags();
  const updated = { ...current, ...flags };

  try {
    // Check if platform_settings row exists
    const { data: existing } = await (supabase as any)
      .from("platform_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing) {
      await (supabase as any)
        .from("platform_settings")
        .update({ feature_flags: updated, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await (supabase as any)
        .from("platform_settings")
        .insert({ feature_flags: updated });
    }

    localStorage.setItem("rm_feature_flags", JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Error updating feature flags:", err);
    localStorage.setItem("rm_feature_flags", JSON.stringify(updated));
    return updated;
  }
};
