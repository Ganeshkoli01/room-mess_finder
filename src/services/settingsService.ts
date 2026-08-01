import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  id: string;
  commission_percent: number;
  homepage_banners: string[];
  featured_cities: string[];
  maintenance_mode: boolean;
  featured_listing_price?: number;
  referral_reward_amount?: number;
  min_rent_price?: number;
  max_rent_price?: number;
  created_at: string;
  updated_at: string;
}

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  channel: string;
  created_at: string;
  updated_at: string;
}

// Get platform settings
export const getPlatformSettings = async (): Promise<PlatformSettings | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from("platform_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as PlatformSettings;
    }
  } catch (err) {
    console.error("Error fetching platform settings:", err);
  }

  // Fallback
  return {
    id: "fallback-id",
    commission_percent: 10.0,
    homepage_banners: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
    ],
    featured_cities: ["Kolhapur", "Pune", "Mumbai", "Delhi", "Bangalore"],
    maintenance_mode: false,
    featured_listing_price: 500,
    referral_reward_amount: 100,
    min_rent_price: 500,
    max_rent_price: 100000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

// Update platform settings
export const updatePlatformSettings = async (
  updates: Partial<Omit<PlatformSettings, "id" | "created_at" | "updated_at">>
): Promise<{ success: boolean; data?: PlatformSettings; error?: string }> => {
  try {
    const current = await getPlatformSettings();
    if (!current) {
      throw new Error("No settings found to update");
    }

    const { data, error } = await (supabase as any)
      .from("platform_settings")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", current.id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as PlatformSettings };
  } catch (err: any) {
    console.error("Error updating platform settings:", err);
    return { success: false, error: err.message };
  }
};

// Get a static page by slug
export const getStaticPageBySlug = async (slug: string): Promise<StaticPage | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from("static_pages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      return data as StaticPage;
    }
  } catch (err) {
    console.error(`Error fetching static page ${slug}:`, err);
  }
  return null;
};

// Get all static pages
export const getAllStaticPages = async (): Promise<StaticPage[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from("static_pages")
      .select("*")
      .order("title");

    if (!error && data) {
      return data as StaticPage[];
    }
  } catch (err) {
    console.error("Error fetching static pages:", err);
  }
  return [];
};

// Update static page
export const updateStaticPage = async (
  slug: string,
  updates: { title: string; content: string }
): Promise<{ success: boolean; data?: StaticPage; error?: string }> => {
  try {
    const { data, error } = await (supabase as any)
      .from("static_pages")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("slug", slug)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as StaticPage };
  } catch (err: any) {
    console.error(`Error updating static page ${slug}:`, err);
    return { success: false, error: err.message };
  }
};

// Get all notification templates
export const getAllNotificationTemplates = async (): Promise<NotificationTemplate[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from("notification_templates")
      .select("*")
      .order("name");

    if (!error && data) {
      return data as NotificationTemplate[];
    }
  } catch (err) {
    console.error("Error fetching notification templates:", err);
  }
  return [];
};

// Update notification template
export const updateNotificationTemplate = async (
  name: string,
  updates: { subject: string | null; body: string }
): Promise<{ success: boolean; data?: NotificationTemplate; error?: string }> => {
  try {
    const { data, error } = await (supabase as any)
      .from("notification_templates")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("name", name)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as NotificationTemplate };
  } catch (err: any) {
    console.error(`Error updating notification template ${name}:`, err);
    return { success: false, error: err.message };
  }
};
