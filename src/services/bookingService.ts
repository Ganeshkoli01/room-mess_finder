// Enquiry & Booking Service
// Handles enquiries, bookings for rooms, and subscriptions for mess

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { addNotification, getNotifications, notificationTemplates } from "./notificationService";
import { notifyOwner, EnquiryNotificationData } from "./ownerNotificationService";

// Types
export interface Enquiry {
    id: string;
    userId: string;
    listingId: string;
    listingType: "room" | "mess";
    listingTitle: string;
    ownerId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    message: string;
    status: "pending" | "approved" | "rejected" | "booked";
    createdAt: Date;
    updatedAt: Date;
    ownerResponse?: string;
    respondedAt?: Date;
}

export interface Booking {
    id: string;
    enquiryId: string;
    userId: string;
    listingId: string;
    listingType: "room" | "mess";
    listingTitle: string;
    startDate: Date;
    endDate?: Date;
    amount: number;
    status: "confirmed" | "cancelled" | "completed";
    paymentStatus: "pending" | "paid" | "refunded";
    createdAt: Date;
    ownerId?: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
}

export interface MessSubscription {
    id: string;
    userId: string;
    messId: string;
    messTitle: string;
    planType: "daily" | "weekly" | "monthly";
    startDate: Date;
    endDate: Date;
    amount: number;
    status: "active" | "paused" | "cancelled" | "expired";
    mealTypes: string[]; // ["breakfast", "lunch", "dinner"]
    createdAt: Date;
}

export interface OwnerSubscription {
    id: string;
    userId: string;
    messId: string;
    messTitle: string;
    userName: string;
    userPhone: string;
    planType: "daily" | "weekly" | "monthly";
    startDate: Date;
    endDate: Date;
    amount: number;
    status: "active" | "paused" | "cancelled" | "expired";
    createdAt: Date;
}

export interface OwnerRoomBooking {
    id: string;
    userId: string;
    listingId: string;
    listingTitle: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    amount: number;
    status: string;
    createdAt: Date;
}

interface SupabaseEnquiryRow {
    id: string;
    user_id: string;
    listing_id: string;
    listing_type: "room" | "mess";
    listing_title: string;
    owner_id: string;
    user_name: string;
    user_email: string;
    user_phone?: string;
    message: string;
    status: "pending" | "approved" | "rejected" | "booked";
    created_at: string;
    updated_at: string;
    owner_response?: string;
    responded_at?: string;
}

interface LocalMessItem {
    id: string;
    name: string;
    owner_id?: string;
    ownerId?: string;
}

interface LocalRoomItem {
    id: string;
    title: string;
    owner_id?: string;
    ownerId?: string;
}

// Storage keys
const ENQUIRIES_KEY = "rm_enquiries";
const DELETED_ENQUIRIES_KEY = "rm_deleted_enquiries";
const BOOKINGS_KEY = "rm_bookings";
const SUBSCRIPTIONS_KEY = "rm_subscriptions";

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ================== ENQUIRY FUNCTIONS ==================

export const createEnquiry = async (data: {
    userId: string;
    listingId: string;
    listingType: "room" | "mess";
    listingTitle: string;
    ownerId: string;
    ownerEmail?: string;
    ownerPhone?: string;
    ownerWhatsApp?: string;
    ownerName?: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    message: string;
}): Promise<{ success: boolean; enquiryId?: string; error?: string }> => {
    try {
        // Try to save to Supabase enquiries table first
        const { data: dbData, error } = await (supabase as any)
            .from("enquiries" as any)
            .insert({
                user_id: data.userId,
                user_name: data.userName,
                user_email: data.userEmail,
                user_phone: data.userPhone || null,
                listing_id: data.listingId,
                listing_type: data.listingType,
                listing_title: data.listingTitle,
                owner_id: data.ownerId,
                owner_email: data.ownerEmail || null,
                owner_phone: data.ownerPhone || null,
                owner_whatsapp: data.ownerWhatsApp || null,
                message: data.message,
                status: "pending",
                source: "web",
                ai_processed: false,
            })
            .select()
            .single();

        let enquiryId: string;

        // Insert into bookings table for Owner Dashboard
        try {
            await (supabase as any)
                .from("bookings")
                .insert({
                    user_id: data.userId,
                    listing_id: data.listingId,
                    listing_type: data.listingType,
                    owner_id: data.ownerId,
                    user_name: data.userName,
                    user_email: data.userEmail,
                    user_phone: data.userPhone || null,
                    message: data.message,
                    status: "pending",
                    check_in_date: new Date().toISOString().split("T")[0],
                    check_out_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    created_at: new Date().toISOString(),
                });
        } catch (e) {
            console.warn("Could not insert directly to bookings table:", e);
        }

        if (!error && dbData) {
            enquiryId = dbData.id;
            logger.info("Enquiry saved to Supabase enquiries table");
            // Always sync to local cache as well
            saveEnquiryLocal(data, enquiryId);
        } else {
            // Fallback: Try local storage
            logger.warn("Enquiries table insert failed or fallback used", { data: error });
            const localResult = saveEnquiryLocal(data);
            if (!localResult.success) {
                return localResult;
            }
            enquiryId = localResult.enquiryId!;
        }

        // Send notifications to owner (WhatsApp + Email)
        if (data.ownerEmail || data.ownerPhone || data.ownerWhatsApp) {
            const notificationData = {
                enquiryId,
                userName: data.userName,
                userEmail: data.userEmail,
                userPhone: data.userPhone,
                message: data.message,
                listingId: data.listingId,
                listingType: data.listingType,
                listingTitle: data.listingTitle,
                ownerName: data.ownerName || "Property Owner",
                ownerEmail: data.ownerEmail || "",
                ownerPhone: data.ownerPhone,
                ownerWhatsApp: data.ownerWhatsApp,
            };

            // Send notifications asynchronously (don't block the response)
            notifyOwner(notificationData).then(result => {
                logger.info("Owner notifications sent", { data: result });
            }).catch(err => {
                console.error("Failed to send owner notifications:", err);
            });
        }

        // Add user notification
        addNotification(notificationTemplates.bookingConfirmation(data.listingTitle), data.userId);

        return { success: true, enquiryId };
    } catch (err: unknown) {
        logger.error("Error creating enquiry");
        // Fallback to localStorage
        return saveEnquiryLocal(data);
    }
};

const saveEnquiryLocal = (
    data: {
        userId: string;
        listingId: string;
        listingType: "room" | "mess";
        listingTitle: string;
        ownerId: string;
        userName: string;
        userEmail: string;
        userPhone?: string;
        message: string;
    },
    existingId?: string
): { success: boolean; enquiryId?: string; error?: string } => {
    try {
        const enquiries = getEnquiriesLocal();
        const enquiryId = existingId || generateId();

        // Avoid duplicate entries
        if (enquiries.some((e) => e.id === enquiryId)) {
            return { success: true, enquiryId };
        }

        const newEnquiry: Enquiry = {
            id: enquiryId,
            userId: data.userId,
            listingId: data.listingId,
            listingType: data.listingType,
            listingTitle: data.listingTitle,
            ownerId: data.ownerId,
            userName: data.userName,
            userEmail: data.userEmail,
            userPhone: data.userPhone,
            message: data.message,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        enquiries.unshift(newEnquiry);
        localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(enquiries));

        // Add notification
        addNotification(notificationTemplates.bookingConfirmation(data.listingTitle), data.userId);

        logger.info("Enquiry saved locally", { data: { id: newEnquiry.id } });
        return { success: true, enquiryId: newEnquiry.id };
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMsg };
    }
};

export const getEnquiriesLocal = (): Enquiry[] => {
    try {
        const data = localStorage.getItem(ENQUIRIES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const getDeletedEnquiryIds = (): string[] => {
    try {
        const data = localStorage.getItem(DELETED_ENQUIRIES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const getUserEnquiries = (userId: string, userEmail?: string): Enquiry[] => {
    const deletedIds = getDeletedEnquiryIds();
    const enquiries = getEnquiriesLocal();
    return enquiries.filter(
        (e) =>
            !deletedIds.includes(e.id) &&
            (e.userId === userId || (userEmail && e.userEmail?.toLowerCase() === userEmail.toLowerCase()))
    );
};

export const deleteEnquiry = async (enquiryId: string): Promise<boolean> => {
    try {
        // 1. Save to deleted IDs blacklist
        const deletedIds = getDeletedEnquiryIds();
        if (!deletedIds.includes(enquiryId)) {
            deletedIds.push(enquiryId);
            localStorage.setItem(DELETED_ENQUIRIES_KEY, JSON.stringify(deletedIds));
        }

        // 2. Remove from active local storage
        const enquiries = getEnquiriesLocal();
        const updated = enquiries.filter((e) => e.id !== enquiryId);
        localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(updated));

        // 3. Delete from Supabase
        try {
            await supabase.from("enquiries" as any).delete().eq("id", enquiryId);
        } catch (err) {
            logger.warn("Could not delete enquiry from Supabase", { data: err });
        }

        return true;
    } catch (err) {
        logger.error("Failed to delete enquiry", err);
        return false;
    }
};

export const fetchUserEnquiries = async (userId: string, userEmail?: string): Promise<Enquiry[]> => {
    const deletedIds = getDeletedEnquiryIds();
    const localEnquiries = getUserEnquiries(userId, userEmail);

    try {
        let query = supabase.from("enquiries" as any).select("*");
        if (userEmail) {
            query = query.or(`user_id.eq.${userId},user_email.eq.${userEmail}`);
        } else {
            query = query.eq("user_id", userId);
        }

        const { data: dbData, error } = await query;

        if (!error && dbData && dbData.length > 0) {
            const rows = dbData as unknown as SupabaseEnquiryRow[];
            const mappedDbEnquiries: Enquiry[] = rows
                .filter((item) => !deletedIds.includes(item.id))
                .map((item) => ({
                    id: item.id,
                    userId: item.user_id,
                    listingId: item.listing_id,
                    listingType: item.listing_type,
                    listingTitle: item.listing_title,
                    ownerId: item.owner_id,
                    userName: item.user_name,
                    userEmail: item.user_email,
                    userPhone: item.user_phone || undefined,
                    message: item.message,
                    status: item.status || "pending",
                    ownerResponse: item.owner_response || undefined,
                    respondedAt: item.responded_at ? new Date(item.responded_at) : undefined,
                    createdAt: new Date(item.created_at || Date.now()),
                    updatedAt: new Date(item.updated_at || Date.now()),
                }));

            const enquiryMap = new Map<string, Enquiry>();
            localEnquiries.forEach((e) => enquiryMap.set(e.id, e));
            mappedDbEnquiries.forEach((e) => enquiryMap.set(e.id, e));

            const combined = Array.from(enquiryMap.values())
                .filter((e) => !deletedIds.includes(e.id))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(combined));

            // Generate notification for new replies dynamically
            try {
                const currentNotifications = getNotifications();
                mappedDbEnquiries.forEach(enquiry => {
                    if (enquiry.ownerResponse) {
                        const hasNotif = currentNotifications.some(
                            n => n.data?.enquiryId === enquiry.id && n.type === 'enquiry_response'
                        );
                        if (!hasNotif) {
                            addNotification({
                                type: 'enquiry_response',
                                title: enquiry.status === 'approved' ? 'Enquiry Approved! 🎉' : 'Enquiry Update 💬',
                                message: `The owner of "${enquiry.listingTitle}" responded: "${enquiry.ownerResponse}"`,
                                actionUrl: "/dashboard?tab=enquiries",
                                data: { enquiryId: enquiry.id }
                            }, enquiry.userId);
                        }
                    }
                });
            } catch (err) {
                console.error("Error syncing user response notifications:", err);
            }
            return combined.filter(
                (e) =>
                    !deletedIds.includes(e.id) &&
                    (e.userId === userId || (userEmail && e.userEmail?.toLowerCase() === userEmail.toLowerCase()))
            );
        }
    } catch (err) {
        logger.warn("Could not fetch remote enquiries from Supabase", { data: err });
    }

    return localEnquiries;
};

export const getOwnerEnquiries = (ownerId: string): Enquiry[] => {
    const enquiries = getEnquiriesLocal();
    return enquiries.filter(e => e.ownerId === ownerId);
};

export const fetchOwnerEnquiries = async (ownerId: string): Promise<Enquiry[]> => {
    try {
        const { data: dbData, error } = await supabase
            .from("enquiries" as any)
            .select("*")
            .eq("owner_id", ownerId);

        if (!error && dbData) {
            const rows = dbData as unknown as SupabaseEnquiryRow[];
            const mappedDbEnquiries: Enquiry[] = rows.map((item) => ({
                id: item.id,
                userId: item.user_id,
                listingId: item.listing_id,
                listingType: item.listing_type,
                listingTitle: item.listing_title,
                ownerId: item.owner_id,
                userName: item.user_name,
                userEmail: item.user_email,
                userPhone: item.user_phone || undefined,
                message: item.message,
                status: item.status || "pending",
                ownerResponse: item.owner_response || undefined,
                respondedAt: item.responded_at ? new Date(item.responded_at) : undefined,
                createdAt: new Date(item.created_at || Date.now()),
                updatedAt: new Date(item.updated_at || Date.now()),
            }));

            // Sync to local storage
            const enquiries = getEnquiriesLocal();
            const enquiryMap = new Map<string, Enquiry>();
            enquiries.forEach((e) => enquiryMap.set(e.id, e));
            mappedDbEnquiries.forEach((e) => enquiryMap.set(e.id, e));

            const combined = Array.from(enquiryMap.values());
            localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(combined));

            // Generate notification for new incoming enquiries dynamically
            try {
                const currentNotifications = getNotifications();
                mappedDbEnquiries.forEach(enquiry => {
                    if (enquiry.status === 'pending') {
                        const hasNotif = currentNotifications.some(
                            n => n.data?.enquiryId === enquiry.id && n.type === 'system'
                        );
                        if (!hasNotif) {
                            addNotification({
                                type: 'system',
                                title: 'New Enquiry! 📬',
                                message: `You received a new enquiry for "${enquiry.listingTitle}" from ${enquiry.userName}.`,
                                actionUrl: "/owner/dashboard?tab=enquiries",
                                data: { enquiryId: enquiry.id }
                            }, enquiry.ownerId);
                        }
                    }
                });
            } catch (err) {
                console.error("Error syncing owner incoming notifications:", err);
            }

            return mappedDbEnquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    } catch (err) {
        logger.warn("Could not fetch remote owner enquiries from Supabase", { data: err });
    }

    return getOwnerEnquiries(ownerId);
};

export const replyToEnquiry = async (
    enquiryId: string,
    status: "approved" | "rejected",
    responseMessage: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const respondedAt = new Date().toISOString();
        
        // 1. Update local storage
        const enquiries = getEnquiriesLocal();
        const index = enquiries.findIndex(e => e.id === enquiryId);
        let listingTitle = "listing";
        if (index !== -1) {
            enquiries[index].status = status;
            enquiries[index].ownerResponse = responseMessage;
            enquiries[index].updatedAt = new Date();
            listingTitle = enquiries[index].listingTitle;
            localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(enquiries));
        }

        // 2. Update Supabase
        const { data, error } = await supabase
            .from("enquiries" as any)
            .update({
                status: status,
                owner_response: responseMessage,
                responded_at: respondedAt,
                updated_at: respondedAt
            })
            .eq("id", enquiryId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error("No enquiry was updated in the database. Please check permissions.");
        }

        // 3. Add notifications to user
        const title = status === "approved" ? "Enquiry Approved! 🎉" : "Enquiry Update";
        const message = status === "approved"
            ? `Your enquiry for "${listingTitle}" has been approved. Message: "${responseMessage}"`
            : `Your enquiry for "${listingTitle}" was not accepted. Message: "${responseMessage}"`;

        const targetUserId = index !== -1 ? enquiries[index].userId : ((data?.[0] as any)?.user_id || "");
        addNotification({
            type: "status_update",
            title,
            message,
            actionUrl: "/dashboard?tab=enquiries",
            data: { enquiryId },
        }, targetUserId);

        return { success: true };
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error("Error replying to enquiry:", err);
        return { success: false, error: errorMsg };
    }
};

export const updateEnquiryStatus = (
    enquiryId: string,
    status: "pending" | "approved" | "rejected" | "booked"
): boolean => {
    try {
        const enquiries = getEnquiriesLocal();
        const index = enquiries.findIndex(e => e.id === enquiryId);

        if (index === -1) return false;

        enquiries[index].status = status;
        enquiries[index].updatedAt = new Date();
        localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(enquiries));

        // Add notifications based on status
        if (status === "approved") {
            addNotification({
                type: "status_update",
                title: "Enquiry Approved! 🎉",
                message: `Your enquiry for ${enquiries[index].listingTitle} has been approved. You can now book!`,
            }, enquiries[index].userId);
        } else if (status === "rejected") {
            addNotification({
                type: "status_update",
                title: "Enquiry Update",
                message: `Your enquiry for ${enquiries[index].listingTitle} was not accepted.`,
            }, enquiries[index].userId);
        }

        return true;
    } catch {
        return false;
    }
};

// ================== BOOKING FUNCTIONS (for Rooms) ==================

export const createBooking = async (data: {
    enquiryId: string;
    userId: string;
    listingId: string;
    listingType: "room" | "mess";
    listingTitle: string;
    startDate: Date;
    endDate?: Date;
    amount: number;
    ownerId?: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
}): Promise<{ success: boolean; bookingId?: string; error?: string }> => {
    try {
        let dbId: string | undefined;

        // Try writing to Supabase
        try {
            const { data: dbData, error } = await supabase
                .from("bookings")
                .insert({
                    user_id: data.userId,
                    listing_id: data.listingId,
                    listing_type: data.listingType,
                    owner_id: data.ownerId || null,
                    message: data.listingTitle,
                    status: "approved",
                    user_name: data.userName || "User",
                    user_email: data.userEmail || "",
                    user_phone: data.userPhone || "",
                })
                .select()
                .single();

            if (!error && dbData) {
                dbId = dbData.id;
            } else if (error) {
                logger.warn("Supabase booking insert failed, falling back to local storage", { data: error });
            }
        } catch (dbErr) {
            console.error("Supabase booking insert error:", dbErr);
        }

        const bookings = getBookingsLocal();
        const bookingId = dbId || generateId();
        const newBooking: Booking = {
            id: bookingId,
            enquiryId: data.enquiryId,
            userId: data.userId,
            listingId: data.listingId,
            listingType: data.listingType,
            listingTitle: data.listingTitle,
            startDate: data.startDate,
            endDate: data.endDate,
            amount: data.amount,
            status: "confirmed",
            paymentStatus: "pending",
            createdAt: new Date(),
        };

        bookings.push(newBooking);
        localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));

        // Update enquiry status
        updateEnquiryStatus(data.enquiryId, "booked");

        // Add notification
        addNotification({
            type: "booking_confirmation",
            title: "Booking Confirmed! 🏠",
            message: `Your booking for ${data.listingTitle} is confirmed. Amount: ₹${data.amount.toLocaleString()}`,
        }, data.userId);

        logger.info("Booking created", { data: { id: bookingId } });
        return { success: true, bookingId };
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMsg };
    }
};

export const getBookingsLocal = (): Booking[] => {
    try {
        const data = localStorage.getItem(BOOKINGS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const getUserBookings = (userId: string): Booking[] => {
    const bookings = getBookingsLocal();
    return bookings.filter(b => b.userId === userId);
};

export const updateBookingPayment = (bookingId: string, paymentStatus: "pending" | "paid" | "refunded"): boolean => {
    try {
        const bookings = getBookingsLocal();
        const index = bookings.findIndex(b => b.id === bookingId);

        if (index === -1) return false;

        bookings[index].paymentStatus = paymentStatus;
        localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));

        if (paymentStatus === "paid") {
            addNotification(notificationTemplates.paymentSuccess(
                bookings[index].amount,
                bookings[index].listingTitle
            ), bookings[index].userId);
        }

        return true;
    } catch {
        return false;
    }
};

export const cancelBooking = (bookingId: string): boolean => {
    try {
        const bookings = getBookingsLocal();
        const index = bookings.findIndex(b => b.id === bookingId);

        if (index === -1) return false;

        bookings[index].status = "cancelled";
        localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));

        return true;
    } catch {
        return false;
    }
};

// ================== SUBSCRIPTION FUNCTIONS (for Mess) ==================

export const createSubscription = async (data: {
    userId: string;
    messId: string;
    messTitle: string;
    planType: "daily" | "weekly" | "monthly";
    amount: number;
    mealTypes?: string[];
}): Promise<{ success: boolean; subscriptionId?: string; error?: string }> => {
    try {
        const startDate = new Date();
        const endDate = new Date(startDate);
        switch (data.planType) {
            case "daily":
                endDate.setDate(endDate.getDate() + 1);
                break;
            case "weekly":
                endDate.setDate(endDate.getDate() + 7);
                break;
            case "monthly":
                endDate.setMonth(endDate.getMonth() + 1);
                break;
        }

        let dbId: string | undefined;

        // Try writing to Supabase
        try {
            const { data: dbData, error } = await (supabase as any)
                .from("mess_subscriptions")
                .insert({
                    mess_id: data.messId,
                    user_id: data.userId,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    plan_type: data.planType,
                    amount_paid: data.amount,
                    status: "active"
                })
                .select()
                .single();

            if (!error && dbData) {
                dbId = dbData.id;
            }
        } catch (dbErr) {
            console.error("Supabase subscription insert error:", dbErr);
        }

        const subscriptions = getSubscriptionsLocal();
        const subscriptionId = dbId || generateId();
        const newSubscription: MessSubscription = {
            id: subscriptionId,
            userId: data.userId,
            messId: data.messId,
            messTitle: data.messTitle,
            planType: data.planType,
            startDate,
            endDate,
            amount: data.amount,
            status: "active",
            mealTypes: data.mealTypes || ["breakfast", "lunch", "dinner"],
            createdAt: new Date(),
        };

        subscriptions.push(newSubscription);
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));

        // Add notification
        addNotification({
            type: "booking_confirmation",
            title: "Subscription Active! 🍽️",
            message: `Your ${data.planType} mess subscription for ${data.messTitle} is now active until ${endDate.toLocaleDateString()}.`,
        }, data.userId);

        logger.info("Subscription created", { data: { id: subscriptionId } });
        return { success: true, subscriptionId };
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMsg };
    }
};

export const getSubscriptionsLocal = (): MessSubscription[] => {
    try {
        const data = localStorage.getItem(SUBSCRIPTIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const getUserSubscriptions = (userId: string): MessSubscription[] => {
    const subscriptions = getSubscriptionsLocal();
    return subscriptions.filter(s => s.userId === userId);
};

export const getActiveSubscription = (userId: string, messId: string): MessSubscription | null => {
    const subscriptions = getUserSubscriptions(userId);
    const now = new Date();
    return subscriptions.find(s =>
        s.messId === messId &&
        s.status === "active" &&
        new Date(s.endDate) > now
    ) || null;
};

export const pauseSubscription = (subscriptionId: string): boolean => {
    try {
        const subscriptions = getSubscriptionsLocal();
        const index = subscriptions.findIndex(s => s.id === subscriptionId);

        if (index === -1) return false;

        subscriptions[index].status = "paused";
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));

        return true;
    } catch {
        return false;
    }
};

export const resumeSubscription = (subscriptionId: string): boolean => {
    try {
        const subscriptions = getSubscriptionsLocal();
        const index = subscriptions.findIndex(s => s.id === subscriptionId);

        if (index === -1) return false;

        subscriptions[index].status = "active";
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));

        return true;
    } catch {
        return false;
    }
};

export const cancelSubscription = (subscriptionId: string): boolean => {
    try {
        const subscriptions = getSubscriptionsLocal();
        const index = subscriptions.findIndex(s => s.id === subscriptionId);

        if (index === -1) return false;

        subscriptions[index].status = "cancelled";
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));

        return true;
    } catch {
        return false;
    }
};

export const renewSubscription = (subscriptionId: string): boolean => {
    try {
        const subscriptions = getSubscriptionsLocal();
        const index = subscriptions.findIndex(s => s.id === subscriptionId);

        if (index === -1) return false;

        const sub = subscriptions[index];
        const newEndDate = new Date(sub.endDate);

        switch (sub.planType) {
            case "daily":
                newEndDate.setDate(newEndDate.getDate() + 1);
                break;
            case "weekly":
                newEndDate.setDate(newEndDate.getDate() + 7);
                break;
            case "monthly":
                newEndDate.setMonth(newEndDate.getMonth() + 1);
                break;
        }

        subscriptions[index].endDate = newEndDate;
        subscriptions[index].status = "active";
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));

        addNotification({
            type: "status_update",
            title: "Subscription Renewed! ✨",
            message: `Your subscription for ${sub.messTitle} has been renewed until ${newEndDate.toLocaleDateString()}.`,
        }, sub.userId);

        return true;
    } catch {
        return false;
    }
};

export const fetchOwnerSubscriptions = async (ownerId: string): Promise<OwnerSubscription[]> => {
    try {
        // 1. Get owner's mess listings
        const { data: messList, error: messError } = await supabase
            .from("mess")
            .select("id, name")
            .eq("owner_id", ownerId);

        let myMessList: LocalMessItem[] = (messList || []).map(m => ({ id: m.id, name: m.name }));
        
        // Always merge with local mess listings
        try {
            const localMessStr = localStorage.getItem("rm_mess");
            if (localMessStr) {
                const localMess = JSON.parse(localMessStr) as LocalMessItem[];
                const localFiltered = localMess
                    .filter((m) => m.owner_id === ownerId || m.ownerId === ownerId)
                    .map((m) => ({ id: m.id, name: m.name }));
                
                localFiltered.forEach(lm => {
                    if (!myMessList.some(m => m.id === lm.id)) {
                        myMessList.push(lm);
                    }
                });
            }
        } catch (e) {
            console.error("Error reading local mess for subscriptions", e);
        }

        const messIds = myMessList.map((m) => m.id);
        if (messIds.length === 0) {
            return [];
        }

        // 2. Fetch subscriptions from local storage (rm_subscriptions)
        const localSubscriptions = getSubscriptionsLocal();
        const relevantLocalSubs = localSubscriptions.filter(s => messIds.includes(s.messId));

        // 3. Fetch from Supabase
        const { data: dbData } = await (supabase as any)
            .from("mess_subscriptions")
            .select(`
                *,
                profiles:user_id (
                    first_name,
                    last_name,
                    phone
                )
            `)
            .in("mess_id", messIds);

        // Map and merge both sources
        const allSubsMap = new Map<string, OwnerSubscription>();

        // Add local subscriptions first
        relevantLocalSubs.forEach(s => {
            allSubsMap.set(s.id, {
                id: s.id,
                userId: s.userId,
                messId: s.messId,
                messTitle: s.messTitle,
                userName: "User (Local Demo)",
                userPhone: "N/A",
                planType: s.planType,
                startDate: new Date(s.startDate),
                endDate: new Date(s.endDate),
                amount: s.amount,
                status: s.status,
                createdAt: new Date(s.createdAt || new Date()),
            });
        });

        // Overlay Supabase data (which are more up-to-date and have profile info)
        if (dbData && dbData.length > 0) {
            dbData.forEach((sub) => {
                const messObj = myMessList.find((m) => m.id === sub.mess_id);
                const profileObj = sub.profiles as { first_name?: string; last_name?: string; phone?: string } | null;
                allSubsMap.set(sub.id, {
                    id: sub.id,
                    userId: sub.user_id,
                    messId: sub.mess_id,
                    messTitle: messObj ? messObj.name : "Unknown Mess",
                    userName: profileObj ? `${profileObj.first_name || ""} ${profileObj.last_name || ""}`.trim() || "User" : "User",
                    userPhone: profileObj?.phone || "N/A",
                    planType: sub.plan_type as "daily" | "weekly" | "monthly",
                    startDate: new Date(sub.start_date),
                    endDate: new Date(sub.end_date),
                    amount: Number(sub.amount_paid),
                    status: sub.status as "active" | "paused" | "cancelled" | "expired",
                    createdAt: new Date(sub.created_at),
                });
            });
        }

        // Also scan rm_payments and rm_bookings in local storage to cover any unlinked payment receipts
        try {
            const rawPayments = JSON.parse(localStorage.getItem("rm_payments") || "[]");
            rawPayments.forEach((p: any) => {
                const pListingId = p.listingId || p.listing_id;
                const pListingType = p.listingType || p.listing_type;
                if ((pListingType === "mess" || !pListingType) && (messIds.includes(pListingId) || myMessList.some(m => m.id === pListingId))) {
                    const id = p.id || p.transaction_id || p.paymentId || `pay_${p.timestamp || Date.now()}`;
                    if (!allSubsMap.has(id)) {
                        const messObj = myMessList.find((m) => m.id === pListingId);
                        allSubsMap.set(id, {
                            id,
                            userId: p.userId || p.user_id || "user_guest",
                            messId: pListingId,
                            messTitle: messObj ? messObj.name : p.listingTitle || p.listing_title || "Mess Subscription",
                            userName: p.userName || p.user_name || "User",
                            userPhone: p.userPhone || p.user_phone || "N/A",
                            planType: (p.planType || p.plan_type || "monthly") as any,
                            startDate: new Date(p.timestamp || p.created_at || new Date()),
                            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            amount: Number(p.amount || 0),
                            status: "active",
                            createdAt: new Date(p.timestamp || p.created_at || new Date()),
                        });
                    }
                }
            });

            const rawBookings = JSON.parse(localStorage.getItem("rm_bookings") || "[]");
            rawBookings.forEach((b: any) => {
                const bListingId = b.listingId || b.listing_id;
                const bListingType = b.listingType || b.listing_type;
                if (bListingType === "mess" && (messIds.includes(bListingId) || myMessList.some(m => m.id === bListingId))) {
                    const id = b.id || b.bookingId || `bkg_${b.createdAt || Date.now()}`;
                    if (!allSubsMap.has(id)) {
                        const messObj = myMessList.find((m) => m.id === bListingId);
                        allSubsMap.set(id, {
                            id,
                            userId: b.userId || b.user_id || "user_guest",
                            messId: bListingId,
                            messTitle: messObj ? messObj.name : b.listingTitle || b.listing_title || "Mess Subscription",
                            userName: b.userName || b.user_name || "User",
                            userPhone: b.userPhone || b.user_phone || "N/A",
                            planType: (b.planType || b.plan_type || "monthly") as any,
                            startDate: new Date(b.createdAt || new Date()),
                            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            amount: Number(b.amount || 0),
                            status: "active",
                            createdAt: new Date(b.createdAt || new Date()),
                        });
                    }
                }
            });
        } catch (e) {
            console.error("Error scanning raw payments for mess subscriptions", e);
        }

        // Return array sorted by date descending with status check
        return Array.from(allSubsMap.values()).map(sub => {
            if (sub.status === "active" && new Date().getTime() > new Date(sub.endDate).getTime()) {
                return { ...sub, status: "expired" as const };
            }
            return sub;
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
        console.error("Error in fetchOwnerSubscriptions:", err);
        return [];
    }
};

export const fetchOwnerRoomBookings = async (ownerId: string): Promise<OwnerRoomBooking[]> => {
    try {
        // 1. Get owner's room listings
        const { data: roomList, error: roomError } = await supabase
            .from("rooms")
            .select("id, title")
            .eq("owner_id", ownerId);

        let myRoomList: LocalRoomItem[] = (roomList || []).map(r => ({ id: r.id, title: r.title }));

        // Always merge with local room listings
        try {
            const localRoomsStr = localStorage.getItem("rm_rooms");
            if (localRoomsStr) {
                const localRooms = JSON.parse(localRoomsStr) as LocalRoomItem[];
                const localFiltered = localRooms
                    .filter((r) => r.owner_id === ownerId || r.ownerId === ownerId)
                    .map((r) => ({ id: r.id, title: r.title }));
                
                localFiltered.forEach(lr => {
                    if (!myRoomList.some(r => r.id === lr.id)) {
                        myRoomList.push(lr);
                    }
                });
            }
        } catch (e) {
            console.error("Error reading local rooms for bookings", e);
        }

        const roomIds = myRoomList.map((r) => r.id);
        if (roomIds.length === 0) {
            return [];
        }

        // 2. Fetch bookings from Supabase
        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .in("listing_id", roomIds)
            .eq("listing_type", "room");

        // 3. Map database bookings
        const dbBookings: OwnerRoomBooking[] = (data || []).map((b: any) => {
            const roomObj = myRoomList.find((r) => r.id === b.listing_id);
            return {
                id: b.id,
                userId: b.user_id,
                listingId: b.listing_id,
                listingTitle: roomObj ? roomObj.title : b.message || "Unknown Room",
                userName: b.user_name || "User",
                userEmail: b.user_email || "N/A",
                userPhone: b.user_phone || "N/A",
                amount: Number(b.amount || 0),
                status: b.status,
                createdAt: new Date(b.created_at),
            };
        });

        // 4. Merge with local storage fallback
        const localBookings = getBookingsLocal();
        const relevantLocalBookings = localBookings.filter(b => roomIds.includes(b.listingId));

        const allBookingsMap = new Map<string, OwnerRoomBooking>();

        relevantLocalBookings.forEach(b => {
            allBookingsMap.set(b.id, {
                id: b.id,
                userId: b.userId,
                listingId: b.listingId,
                listingTitle: b.listingTitle,
                userName: b.userName || "User (Local Demo)",
                userEmail: b.userEmail || "N/A",
                userPhone: b.userPhone || "N/A",
                amount: b.amount,
                status: b.status,
                createdAt: new Date(b.createdAt || new Date()),
            });
        });

        dbBookings.forEach(b => {
            allBookingsMap.set(b.id, b);
        });

        // Also scan rm_payments and raw rm_bookings in local storage for any room payments
        try {
            const rawPayments = JSON.parse(localStorage.getItem("rm_payments") || "[]");
            rawPayments.forEach((p: any) => {
                const pListingId = p.listingId || p.listing_id;
                const pListingType = p.listingType || p.listing_type;
                if ((pListingType === "room" || pListingType === "booking") && (roomIds.includes(pListingId) || myRoomList.some(r => r.id === pListingId))) {
                    const id = p.id || p.transaction_id || p.paymentId || `pay_${p.timestamp || Date.now()}`;
                    if (!allBookingsMap.has(id)) {
                        const roomObj = myRoomList.find((r) => r.id === pListingId);
                        allBookingsMap.set(id, {
                            id,
                            userId: p.userId || p.user_id || "user_guest",
                            listingId: pListingId,
                            listingTitle: roomObj ? roomObj.title : p.listingTitle || p.listing_title || "Room Booking",
                            userName: p.userName || p.user_name || "User",
                            userEmail: p.userEmail || p.user_email || "N/A",
                            userPhone: p.userPhone || p.user_phone || "N/A",
                            amount: Number(p.amount || 0),
                            status: "confirmed",
                            createdAt: new Date(p.timestamp || p.created_at || new Date()),
                        });
                    }
                }
            });

            const rawBookings = JSON.parse(localStorage.getItem("rm_bookings") || "[]");
            rawBookings.forEach((b: any) => {
                const bListingId = b.listingId || b.listing_id;
                const bListingType = b.listingType || b.listing_type;
                if ((bListingType === "room" || bListingType === "booking" || !bListingType) && (roomIds.includes(bListingId) || myRoomList.some(r => r.id === bListingId))) {
                    const id = b.id || b.bookingId || `bkg_${b.createdAt || Date.now()}`;
                    if (!allBookingsMap.has(id)) {
                        const roomObj = myRoomList.find((r) => r.id === bListingId);
                        allBookingsMap.set(id, {
                            id,
                            userId: b.userId || b.user_id || "user_guest",
                            listingId: bListingId,
                            listingTitle: roomObj ? roomObj.title : b.listingTitle || b.listing_title || "Room Booking",
                            userName: b.userName || b.user_name || "User",
                            userEmail: b.userEmail || b.user_email || "N/A",
                            userPhone: b.userPhone || b.user_phone || "N/A",
                            amount: Number(b.amount || 0),
                            status: b.status || "confirmed",
                            createdAt: new Date(b.createdAt || b.created_at || new Date()),
                        });
                    }
                }
            });
        } catch (e) {
            console.error("Error scanning raw payments for room bookings", e);
        }

        return Array.from(allBookingsMap.values()).map(b => {
            const endDate = new Date(b.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
            if ((b.status === "confirmed" || b.status === "approved" || b.status === "active") && new Date().getTime() > endDate.getTime()) {
                return { ...b, status: "expired" };
            }
            return b;
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
        console.error("Error in fetchOwnerRoomBookings:", err);
        return [];
    }
};

interface SupabaseBookingRow {
    id: string;
    user_id: string;
    listing_id: string;
    listing_type: string;
    owner_id: string | null;
    message: string;
    status: string;
    user_name: string;
    user_email: string;
    user_phone: string;
    created_at: string;
}

export const fetchUserBookings = async (userId: string): Promise<Booking[]> => {
    try {
        // 1. Fetch from Supabase
        const { data: dbData, error } = await supabase
            .from("bookings")
            .select("*")
            .eq("user_id", userId);

        let dbBookings: Booking[] = [];
        if (!error && dbData) {
            const rows = dbData as unknown as SupabaseBookingRow[];
            dbBookings = rows.map((b) => ({
                id: b.id,
                enquiryId: "",
                userId: b.user_id,
                listingId: b.listing_id,
                listingType: b.listing_type as "room" | "mess",
                listingTitle: b.message || "Room Booking",
                startDate: new Date(b.created_at),
                amount: 5000,
                status: b.status === "cancelled" ? "cancelled" : "confirmed",
                paymentStatus: "paid",
                createdAt: new Date(b.created_at),
            }));
        }

        // 2. Fetch local storage bookings
        const localBookings = getBookingsLocal();
        const userLocalBookings = localBookings.filter(b => b.userId === userId);

        // 3. Sync local-only bookings to Supabase
        for (const localB of userLocalBookings) {
            const existsInDb = dbBookings.some(dbB => dbB.id === localB.id);
            if (!existsInDb) {
                try {
                    await supabase.from("bookings").insert({
                        id: localB.id,
                        user_id: localB.userId,
                        listing_id: localB.listingId,
                        listing_type: localB.listingType,
                        owner_id: localB.ownerId || null,
                        message: localB.listingTitle,
                        status: "approved",
                        user_name: localB.userName || "User",
                        user_email: localB.userEmail || "",
                        user_phone: localB.userPhone || "",
                    });
                    dbBookings.push(localB);
                } catch (syncErr) {
                    console.error("Failed to sync local booking to database:", syncErr);
                }
            }
        }

        // 4. Merge
        const bookingMap = new Map<string, Booking>();
        userLocalBookings.forEach(b => bookingMap.set(b.id, b));
        dbBookings.forEach(b => bookingMap.set(b.id, b));

        const combined = Array.from(bookingMap.values());
        const allLocalBookings = localBookings.filter(b => b.userId !== userId);
        localStorage.setItem(BOOKINGS_KEY, JSON.stringify([...allLocalBookings, ...combined]));

        return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
        console.error("Error in fetchUserBookings:", err);
        return getUserBookings(userId);
    }
};

interface DbUserSubscriptionRow {
    id: string;
    user_id: string;
    mess_id: string;
    start_date: string;
    end_date: string;
    plan_type: string;
    amount_paid: number;
    status: string;
    created_at: string;
    mess: { name: string } | null;
}

export const fetchUserSubscriptions = async (userId: string): Promise<MessSubscription[]> => {
    try {
        // 1. Fetch from Supabase
        const { data: dbData, error } = await (supabase as any)
            .from("mess_subscriptions")
            .select(`
                *,
                mess:mess_id (
                    name
                )
            `)
            .eq("user_id", userId);

        let dbSubs: MessSubscription[] = [];
        if (!error && dbData) {
            const rows = dbData as unknown as DbUserSubscriptionRow[];
            dbSubs = rows.map((s) => ({
                id: s.id,
                userId: s.user_id,
                messId: s.mess_id,
                messTitle: s.mess?.name || "Mess Subscription",
                planType: s.plan_type as "daily" | "weekly" | "monthly",
                startDate: new Date(s.start_date),
                endDate: new Date(s.end_date),
                amount: Number(s.amount_paid),
                status: s.status as "active" | "paused" | "cancelled" | "expired",
                mealTypes: ["breakfast", "lunch", "dinner"],
                createdAt: new Date(s.created_at),
            }));
        }

        // 2. Fetch local storage subscriptions
        const localSubs = getSubscriptionsLocal();
        const userLocalSubs = localSubs.filter(s => s.userId === userId);

        // 3. Sync local-only subscriptions to Supabase
        for (const localS of userLocalSubs) {
            const existsInDb = dbSubs.some(dbS => dbS.id === localS.id);
            if (!existsInDb) {
                try {
                    await (supabase as any).from("mess_subscriptions").insert({
                        id: localS.id,
                        mess_id: localS.messId,
                        user_id: localS.userId,
                        start_date: new Date(localS.startDate).toISOString().split('T')[0],
                        end_date: new Date(localS.endDate).toISOString().split('T')[0],
                        plan_type: localS.planType,
                        amount_paid: localS.amount,
                        status: localS.status
                    });
                    dbSubs.push(localS);
                } catch (syncErr) {
                    console.error("Failed to sync local subscription to database:", syncErr);
                }
            }
        }

        // 4. Merge
        const subMap = new Map<string, MessSubscription>();
        userLocalSubs.forEach(s => subMap.set(s.id, s));
        dbSubs.forEach(s => subMap.set(s.id, s));

        const combined = Array.from(subMap.values());
        const allLocalSubs = localSubs.filter(s => s.userId !== userId);
        localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify([...allLocalSubs, ...combined]));

        return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
        console.error("Error in fetchUserSubscriptions:", err);
        return getUserSubscriptions(userId);
    }
};

export default {
    createEnquiry,
    getUserEnquiries,
    deleteEnquiry,
    getOwnerEnquiries,
    fetchOwnerEnquiries,
    replyToEnquiry,
    updateEnquiryStatus,
    createBooking,
    getUserBookings,
    updateBookingPayment,
    cancelBooking,
    createSubscription,
    getUserSubscriptions,
    getActiveSubscription,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    renewSubscription,
    fetchOwnerSubscriptions,
    fetchOwnerRoomBookings,
    fetchUserBookings,
    fetchUserSubscriptions,
};
