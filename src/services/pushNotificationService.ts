// Push Notification Service
// Handles web push notifications for the app

import { supabase } from "@/integrations/supabase/client";

interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
}

class PushNotificationService {
    private registration: ServiceWorkerRegistration | null = null;
    private subscription: PushSubscription | null = null;

    // Initialize push notifications
    async initialize(): Promise<boolean> {
        try {
            // Check if service workers are supported
            if (!('serviceWorker' in navigator)) {
                console.log('Service Workers not supported');
                return false;
            }

            // Check if push notifications are supported
            if (!('PushManager' in window)) {
                console.log('Push notifications not supported');
                return false;
            }

            // Register service worker
            this.registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered');

            // Check current permission
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                console.log('Notification permission denied');
                return false;
            }

            // Subscribe to push notifications
            await this.subscribeToPush();

            return true;
        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
            return false;
        }
    }

    // Subscribe to push notifications
    private async subscribeToPush(): Promise<void> {
        if (!this.registration) {
            throw new Error('Service Worker not registered');
        }

        try {
            // Get existing subscription or create new one
            this.subscription = await this.registration.pushManager.getSubscription();

            if (!this.subscription) {
                // Create new subscription
                const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

                if (!vapidPublicKey) {
                    console.warn('VAPID public key not configured');
                    return;
                }

                this.subscription = await this.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
                });

                // Save subscription to backend
                await this.saveSubscription(this.subscription);
            }

            console.log('Push subscription active');
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
        }
    }

    // Save subscription to Supabase
    private async saveSubscription(subscription: PushSubscription): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log('User not authenticated, skipping subscription save');
                return;
            }

            const subscriptionData = {
                user_id: user.id,
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
                    auth: this.arrayBufferToBase64(subscription.getKey('auth')),
                },
                created_at: new Date().toISOString(),
            };

            // Save to Supabase (you'll need to create this table)
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert(subscriptionData, {
                    onConflict: 'user_id',
                });

            if (error) {
                console.error('Failed to save subscription:', error);
            } else {
                console.log('Subscription saved successfully');
            }
        } catch (error) {
            console.error('Error saving subscription:', error);
        }
    }

    // Request notification permission
    async requestPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return 'denied';
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            await this.subscribeToPush();
        }

        return permission;
    }

    // Show local notification (for testing)
    async showNotification(payload: NotificationPayload): Promise<void> {
        if (!this.registration) {
            throw new Error('Service Worker not registered');
        }

        const options: NotificationOptions = {
            body: payload.body,
            icon: payload.icon || '/icon-192.png',
            badge: payload.badge || '/badge-72.png',
            tag: payload.tag || 'default',
            requireInteraction: payload.requireInteraction || false,
            vibrate: [200, 100, 200],
            data: {
                url: payload.url || '/',
            },
            actions: [
                { action: 'open', title: 'Open' },
                { action: 'close', title: 'Close' },
            ],
        };

        await this.registration.showNotification(payload.title, options);
    }

    // Unsubscribe from push notifications
    async unsubscribe(): Promise<void> {
        if (!this.subscription) {
            console.log('No active subscription');
            return;
        }

        try {
            await this.subscription.unsubscribe();

            // Remove from backend
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('user_id', user.id);
            }

            this.subscription = null;
            console.log('Unsubscribed from push notifications');
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
        }
    }

    // Check if notifications are enabled
    isEnabled(): boolean {
        return Notification.permission === 'granted' && this.subscription !== null;
    }

    // Get current permission status
    getPermissionStatus(): NotificationPermission {
        if (!('Notification' in window)) {
            return 'denied';
        }
        return Notification.permission;
    }

    // Helper: Convert VAPID key
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Helper: Convert ArrayBuffer to Base64
    private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
        if (!buffer) return '';
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Notification types for the app
export const NotificationTypes = {
    NEW_LISTING: 'new_listing',
    PRICE_DROP: 'price_drop',
    BOOKING_CONFIRMED: 'booking_confirmed',
    OWNER_RESPONSE: 'owner_response',
    PAYMENT_SUCCESS: 'payment_success',
    REMINDER: 'reminder',
} as const;

// Helper function to send notification (call from backend)
export async function sendPushNotification(
    userId: string,
    type: keyof typeof NotificationTypes,
    data: NotificationPayload
): Promise<void> {
    // This would be called from a Supabase Edge Function
    // Implementation depends on your backend setup
    console.log('Sending push notification:', { userId, type, data });
}

export default pushNotificationService;
