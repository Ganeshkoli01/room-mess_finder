// Subscription & Booking Expiry Notification Service
// Automatically checks mess subscriptions and room bookings for expiration,
// updates status, and dispatches in-app, push, and toast notifications.

import { supabase } from "@/integrations/supabase/client";
import { addNotification, getCurrentUserId } from "./notificationService";
import { sendPushNotification } from "./pushNotificationService";
import { toast } from "@/components/ui/use-toast";

interface CheckExpiryResult {
    expiredSubscriptionsCount: number;
    expiredBookingsCount: number;
    newlyNotifiedCount: number;
}

/**
 * Checks all active mess subscriptions and room bookings for the user.
 * If expired (end_date < now or > 30 days past booking start), marks as expired
 * and dispatches notifications to the user.
 */
export const checkAndNotifyExpiredSubscriptions = async (
    targetUserId?: string
): Promise<CheckExpiryResult> => {
    const currentUserId = targetUserId || getCurrentUserId();
    if (!currentUserId) {
        return { expiredSubscriptionsCount: 0, expiredBookingsCount: 0, newlyNotifiedCount: 0 };
    }

    let newlyNotifiedCount = 0;
    let expiredSubscriptionsCount = 0;
    let expiredBookingsCount = 0;

    const now = new Date();

    try {
        // ------------------------------------------------------------------
        // 1. MESS SUBSCRIPTIONS EXPIRY CHECK
        // ------------------------------------------------------------------
        // Read local storage subscriptions
        let localSubs: any[] = [];
        try {
            const raw = localStorage.getItem("rm_subscriptions");
            if (raw) localSubs = JSON.parse(raw);
        } catch (e) {
            localSubs = [];
        }

        // Fetch user subscriptions from Supabase
        const { data: dbSubsData } = await (supabase as any)
            .from("mess_subscriptions")
            .select("*, mess:mess_id(name)")
            .eq("user_id", currentUserId);

        const dbSubs = (dbSubsData || []).map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            messId: s.mess_id,
            messTitle: s.mess?.name || "Mess Subscription",
            planType: s.plan_type || "monthly",
            startDate: new Date(s.start_date),
            endDate: new Date(s.end_date),
            amount: s.amount_paid,
            status: s.status,
            createdAt: new Date(s.created_at || s.start_date),
        }));

        // Merge local and remote subscriptions
        const subMap = new Map<string, any>();
        localSubs.filter(s => s.userId === currentUserId).forEach(s => subMap.set(s.id, s));
        dbSubs.forEach(s => subMap.set(s.id, s));

        const allUserSubs = Array.from(subMap.values());

        for (const sub of allUserSubs) {
            // Determine end date
            let endDate: Date;
            if (sub.endDate) {
                endDate = new Date(sub.endDate);
            } else if (sub.startDate) {
                const start = new Date(sub.startDate);
                const durationDays = sub.planType === "weekly" ? 7 : sub.planType === "daily" ? 1 : 30;
                endDate = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
            } else {
                continue;
            }

            const isExpired = now.getTime() > endDate.getTime();

            if (isExpired) {
                expiredSubscriptionsCount++;

                // Update local storage status
                sub.status = "expired";
                const allLocal = localSubs.map(s => s.id === sub.id ? { ...s, status: "expired" } : s);
                localStorage.setItem("rm_subscriptions", JSON.stringify(allLocal));

                // Update Supabase DB status
                try {
                    await (supabase as any)
                        .from("mess_subscriptions")
                        .update({ status: "expired" })
                        .eq("id", sub.id);
                } catch (dbErr) {
                    console.error("Error updating mess subscription status to expired:", dbErr);
                }

                // Deduplicate notification: check if already notified
                const notifKey = `rm_notified_expired_mess_${sub.id}`;
                if (!localStorage.getItem(notifKey)) {
                    localStorage.setItem(notifKey, new Date().toISOString());
                    newlyNotifiedCount++;

                    const formattedEndDate = endDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });

                    // 1. Create In-App Notification
                    addNotification({
                        type: "subscription_expired",
                        title: "Mess Subscription Expired ⚠️",
                        message: `Your monthly subscription for "${sub.messTitle || 'Mess Subscription'}" expired on ${formattedEndDate}. Please renew your plan to continue your mess service.`,
                        actionUrl: `/mess/${sub.messId || ''}`,
                        data: {
                            subscriptionId: sub.id,
                            listingType: "mess",
                            messTitle: sub.messTitle,
                            expiredAt: endDate.toISOString(),
                        }
                    }, currentUserId);

                    // 2. Trigger Push Notification if supported
                    try {
                        sendPushNotification(currentUserId, "REMINDER", {
                            title: "Mess Subscription Expired ⚠️",
                            body: `Your subscription for ${sub.messTitle} has expired. Tap to renew.`
                        });
                    } catch (pushErr) {
                        console.log("Push notification fallback:", pushErr);
                    }

                    // 3. UI Toast Alert
                    toast({
                        title: "Mess Subscription Expired ⚠️",
                        description: `Your subscription for "${sub.messTitle}" has expired (${formattedEndDate}). Please renew to stay subscribed.`,
                        variant: "destructive",
                    });
                }
            }
        }

        // ------------------------------------------------------------------
        // 2. ROOM BOOKINGS EXPIRY CHECK
        // ------------------------------------------------------------------
        let localBookings: any[] = [];
        try {
            const rawB = localStorage.getItem("rm_bookings");
            if (rawB) localBookings = JSON.parse(rawB);
        } catch (e) {
            localBookings = [];
        }

        const { data: dbBookingsData } = await supabase
            .from("bookings")
            .select("*")
            .eq("user_id", currentUserId);

        const dbBookings = (dbBookingsData || []).map((b: any) => ({
            id: b.id,
            userId: b.user_id,
            listingId: b.listing_id,
            listingType: b.listing_type || "room",
            listingTitle: b.message || "Room Stay",
            startDate: new Date(b.created_at),
            status: b.status,
            createdAt: new Date(b.created_at),
        }));

        const bookingMap = new Map<string, any>();
        localBookings.filter(b => b.userId === currentUserId).forEach(b => bookingMap.set(b.id, b));
        dbBookings.forEach(b => bookingMap.set(b.id, b));

        const allUserBookings = Array.from(bookingMap.values());

        for (const booking of allUserBookings) {
            let endDate: Date;
            if (booking.endDate) {
                endDate = new Date(booking.endDate);
            } else {
                const start = new Date(booking.startDate || booking.createdAt || Date.now());
                endDate = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days monthly stay
            }

            const isExpired = now.getTime() > endDate.getTime();

            if (isExpired) {
                expiredBookingsCount++;

                // Update local storage status
                booking.status = "expired";
                const allLocalB = localBookings.map(b => b.id === booking.id ? { ...b, status: "expired" } : b);
                localStorage.setItem("rm_bookings", JSON.stringify(allLocalB));

                // Update Supabase DB status
                try {
                    await (supabase as any)
                        .from("bookings")
                        .update({ status: "expired" })
                        .eq("id", booking.id);
                } catch (dbErr) {
                    console.error("Error updating room booking status to expired:", dbErr);
                }

                // Deduplicate notification
                const notifKey = `rm_notified_expired_room_${booking.id}`;
                if (!localStorage.getItem(notifKey)) {
                    localStorage.setItem(notifKey, new Date().toISOString());
                    newlyNotifiedCount++;

                    const formattedEndDate = endDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });

                    // 1. In-App Notification
                    addNotification({
                        type: "subscription_expired",
                        title: "Room Booking/Stay Expired ⚠️",
                        message: `Your monthly room stay for "${booking.listingTitle || 'Room Stay'}" expired on ${formattedEndDate}. Please extend your stay or contact the owner.`,
                        actionUrl: `/rooms/${booking.listingId || ''}`,
                        data: {
                            bookingId: booking.id,
                            listingType: "room",
                            listingTitle: booking.listingTitle,
                            expiredAt: endDate.toISOString(),
                        }
                    }, currentUserId);

                    // 2. Push Notification
                    try {
                        sendPushNotification(currentUserId, "REMINDER", {
                            title: "Room Stay Expired ⚠️",
                            body: `Your room booking for ${booking.listingTitle} has expired. Tap to view details.`
                        });
                    } catch (pushErr) {
                        console.log("Push notification fallback:", pushErr);
                    }

                    // 3. UI Toast Alert
                    toast({
                        title: "Room Stay Expired ⚠️",
                        description: `Your monthly booking for "${booking.listingTitle}" has expired (${formattedEndDate}). Please extend your booking.`,
                        variant: "destructive",
                    });
                }
            }
        }

    } catch (err) {
        console.error("Error checking expired subscriptions:", err);
    }

    return {
        expiredSubscriptionsCount,
        expiredBookingsCount,
        newlyNotifiedCount
    };
};

export default {
    checkAndNotifyExpiredSubscriptions
};
