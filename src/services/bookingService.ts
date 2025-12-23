// Enquiry & Booking Service
// Handles enquiries, bookings for rooms, and subscriptions for mess

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { addNotification, notificationTemplates } from "./notificationService";
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

// Storage keys
const ENQUIRIES_KEY = "rm_enquiries";
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
        const { data: dbData, error } = await supabase
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

        if (!error && dbData) {
            enquiryId = dbData.id;
            logger.info("Enquiry saved to Supabase enquiries table");
        } else {
            // Fallback: Try legacy bookings table
            logger.warn("Enquiries table not found, using localStorage fallback");
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
                logger.info("Owner notifications sent", result);
            }).catch(err => {
                console.error("Failed to send owner notifications:", err);
            });
        }

        // Add user notification
        addNotification(notificationTemplates.bookingConfirmation(data.listingTitle));

        return { success: true, enquiryId };
    } catch (err: any) {
        logger.error("Error creating enquiry");
        // Fallback to localStorage
        return saveEnquiryLocal(data);
    }
};

const saveEnquiryLocal = (data: {
    userId: string;
    listingId: string;
    listingType: "room" | "mess";
    listingTitle: string;
    ownerId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    message: string;
}): { success: boolean; enquiryId?: string; error?: string } => {
    try {
        const enquiries = getEnquiriesLocal();
        const newEnquiry: Enquiry = {
            id: generateId(),
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

        enquiries.push(newEnquiry);
        localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(enquiries));

        // Add notification
        addNotification(notificationTemplates.bookingConfirmation(data.listingTitle));

        logger.info("Enquiry saved locally", { id: newEnquiry.id });
        return { success: true, enquiryId: newEnquiry.id };
    } catch (err: any) {
        return { success: false, error: err.message };
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

export const getUserEnquiries = (userId: string): Enquiry[] => {
    const enquiries = getEnquiriesLocal();
    return enquiries.filter(e => e.userId === userId);
};

export const getOwnerEnquiries = (ownerId: string): Enquiry[] => {
    const enquiries = getEnquiriesLocal();
    return enquiries.filter(e => e.ownerId === ownerId);
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
            });
        } else if (status === "rejected") {
            addNotification({
                type: "status_update",
                title: "Enquiry Update",
                message: `Your enquiry for ${enquiries[index].listingTitle} was not accepted.`,
            });
        }

        return true;
    } catch {
        return false;
    }
};

// ================== BOOKING FUNCTIONS (for Rooms) ==================

export const createBooking = (data: {
    enquiryId: string;
    userId: string;
    listingId: string;
    listingType: "room" | "mess";
    listingTitle: string;
    startDate: Date;
    endDate?: Date;
    amount: number;
}): { success: boolean; bookingId?: string; error?: string } => {
    try {
        const bookings = getBookingsLocal();
        const newBooking: Booking = {
            id: generateId(),
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
        });

        logger.info("Booking created", { id: newBooking.id });
        return { success: true, bookingId: newBooking.id };
    } catch (err: any) {
        return { success: false, error: err.message };
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
            ));
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

export const createSubscription = (data: {
    userId: string;
    messId: string;
    messTitle: string;
    planType: "daily" | "weekly" | "monthly";
    amount: number;
    mealTypes?: string[];
}): { success: boolean; subscriptionId?: string; error?: string } => {
    try {
        const subscriptions = getSubscriptionsLocal();

        // Calculate end date based on plan
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

        const newSubscription: MessSubscription = {
            id: generateId(),
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
        });

        logger.info("Subscription created", { id: newSubscription.id });
        return { success: true, subscriptionId: newSubscription.id };
    } catch (err: any) {
        return { success: false, error: err.message };
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
        });

        return true;
    } catch {
        return false;
    }
};

export default {
    createEnquiry,
    getUserEnquiries,
    getOwnerEnquiries,
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
};
