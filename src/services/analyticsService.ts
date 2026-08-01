import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export interface TimeSeriesPoint {
  day: string;
  count: number;
}

export interface RevenuePoint {
  period_start: string;
  total_commission: number;
}

export interface TopCityPoint {
  city: string;
  searches: number;
}

// 1. Fetch Signups Over Time
export const fetchSignupsOverTime = async (daysBack: number = 30): Promise<TimeSeriesPoint[]> => {
  try {
    const { data, error } = await supabase.rpc("get_signups_over_time", { days_back: daysBack });
    if (error) throw error;
    return (data || []).map((item: any) => ({
      day: item.day,
      count: Number(item.count || 0),
    }));
  } catch (err) {
    console.error("Error fetching signups over time:", err);
    return [];
  }
};

// 2. Fetch Listings Over Time
export const fetchListingsOverTime = async (daysBack: number = 30): Promise<TimeSeriesPoint[]> => {
  try {
    const { data, error } = await supabase.rpc("get_listings_over_time", { days_back: daysBack });
    if (error) throw error;
    return (data || []).map((item: any) => ({
      day: item.day,
      count: Number(item.count || 0),
    }));
  } catch (err) {
    console.error("Error fetching listings over time:", err);
    return [];
  }
};

// 3. Fetch Bookings Over Time
export const fetchBookingsOverTime = async (daysBack: number = 30): Promise<TimeSeriesPoint[]> => {
  try {
    const { data, error } = await supabase.rpc("get_bookings_over_time", { days_back: daysBack });
    if (error) throw error;
    return (data || []).map((item: any) => ({
      day: item.day,
      count: Number(item.count || 0),
    }));
  } catch (err) {
    console.error("Error fetching bookings over time:", err);
    return [];
  }
};

// 4. Fetch Revenue By Period
export const fetchRevenueByPeriod = async (period: string = "day"): Promise<RevenuePoint[]> => {
  try {
    const { data, error } = await supabase.rpc("get_revenue_by_period", { period });
    if (error) throw error;
    return (data || []).map((item: any) => ({
      period_start: item.period_start,
      total_commission: Number(item.total_commission || 0),
    }));
  } catch (err) {
    console.error("Error fetching revenue by period:", err);
    return [];
  }
};

// 5. Fetch Top Searched Cities
export const fetchTopSearchedCities = async (limitCount: number = 10): Promise<TopCityPoint[]> => {
  try {
    const { data, error } = await supabase.rpc("get_top_searched_cities", { limit_count: limitCount });
    if (error) throw error;
    return (data || []).map((item: any) => ({
      city: item.city,
      searches: Number(item.searches || 0),
    }));
  } catch (err) {
    console.error("Error fetching top searched cities:", err);
    return [];
  }
};

// 6. Fetch Active Sessions Count (Last 15 minutes)
export const fetchActiveSessionsCount = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc("get_active_sessions_count");
    if (error) throw error;
    return Number(data || 0);
  } catch (err) {
    console.error("Error fetching active sessions count:", err);
    return 0;
  }
};

// 7. Log City Search
export const logCitySearch = async (city: string) => {
  if (!city || !city.trim()) return;
  try {
    await supabase.from("search_logs").insert({
      city: city.trim(),
      searched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error logging city search:", err);
  }
};

// 8. Update Last Active At timestamp for current user
export const updateLastActiveAt = async (userId: string) => {
  if (!userId) return;
  try {
    await supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (err) {
    console.error("Error updating last active at:", err);
  }
};
