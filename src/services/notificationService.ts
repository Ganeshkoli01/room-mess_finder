// Notification Service
// Handles in-app notifications, push notifications, and toast messages

import logger from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
    | 'booking_confirmation'
    | 'payment_success'
    | 'payment_failed'
    | 'status_update'
    | 'new_listing'
    | 'price_drop'
    | 'enquiry_response'
    | 'new_enquiry'
    | 'subscription_expired'
    | 'system';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    data?: Record<string, any>;
    actionUrl?: string;
    userId?: string | null;
}

const STORAGE_KEY = 'rm_notifications';

// Initial sample notifications for demonstration and testing
const initialNotificationsList: Notification[] = [
    {
        id: "NOTIF_DEMO_1",
        type: "system",
        title: "Welcome to Room & Mess Finder! 🏠",
        message: "Find affordable rooms, PGs, hostels, and mess services near you across India.",
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
        read: false,
    },
    {
        id: "NOTIF_DEMO_2",
        type: "booking_confirmation",
        title: "Booking Confirmed! 🎉",
        message: 'Your booking for "Spacious Single Room Near Shivaji University" has been confirmed.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: false,
        actionUrl: "/dashboard",
    },
    {
        id: "NOTIF_DEMO_3",
        type: "payment_success",
        title: "Payment Successful! ✅",
        message: 'Payment of ₹5,500 for "Spacious Single Room" was successful.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        read: true,
        actionUrl: "/dashboard",
    },
    {
        id: "NOTIF_DEMO_4",
        type: "price_drop",
        title: "Price Drop Alert! 💰",
        message: '"Hotel Ashoka Pure Veg Mess" subscription is now available at ₹2,500/month!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
        actionUrl: "/mess",
    },
];

// Generate unique notification ID
const generateNotificationId = (): string => {
    return `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

// Helper to get current user ID synchronously from localStorage
export const getCurrentUserId = (): string | null => {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const rawToken = localStorage.getItem(key);
                if (rawToken) {
                    const parsed = JSON.parse(rawToken);
                    if (parsed?.user?.id) {
                        return parsed.user.id;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error reading user token from localStorage:", e);
    }
    return null;
};

// Get all notifications for the current logged-in user
export const getNotifications = (): Notification[] => {
    try {
        const currentUserId = getCurrentUserId();
        const raw = localStorage.getItem(STORAGE_KEY);
        
        let allNotifications: Notification[] = [];
        if (!raw) {
            // Localize demo notifications to the current user so they see them initially
            allNotifications = initialNotificationsList.map(n => ({
                ...n,
                userId: currentUserId || null
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allNotifications));
        } else {
            allNotifications = JSON.parse(raw);
        }

        // Filter: notifications belonging to the current user OR welcome/system demos that don't have a specific owner
        const userNotifications = allNotifications.filter(n => 
            n.userId === currentUserId || (n.id.startsWith("NOTIF_DEMO_") && !n.userId)
        );

        return userNotifications.sort((a: Notification, b: Notification) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    } catch {
        return [];
    }
};

// Get unread count
export const getUnreadCount = (): number => {
    return getNotifications().filter(n => !n.read).length;
};

// Fetch template from database with fallback
export const getFormattedNotification = async (
    templateName: string,
    variables: Record<string, string | number>
): Promise<{ title: string; message: string }> => {
    try {
        const { data, error }: any = await (supabase as any)
            .from("notification_templates" as any)
            .select("subject, body")
            .eq("name", templateName)
            .maybeSingle();

        if (!error && data) {
            let body = data.body;
            let subject = data.subject || "Alert";
            Object.entries(variables).forEach(([key, val]) => {
                body = body.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(val));
                subject = subject.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(val));
            });
            return { title: subject, message: body };
        }
    } catch (err) {
        console.error(`Error loading template ${templateName}:`, err);
    }
    return { title: "", message: "" };
};

// Add notification (supports background template updates)
export const addNotification = (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & {
        templateName?: string;
        templateVars?: Record<string, string | number>;
    },
    targetUserId?: string
): Notification => {
    const currentUserId = getCurrentUserId();
    const resolvedUserId = targetUserId || currentUserId;
    const notifId = generateNotificationId();

    const newNotification: Notification = {
        id: notifId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: new Date(),
        read: false,
        userId: resolvedUserId || null,
        data: notification.data,
        actionUrl: notification.actionUrl
    };

    // We must load ALL notifications from localStorage, append the new one, and write all back
    let allNotifications: Notification[] = [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            allNotifications = JSON.parse(raw);
        } else {
            allNotifications = initialNotificationsList.map(n => ({
                ...n,
                userId: currentUserId || null
            }));
        }
    } catch {
        allNotifications = [];
    }

    allNotifications.unshift(newNotification);

    // Keep only last 100 notifications globally to prevent bloating local storage
    const trimmed = allNotifications.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    // If template is provided, load from Supabase in the background
    if (notification.templateName) {
        getFormattedNotification(notification.templateName, notification.templateVars || {})
            .then(({ title, message }) => {
                if (title && message) {
                    try {
                        const rawStorage = localStorage.getItem(STORAGE_KEY);
                        if (rawStorage) {
                            const parsed: Notification[] = JSON.parse(rawStorage);
                            const updated = parsed.map(n => 
                                n.id === notifId ? { ...n, title, message } : n
                            );
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                            // Dispatch storage change event to update Navbar/NotificationCenter counters
                            window.dispatchEvent(new Event("storage"));
                        }
                    } catch (e) {
                        console.error("Error updating notification background copy:", e);
                    }
                }
            })
            .catch(err => {
                console.warn("Background template update failed:", err);
            });
    }

    logger.info(`Notification added for user ${resolvedUserId}: ${notification.type}`, { context: 'Notifications' });

    // Play notification sound safely
    try {
        playNotificationSound();
    } catch (e) {
        // Audio error caught
    }

    // Show browser notification if permitted safely
    try {
        showBrowserNotification(newNotification);
    } catch (e) {
        // Notification permission error caught
    }

    return newNotification;
};

// Mark notification as read
export const markAsRead = (id: string): void => {
    let allNotifications: Notification[] = [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            allNotifications = JSON.parse(raw);
        }
    } catch {}

    const updated = allNotifications.map(n =>
        n.id === id ? { ...n, read: true } : n
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Mark all as read for the current user
export const markAllAsRead = (): void => {
    const currentUserId = getCurrentUserId();
    let allNotifications: Notification[] = [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            allNotifications = JSON.parse(raw);
        }
    } catch {}

    const updated = allNotifications.map(n => 
        (n.userId === currentUserId || (n.id.startsWith("NOTIF_DEMO_") && !n.userId)) ? { ...n, read: true } : n
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Delete notification
export const deleteNotification = (id: string): void => {
    let allNotifications: Notification[] = [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            allNotifications = JSON.parse(raw);
        }
    } catch {}

    const updated = allNotifications.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Clear all notifications for the current user
export const clearAllNotifications = (): void => {
    const currentUserId = getCurrentUserId();
    let allNotifications: Notification[] = [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            allNotifications = JSON.parse(raw);
        }
    } catch {}

    const remaining = allNotifications.filter(n => 
        n.userId !== currentUserId && !(n.id.startsWith("NOTIF_DEMO_") && !n.userId)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
};

// Play notification sound
const playNotificationSound = (): void => {
    try {
        // Using a simple beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
        // Audio not supported or blocked
    }
};

// Show browser notification
const showBrowserNotification = async (notification: Notification): Promise<void> => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: notification.id,
        });
    } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id,
            });
        }
    }
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

// Predefined notification templates
export const notificationTemplates = {
    bookingConfirmation: (listingTitle: string, date: string = "") => ({
        type: 'booking_confirmation' as NotificationType,
        title: 'Booking Confirmed! 🎉',
        message: `Your booking for "${listingTitle}" has been confirmed for ${date}.`,
        templateName: 'bookingConfirmation',
        templateVars: { listingTitle, date }
    }),

    paymentSuccess: (amount: number, listingTitle: string) => ({
        type: 'payment_success' as NotificationType,
        title: 'Payment Successful! ✅',
        message: `Payment of ₹${amount.toLocaleString()} for "${listingTitle}" was successful.`,
        templateName: 'paymentSuccess',
        templateVars: { amount, listingTitle }
    }),

    paymentFailed: (listingTitle: string) => ({
        type: 'payment_failed' as NotificationType,
        title: 'Payment Failed ❌',
        message: `Payment for "${listingTitle}" failed. Please try again.`,
        templateName: 'paymentFailed',
        templateVars: { listingTitle }
    }),

    enquiryReceived: (listingTitle: string) => ({
        type: 'enquiry_response' as NotificationType,
        title: 'New Enquiry! 📬',
        message: `You received a new enquiry for "${listingTitle}".`,
        templateName: 'enquiryReceived',
        templateVars: { listingTitle }
    }),

    enquiryResponse: (listingTitle: string) => ({
        type: 'enquiry_response' as NotificationType,
        title: 'Enquiry Response! 💬',
        message: `The owner of "${listingTitle}" has responded to your enquiry.`,
        templateName: 'enquiryResponse',
        templateVars: { listingTitle }
    }),

    priceDrop: (listingTitle: string, newPrice: number) => ({
        type: 'price_drop' as NotificationType,
        title: 'Price Drop! 💰',
        message: `"${listingTitle}" is now available at ₹${newPrice.toLocaleString()}/month!`,
        templateName: 'priceDrop',
        templateVars: { listingTitle, newPrice }
    }),

    statusUpdate: (status: string, listingTitle: string) => ({
        type: 'status_update' as NotificationType,
        title: 'Status Update 📋',
        message: `Your ${status} for "${listingTitle}" has been updated.`,
        templateName: 'statusUpdate',
        templateVars: { status, listingTitle }
    }),

    welcome: () => ({
        type: 'system' as NotificationType,
        title: 'Welcome to Room & Mess Finder! 🏠',
        message: 'Find your perfect room or mess near you. Enable location for best results!',
        templateName: 'welcome',
        templateVars: {}
    }),
};

export default {
    getNotifications,
    getUnreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    requestNotificationPermission,
    notificationTemplates,
};
