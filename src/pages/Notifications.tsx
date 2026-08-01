import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Bell,
    CheckCircle,
    CreditCard,
    MessageCircle,
    Calendar,
    AlertCircle,
    Sparkles,
    Trash2,
    CheckCheck,
    ArrowLeft,
    Inbox,
    Filter,
    Zap,
    Home,
    ExternalLink,
    Plus,
} from "lucide-react";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification,
    Notification,
    NotificationType,
} from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";

const notificationIcons: Record<NotificationType | "new_enquiry", React.ElementType> = {
    booking_confirmation: Calendar,
    payment_success: CreditCard,
    payment_failed: AlertCircle,
    status_update: CheckCircle,
    new_listing: Sparkles,
    price_drop: CreditCard,
    enquiry_response: MessageCircle,
    subscription_expired: AlertCircle,
    system: Bell,
    new_enquiry: Zap,
};

const notificationColors: Record<NotificationType | "new_enquiry", string> = {
    booking_confirmation: "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
    payment_success: "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
    payment_failed: "text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
    status_update: "text-primary bg-primary/10 border-primary/20",
    new_listing: "text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20",
    price_drop: "text-purple-500 bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20",
    enquiry_response: "text-blue-500 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20",
    subscription_expired: "text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
    system: "text-slate-500 bg-slate-500/10 border-slate-500/20",
    new_enquiry: "text-teal-500 bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20",
};

const Notifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<string>("all");
    const { toast } = useToast();

    const loadNotifications = () => {
        setNotifications(getNotifications());
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleMarkAsRead = (id: string) => {
        markAsRead(id);
        loadNotifications();
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead();
        loadNotifications();
        toast({
            title: "All Marked as Read",
            description: "All your notifications have been marked as read.",
        });
    };

    const handleDelete = (id: string) => {
        deleteNotification(id);
        loadNotifications();
        toast({
            title: "Notification Removed",
            description: "The notification has been deleted.",
        });
    };

    const handleConfirmClearAll = () => {
        clearAllNotifications();
        loadNotifications();
        toast({
            title: "Notifications Cleared",
            description: "All notifications have been removed.",
        });
    };

    const handleAddTestNotification = () => {
        try {
            const sampleTypes: NotificationType[] = [
                "booking_confirmation",
                "payment_success",
                "price_drop",
                "status_update",
                "enquiry_response",
            ];
            const randomType = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
            const titles: Record<string, string> = {
                booking_confirmation: "New Booking Request Received! 📅",
                payment_success: "Payment Received: ₹4,200! 💳",
                payment_failed: "Payment Error Alert ⚠️",
                status_update: "Property Status Updated to Verified 🌟",
                new_listing: "New Room Added in Rajarampuri! 🏠",
                price_drop: "Special Discount on Monthly Mess Pass! 🍱",
                enquiry_response: "New Message from Property Owner 💬",
                system: "System Maintenance Schedule Alert 🔔",
            };

            const created = addNotification({
                type: randomType,
                title: titles[randomType] || "New Test Notification! 🔔",
                message: `Test notification added at ${new Date().toLocaleTimeString()} to verify page interactivity.`,
            });

            setNotifications(getNotifications());
            toast({
                title: "Notification Added! 🔔",
                description: `Added "${created.title}" to your notification list.`,
            });
        } catch (err) {
            console.error("Failed to add test notification", err);
        }
    };

    const formatFullTime = (timestamp: Date) => {
        const date = new Date(timestamp);
        return date.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
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
        return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    };

    const filteredNotifications = notifications.filter((notification) => {
        if (filter === "unread") return !notification.read;
        if (filter === "bookings")
            return (
                notification.type === "booking_confirmation" ||
                notification.type === "status_update" ||
                notification.type === "enquiry_response" ||
                (notification.type as string) === "new_enquiry"
            );
        if (filter === "payments")
            return (
                notification.type === "payment_success" ||
                notification.type === "payment_failed"
            );
        if (filter === "updates")
            return (
                notification.type === "new_listing" ||
                notification.type === "price_drop" ||
                notification.type === "system"
            );
        return true;
    });

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
                {/* Header Navigation */}
                <div className="mb-6">
                    <Link
                        to="/"
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="px-2.5 py-0.5 text-xs font-semibold">
                                        {unreadCount} unread
                                    </Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground mt-1">
                                Stay updated with your enquiries, bookings, payment receipts, and property alerts.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {notifications.length > 0 && unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    className="h-9 gap-1.5 text-xs sm:text-sm"
                                >
                                    <CheckCheck className="w-4 h-4 text-emerald-500" />
                                    Mark all read
                                </Button>
                            )}

                            {notifications.length > 0 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 gap-1.5 text-xs sm:text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear all
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. All your current notifications will be permanently removed.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleConfirmClearAll}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Clear All
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6">
                    <Tabs value={filter} onValueChange={setFilter} className="w-full">
                        <TabsList className="grid grid-cols-3 sm:flex sm:w-auto h-auto p-1 bg-muted/60 rounded-xl gap-1">
                            <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm py-2 px-3">
                                All ({notifications.length})
                            </TabsTrigger>
                            <TabsTrigger value="unread" className="rounded-lg text-xs sm:text-sm py-2 px-3">
                                Unread ({unreadCount})
                            </TabsTrigger>
                            <TabsTrigger value="bookings" className="rounded-lg text-xs sm:text-sm py-2 px-3">
                                Enquiries & Bookings
                            </TabsTrigger>
                            <TabsTrigger value="payments" className="rounded-lg text-xs sm:text-sm py-2 px-3">
                                Payments
                            </TabsTrigger>
                            <TabsTrigger value="updates" className="rounded-lg text-xs sm:text-sm py-2 px-3">
                                Alerts & Updates
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Notifications List */}
                {filteredNotifications.length === 0 ? (
                    <Card className="border-dashed border-2 py-16 text-center">
                        <CardContent className="flex flex-col items-center justify-center p-0">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                                <Inbox className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">
                                {filter === "unread"
                                    ? "No unread notifications"
                                    : "No notifications found"}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                                {filter === "unread"
                                    ? "You are all caught up! Check back later for new updates."
                                    : "You don't have any notifications in this category yet."}
                            </p>
                            <div className="flex gap-3">
                                <Link to="/rooms">
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Home className="w-4 h-4" /> Explore Rooms
                                    </Button>
                                </Link>
                                <Link to="/dashboard">
                                    <Button size="sm" className="gap-2">
                                        Go to Dashboard
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredNotifications.map((notification) => {
                            const Icon = notificationIcons[notification.type] || Bell;
                            const colorClass =
                                notificationColors[notification.type] ||
                                "text-muted-foreground bg-muted border-border";

                            return (
                                <Card
                                    key={notification.id}
                                    className={`transition-all duration-200 hover:shadow-md ${!notification.read
                                        ? "border-primary/30 bg-primary/[0.02] dark:bg-primary/[0.04]"
                                        : "opacity-90 hover:opacity-100"
                                        }`}
                                >
                                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            {/* Icon */}
                                            <div
                                                className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${colorClass}`}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3
                                                        className={`text-base font-semibold ${!notification.read
                                                            ? "text-foreground"
                                                            : "text-foreground/80"
                                                            }`}
                                                    >
                                                        {notification.title}
                                                    </h3>
                                                    {!notification.read && (
                                                        <Badge
                                                            variant="default"
                                                            className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-medium"
                                                        >
                                                            New
                                                        </Badge>
                                                    )}
                                                </div>

                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {notification.message}
                                                </p>

                                                <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground/80">
                                                    <span>{formatTimeAgo(notification.timestamp)}</span>
                                                    <span>•</span>
                                                    <span>{formatFullTime(notification.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                                            {notification.actionUrl && (() => {
                                                let finalActionUrl = notification.actionUrl;
                                                if (notification.title.includes("Enquiry") || notification.message.toLowerCase().includes("enquiry")) {
                                                    if (finalActionUrl.includes("owner")) {
                                                        finalActionUrl = "/owner/dashboard?tab=enquiries";
                                                    } else {
                                                        finalActionUrl = "/dashboard?tab=enquiries";
                                                    }
                                                }
                                                return (
                                                    <Link to={finalActionUrl}>
                                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                                                            View <ExternalLink className="w-3 h-3" />
                                                        </Button>
                                                    </Link>
                                                );
                                            })()}

                                            {!notification.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                                                >
                                                    <CheckCheck className="w-3.5 h-3.5" /> Mark read
                                                </Button>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(notification.id)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                title="Delete notification"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Notifications;
