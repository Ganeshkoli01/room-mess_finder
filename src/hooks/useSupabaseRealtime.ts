// Supabase Realtime Hook
// Provides real-time subscriptions for enquiries, bookings, and notifications

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addNotification } from "@/services/notificationService";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Types
export interface RealtimeEnquiry {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    user_phone?: string;
    listing_id: string;
    listing_type: "room" | "mess";
    listing_title: string;
    owner_id: string;
    message: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface RealtimeBooking {
    id: string;
    user_id: string;
    listing_id: string;
    listing_type: string;
    listing_title: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
}

// =============================================
// REALTIME ENQUIRIES HOOK (For Owners)
// =============================================

export const useRealtimeEnquiries = (ownerId: string | null) => {
    const [enquiries, setEnquiries] = useState<RealtimeEnquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEnquiryCount, setNewEnquiryCount] = useState(0);
    const { toast } = useToast();

    // Fetch initial enquiries
    const fetchEnquiries = useCallback(async () => {
        if (!ownerId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("enquiries" as any)
                .select("*")
                .eq("owner_id", ownerId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setEnquiries((data as RealtimeEnquiry[]) || []);
        } catch (err) {
            console.error("Error fetching enquiries:", err);
        } finally {
            setLoading(false);
        }
    }, [ownerId]);

    useEffect(() => {
        fetchEnquiries();

        if (!ownerId) return;

        // Subscribe to realtime changes
        const channel: RealtimeChannel = supabase
            .channel(`owner-enquiries-${ownerId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "enquiries",
                    filter: `owner_id=eq.${ownerId}`,
                },
                (payload: RealtimePostgresChangesPayload<RealtimeEnquiry>) => {
                    const newEnquiry = payload.new as RealtimeEnquiry;

                    // Add to list
                    setEnquiries((prev) => [newEnquiry, ...prev]);
                    setNewEnquiryCount((prev) => prev + 1);

                    // Show toast notification
                    toast({
                        title: "🔔 New Enquiry!",
                        description: `${newEnquiry.user_name} is interested in your ${newEnquiry.listing_type}`,
                    });

                    // Add to notification center
                    addNotification({
                        type: "new_enquiry",
                        title: "New Enquiry Received!",
                        message: `${newEnquiry.user_name} sent an enquiry for ${newEnquiry.listing_title}`,
                    });

                    // Play notification sound (optional)
                    playNotificationSound();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "enquiries",
                    filter: `owner_id=eq.${ownerId}`,
                },
                (payload: RealtimePostgresChangesPayload<RealtimeEnquiry>) => {
                    const updatedEnquiry = payload.new as RealtimeEnquiry;

                    // Update in list
                    setEnquiries((prev) =>
                        prev.map((e) => (e.id === updatedEnquiry.id ? updatedEnquiry : e))
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ownerId, fetchEnquiries, toast]);

    const clearNewCount = () => setNewEnquiryCount(0);

    return { enquiries, loading, newEnquiryCount, clearNewCount, refresh: fetchEnquiries };
};

// =============================================
// REALTIME USER ENQUIRIES HOOK (For Users)
// =============================================

export const useRealtimeUserEnquiries = (userId: string | null) => {
    const [enquiries, setEnquiries] = useState<RealtimeEnquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchEnquiries = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("enquiries" as any)
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setEnquiries((data as RealtimeEnquiry[]) || []);
        } catch (err) {
            console.error("Error fetching user enquiries:", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchEnquiries();

        if (!userId) return;

        // Subscribe to status updates on user's enquiries
        const channel = supabase
            .channel(`user-enquiries-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "enquiries",
                    filter: `user_id=eq.${userId}`,
                },
                (payload: RealtimePostgresChangesPayload<RealtimeEnquiry>) => {
                    const updated = payload.new as RealtimeEnquiry;
                    const old = payload.old as Partial<RealtimeEnquiry>;

                    // Check if status changed
                    if (old.status !== updated.status) {
                        // Update list
                        setEnquiries((prev) =>
                            prev.map((e) => (e.id === updated.id ? updated : e))
                        );

                        // Notify user of status change
                        if (updated.status === "approved") {
                            toast({
                                title: "🎉 Enquiry Approved!",
                                description: `Your enquiry for ${updated.listing_title} has been approved!`,
                            });
                            addNotification({
                                type: "status_update",
                                title: "Enquiry Approved! 🎉",
                                message: `Your enquiry for ${updated.listing_title} has been approved. You can now book!`,
                            });
                        } else if (updated.status === "rejected") {
                            toast({
                                title: "Enquiry Update",
                                description: `Your enquiry for ${updated.listing_title} was not accepted.`,
                                variant: "destructive",
                            });
                        } else if (updated.status === "contacted") {
                            toast({
                                title: "Owner Contacted You",
                                description: `The owner of ${updated.listing_title} has viewed your enquiry.`,
                            });
                        }

                        playNotificationSound();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, fetchEnquiries, toast]);

    return { enquiries, loading, refresh: fetchEnquiries };
};

// =============================================
// REALTIME BOOKINGS HOOK
// =============================================

export const useRealtimeBookings = (userId: string | null, asOwner = false) => {
    const [bookings, setBookings] = useState<RealtimeBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchBookings = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const query = supabase
                .from("bookings")
                .select("*")
                .order("created_at", { ascending: false });

            if (asOwner) {
                query.eq("owner_id", userId);
            } else {
                query.eq("user_id", userId);
            }

            const { data, error } = await query;
            if (error) throw error;
            setBookings((data as RealtimeBooking[]) || []);
        } catch (err) {
            console.error("Error fetching bookings:", err);
        } finally {
            setLoading(false);
        }
    }, [userId, asOwner]);

    useEffect(() => {
        fetchBookings();

        if (!userId) return;

        const filterColumn = asOwner ? "owner_id" : "user_id";

        const channel = supabase
            .channel(`bookings-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "bookings",
                    filter: `${filterColumn}=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        const newBooking = payload.new as RealtimeBooking;
                        setBookings((prev) => [newBooking, ...prev]);

                        if (asOwner) {
                            toast({
                                title: "🏠 New Booking!",
                                description: `New booking received for ${newBooking.listing_title}`,
                            });
                        } else {
                            toast({
                                title: "Booking Confirmed!",
                                description: `Your booking for ${newBooking.listing_title} is confirmed.`,
                            });
                        }
                    } else if (payload.eventType === "UPDATE") {
                        const updated = payload.new as RealtimeBooking;
                        setBookings((prev) =>
                            prev.map((b) => (b.id === updated.id ? updated : b))
                        );

                        if (updated.payment_status === "paid") {
                            toast({
                                title: "💰 Payment Received!",
                                description: `Payment confirmed for ${updated.listing_title}`,
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, asOwner, fetchBookings, toast]);

    return { bookings, loading, refresh: fetchBookings };
};

// =============================================
// REALTIME NOTIFICATION COUNT HOOK
// =============================================

export const useRealtimeNotificationCount = (userId: string | null) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!userId) return;

        // Count pending enquiries (for owners) or status changes (for users)
        const fetchCount = async () => {
            try {
                const { count } = await supabase
                    .from("enquiries" as any)
                    .select("*", { count: "exact", head: true })
                    .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
                    .eq("status", "pending");

                setUnreadCount(count || 0);
            } catch (err) {
                console.error("Error fetching notification count:", err);
            }
        };

        fetchCount();

        // Subscribe to changes
        const channel = supabase
            .channel(`notifications-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "enquiries",
                },
                () => {
                    fetchCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return { unreadCount };
};

// =============================================
// HELPER FUNCTIONS
// =============================================

const playNotificationSound = () => {
    try {
        // Create a simple notification sound using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.value = 0.1;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (err) {
        // Audio not supported or blocked, ignore
    }
};

// =============================================
// REALTIME PRESENCE (Optional - for "online" status)
// =============================================

export const useRealtimePresence = (userId: string | null, roomId: string) => {
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase.channel(roomId, {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                const users = Object.keys(state);
                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, roomId]);

    return { onlineUsers, isOnline: onlineUsers.includes(userId || "") };
};

export default {
    useRealtimeEnquiries,
    useRealtimeUserEnquiries,
    useRealtimeBookings,
    useRealtimeNotificationCount,
    useRealtimePresence,
};
