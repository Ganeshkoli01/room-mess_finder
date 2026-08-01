import { supabase } from "@/integrations/supabase/client";

export interface Report {
  id: string;
  reporter_id: string;
  target_type: "listing" | "user" | "review";
  target_id: string;
  reason: string;
  status: "open" | "resolved";
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  listing_id: string;
  listing_type: "room" | "mess";
  rating: number;
  comment: string;
  status: "approved" | "pending" | "flagged";
  created_at: string;
  owner_reply?: string | null;
  owner_replied_at?: string | null;
}

// ----------------------------------------------------
// REPORTS SERVICE
// ----------------------------------------------------

export const getReports = async (): Promise<Report[]> => {
  try {
    const { data, error } = await supabase
      .from("reports" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Sync to local storage
    if (data) {
      localStorage.setItem("rm_reports", JSON.stringify(data));
      return data as unknown as Report[];
    }
  } catch (err) {
    console.warn("Using local storage fallback for reports:", err);
  }

  // Fallback
  return JSON.parse(localStorage.getItem("rm_reports") || "[]");
};

export const createReport = async (
  reporterId: string,
  targetType: "listing" | "user" | "review",
  targetId: string,
  reason: string
): Promise<Report | null> => {
  const newReport: Omit<Report, "id" | "created_at"> = {
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    status: "open"
  };

  try {
    const { data, error } = await supabase
      .from("reports" as any)
      .insert([newReport])
      .select()
      .single();

    if (error) throw error;
    if (data) return data as unknown as Report;
  } catch (err) {
    console.warn("Saving report to local storage fallback:", err);
  }

  // Local storage fallback
  const reports = JSON.parse(localStorage.getItem("rm_reports") || "[]");
  const fallbackReport: Report = {
    ...newReport,
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    created_at: new Date().toISOString()
  };
  reports.unshift(fallbackReport);
  localStorage.setItem("rm_reports", JSON.stringify(reports));
  return fallbackReport;
};

export const resolveReport = async (reportId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("reports" as any)
      .update({ status: "resolved" })
      .eq("id", reportId);

    if (error) throw error;
  } catch (err) {
    console.warn("Updating report in local storage fallback:", err);
  }

  // Local storage fallback
  const reports = JSON.parse(localStorage.getItem("rm_reports") || "[]");
  const updated = reports.map((r: any) =>
    r.id === reportId ? { ...r, status: "resolved" } : r
  );
  localStorage.setItem("rm_reports", JSON.stringify(updated));
  return true;
};

// ----------------------------------------------------
// REVIEWS SERVICE
// ----------------------------------------------------

export const getReviews = async (): Promise<Review[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (data) {
      localStorage.setItem("rm_reviews", JSON.stringify(data));
      return data as unknown as Review[];
    }
  } catch (err) {
    console.warn("Using local storage fallback for reviews:", err);
  }

  return JSON.parse(localStorage.getItem("rm_reviews") || "[]");
};

export const updateReviewStatus = async (
  reviewId: string,
  status: "approved" | "pending" | "flagged"
): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from("reviews")
      .update({ status })
      .eq("id", reviewId);

    if (error) throw error;
  } catch (err) {
    console.warn("Updating review status in local storage fallback:", err);
  }

  const reviews = JSON.parse(localStorage.getItem("rm_reviews") || "[]");
  const updated = reviews.map((r: any) =>
    r.id === reviewId ? { ...r, status } : r
  );
  localStorage.setItem("rm_reviews", JSON.stringify(updated));
  return true;
};

export const editReview = async (
  reviewId: string,
  comment: string,
  rating: number
): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from("reviews")
      .update({ comment, rating })
      .eq("id", reviewId);

    if (error) throw error;
  } catch (err) {
    console.warn("Editing review in local storage fallback:", err);
  }

  const reviews = JSON.parse(localStorage.getItem("rm_reviews") || "[]");
  const updated = reviews.map((r: any) =>
    r.id === reviewId ? { ...r, comment, rating } : r
  );
  localStorage.setItem("rm_reviews", JSON.stringify(updated));
  return true;
};

export const deleteReview = async (reviewId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (error) throw error;
  } catch (err) {
    console.warn("Deleting review from local storage fallback:", err);
  }

  const reviews = JSON.parse(localStorage.getItem("rm_reviews") || "[]");
  const updated = reviews.filter((r: any) => r.id !== reviewId);
  localStorage.setItem("rm_reviews", JSON.stringify(updated));
  return true;
};

// ----------------------------------------------------
// USER BANNING SERVICE
// ----------------------------------------------------

export const banUser = async (userId: string, isBanned: boolean): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ is_banned: isBanned })
      .eq("user_id", userId);

    if (error) throw error;
  } catch (err) {
    console.warn("Banning user in local storage fallback:", err);
  }

  return true;
};

export const createReview = async (
  userId: string,
  listingId: string,
  listingType: "room" | "mess",
  rating: number,
  comment: string
): Promise<Review | null> => {
  const newReview: Omit<Review, "id" | "created_at"> = {
    user_id: userId,
    listing_id: listingId,
    listing_type: listingType,
    rating,
    comment,
    status: "approved"
  };

  try {
    const { data, error } = await (supabase as any)
      .from("reviews")
      .insert([newReview])
      .select()
      .single();

    if (error) throw error;
    if (data) return data as unknown as Review;
  } catch (err) {
    console.warn("Saving review to local storage fallback:", err);
  }

  // Local storage fallback
  const reviews = JSON.parse(localStorage.getItem("rm_reviews") || "[]");
  const fallbackReview: Review = {
    ...newReview,
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    created_at: new Date().toISOString()
  };
  reviews.unshift(fallbackReview);
  localStorage.setItem("rm_reviews", JSON.stringify(reviews));
  return fallbackReview;
};

// Owner: reply to a review
export const replyToReview = async (reviewId: string, reply: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from("reviews")
      .update({
        owner_reply: reply,
        owner_replied_at: new Date().toISOString()
      })
      .eq("id", reviewId);

    if (error) throw error;
  } catch (err) {
    console.warn("Failed to reply to review in DB, using local fallback:", err);
  }

  // Local storage sync
  const reviews = JSON.parse(localStorage.getItem("rm_reviews") || "[]");
  const updated = reviews.map((r: any) =>
    r.id === reviewId
      ? { ...r, owner_reply: reply, owner_replied_at: new Date().toISOString() }
      : r
  );
  localStorage.setItem("rm_reviews", JSON.stringify(updated));
  return true;
};

// Owner: delete reply to a review
export const deleteReviewReply = async (reviewId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from("reviews")
      .update({
        owner_reply: null,
        owner_replied_at: null
      })
      .eq("id", reviewId);

    if (error) throw error;
  } catch (err) {
    console.warn("Failed to delete review reply in DB, using local fallback:", err);
  }

  // Local storage sync
  const reviews = JSON.parse(localStorage.getItem("rm_reviews") || "[]");
  const updated = reviews.map((r: any) =>
    r.id === reviewId
      ? { ...r, owner_reply: null, owner_replied_at: null }
      : r
  );
  localStorage.setItem("rm_reviews", JSON.stringify(updated));
  return true;
};
