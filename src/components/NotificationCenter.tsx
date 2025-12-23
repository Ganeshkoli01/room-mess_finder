import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Bell,
    CheckCircle,
    CreditCard,
    MessageCircle,
    Calendar,
    AlertCircle,
    Sparkles,
    Trash2,
    Check,
    X,
    Zap,
} from "lucide-react";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    Notification,
    NotificationType,
} from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const notificationIcons: Record<NotificationType | "new_enquiry", React.ElementType> = {
    booking_confirmation: Calendar,
    payment_success: CreditCard,
    payment_failed: AlertCircle,
    status_update: CheckCircle,
    new_listing: Sparkles,
    price_drop: CreditCard,
    enquiry_response: MessageCircle,
    system: Bell,
    new_enquiry: Zap,
};

const notificationColors: Record<NotificationType | "new_enquiry", string> = {
    booking_confirmation: "text-success bg-success/10",
    payment_success: "text-success bg-success/10",
    payment_failed: "text-destructive bg-destructive/10",
    status_update: "text-primary bg-primary/10",
    new_listing: "text-accent bg-accent/10",
    price_drop: "text-warning bg-warning/10",
    enquiry_response: "text-primary bg-primary/10",
    system: "text-muted-foreground bg-muted",
    new_enquiry: "text-accent bg-accent/10",
};

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [realtimeConnected, setRealtimeConnected] = useState(false);
    const { user } = useAuth();

    // Load notifications
    useEffect(() => {
        const loadNotifications = () => {
            setNotifications(getNotifications());
            setUnreadCount(getUnreadCount());
        };

        loadNotifications();

        // Refresh every 30 seconds
        const interval = setInterval(loadNotifications, 30000);

        // Also refresh when tab becomes visible
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                loadNotifications();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    // Supabase Realtime subscription for new enquiries
    useEffect(() => {
        if (!user) return;

        // Subscribe to real-time enquiry updates
        const channel = supabase
            .channel('enquiry-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'enquiries',
                },
                (payload) => {
                    const newEnquiry = payload.new as any;

                    // Check if this is relevant to the current user (as owner)
                    if (newEnquiry.owner_id === user.id) {
                        // New enquiry for this owner!
                        addNotification({
                            type: "new_enquiry" as any,
                            title: "🔔 New Enquiry!",
                            message: `${newEnquiry.user_name} is interested in ${newEnquiry.listing_title}`,
                        });

                        // Refresh notifications
                        setNotifications(getNotifications());
                        setUnreadCount(getUnreadCount());

                        // Play sound
                        playNotificationSound();
                    }

                    // Check if this is the user's own enquiry status update
                    if (newEnquiry.user_id === user.id) {
                        addNotification({
                            type: "booking_confirmation",
                            title: "Enquiry Sent!",
                            message: `Your enquiry for ${newEnquiry.listing_title} was sent successfully.`,
                        });
                        setNotifications(getNotifications());
                        setUnreadCount(getUnreadCount());
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'enquiries',
                },
                (payload) => {
                    const updated = payload.new as any;
                    const old = payload.old as any;

                    // User's enquiry was updated (status change)
                    if (updated.user_id === user.id && old.status !== updated.status) {
                        let title = "Enquiry Update";
                        let message = `Your enquiry for ${updated.listing_title} status changed to ${updated.status}`;

                        if (updated.status === "approved") {
                            title = "🎉 Enquiry Approved!";
                            message = `Great news! Your enquiry for ${updated.listing_title} has been approved. You can now book!`;
                        } else if (updated.status === "rejected") {
                            title = "Enquiry Not Accepted";
                            message = `Your enquiry for ${updated.listing_title} was not accepted by the owner.`;
                        } else if (updated.status === "contacted") {
                            title = "Owner Viewed Your Enquiry";
                            message = `The owner of ${updated.listing_title} has viewed your enquiry and may contact you soon.`;
                        }

                        addNotification({
                            type: "status_update",
                            title,
                            message,
                        });

                        setNotifications(getNotifications());
                        setUnreadCount(getUnreadCount());
                        playNotificationSound();
                    }
                }
            )
            .subscribe((status) => {
                setRealtimeConnected(status === 'SUBSCRIBED');
                console.log('Realtime status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Refresh when popover opens
    useEffect(() => {
        if (open) {
            setNotifications(getNotifications());
            setUnreadCount(getUnreadCount());
        }
    }, [open]);

    // Play notification sound
    const playNotificationSound = () => {
        try {
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
        } catch {
            // Audio not supported or blocked, ignore
        }
    };

    const handleMarkAsRead = (id: string) => {
        markAsRead(id);
        setNotifications(getNotifications());
        setUnreadCount(getUnreadCount());
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead();
        setNotifications(getNotifications());
        setUnreadCount(0);
    };

    const handleDelete = (id: string) => {
        deleteNotification(id);
        setNotifications(getNotifications());
        setUnreadCount(getUnreadCount());
    };

    const formatTimeAgo = (timestamp: Date) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={handleMarkAllAsRead}
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                            <Bell className="w-10 h-10 text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground text-sm">No notifications yet</p>
                            <p className="text-muted-foreground text-xs mt-1">
                                We'll notify you about important updates
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.slice(0, 20).map((notification) => {
                                const Icon = notificationIcons[notification.type] || Bell;
                                const colorClass = notificationColors[notification.type] || "text-muted-foreground bg-muted";

                                return (
                                    <div
                                        key={notification.id}
                                        className={`group relative p-4 hover:bg-muted/50 transition-colors ${!notification.read ? "bg-primary/5" : ""
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm font-medium line-clamp-1 ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground/70 mt-1">
                                                    {formatTimeAgo(notification.timestamp)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action buttons on hover */}
                                        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notification.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                >
                                                    <Check className="w-3 h-3" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(notification.id)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="p-3 border-t border-border">
                        <Link to="/notifications" onClick={() => setOpen(false)}>
                            <Button variant="outline" size="sm" className="w-full">
                                View All Notifications
                            </Button>
                        </Link>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};

export default NotificationCenter;
