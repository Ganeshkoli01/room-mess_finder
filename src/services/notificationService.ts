// Notification Service
// Handles in-app notifications, push notifications, and toast messages

import logger from '@/lib/logger';

export type NotificationType =
    | 'booking_confirmation'
    | 'payment_success'
    | 'payment_failed'
    | 'status_update'
    | 'new_listing'
    | 'price_drop'
    | 'enquiry_response'
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
}

const STORAGE_KEY = 'rm_notifications';

// Generate unique notification ID
const generateNotificationId = (): string => {
    return `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

// Get all notifications
export const getNotifications = (): Notification[] => {
    try {
        const notifications = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return notifications.sort((a: Notification, b: Notification) =>
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

// Add notification
export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification => {
    const newNotification: Notification = {
        ...notification,
        id: generateNotificationId(),
        timestamp: new Date(),
        read: false,
    };

    const notifications = getNotifications();
    notifications.unshift(newNotification);

    // Keep only last 50 notifications
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    logger.info(`Notification added: ${notification.type}`, { context: 'Notifications' });

    // Play notification sound
    playNotificationSound();

    // Show browser notification if permitted
    showBrowserNotification(newNotification);

    return newNotification;
};

// Mark notification as read
export const markAsRead = (id: string): void => {
    const notifications = getNotifications();
    const updated = notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Mark all as read
export const markAllAsRead = (): void => {
    const notifications = getNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Delete notification
export const deleteNotification = (id: string): void => {
    const notifications = getNotifications().filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
};

// Clear all notifications
export const clearAllNotifications = (): void => {
    localStorage.removeItem(STORAGE_KEY);
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
    bookingConfirmation: (listingTitle: string, date: string) => ({
        type: 'booking_confirmation' as NotificationType,
        title: 'Booking Confirmed! 🎉',
        message: `Your booking for "${listingTitle}" has been confirmed for ${date}.`,
    }),

    paymentSuccess: (amount: number, listingTitle: string) => ({
        type: 'payment_success' as NotificationType,
        title: 'Payment Successful! ✅',
        message: `Payment of ₹${amount.toLocaleString()} for "${listingTitle}" was successful.`,
    }),

    paymentFailed: (listingTitle: string) => ({
        type: 'payment_failed' as NotificationType,
        title: 'Payment Failed ❌',
        message: `Payment for "${listingTitle}" failed. Please try again.`,
    }),

    enquiryReceived: (listingTitle: string) => ({
        type: 'enquiry_response' as NotificationType,
        title: 'New Enquiry! 📬',
        message: `You received a new enquiry for "${listingTitle}".`,
    }),

    enquiryResponse: (listingTitle: string) => ({
        type: 'enquiry_response' as NotificationType,
        title: 'Enquiry Response! 💬',
        message: `The owner of "${listingTitle}" has responded to your enquiry.`,
    }),

    priceDrop: (listingTitle: string, newPrice: number) => ({
        type: 'price_drop' as NotificationType,
        title: 'Price Drop! 💰',
        message: `"${listingTitle}" is now available at ₹${newPrice.toLocaleString()}/month!`,
    }),

    statusUpdate: (status: string, listingTitle: string) => ({
        type: 'status_update' as NotificationType,
        title: 'Status Update 📋',
        message: `Your ${status} for "${listingTitle}" has been updated.`,
    }),

    welcome: () => ({
        type: 'system' as NotificationType,
        title: 'Welcome to Room & Mess Finder! 🏠',
        message: 'Find your perfect room or mess near you. Enable location for best results!',
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
