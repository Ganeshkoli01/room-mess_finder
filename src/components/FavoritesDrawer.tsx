import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Heart,
    Clock,
    X,
    Building2,
    UtensilsCrossed,
    Star,
    MapPin,
    Trash2,
    ChevronRight,
} from "lucide-react";
import {
    getFavorites,
    removeFromFavorites,
    getRecentlyViewed,
    FavoriteItem,
    ViewedItem,
} from "@/services/recommendationsService";

interface FavoritesDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const FavoritesDrawer = ({ isOpen, onClose }: FavoritesDrawerProps) => {
    const [activeTab, setActiveTab] = useState<"favorites" | "recent">("favorites");
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<ViewedItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            setFavorites(getFavorites());
            setRecentlyViewed(getRecentlyViewed());
        }
    }, [isOpen]);

    const handleRemoveFavorite = (id: string) => {
        removeFromFavorites(id);
        setFavorites(getFavorites());
    };

    const formatTimeAgo = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">My Saved Items</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button
                        onClick={() => setActiveTab("favorites")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === "favorites"
                                ? "border-b-2 border-primary text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Heart className="w-4 h-4" />
                        Favorites ({favorites.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("recent")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === "recent"
                                ? "border-b-2 border-primary text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        Recently Viewed ({recentlyViewed.length})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === "favorites" ? (
                        favorites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <Heart className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                <p className="text-muted-foreground mb-2">No favorites yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Click the heart icon on any listing to save it here
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {favorites.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group relative flex gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                                    >
                                        {/* Image */}
                                        <Link to={`/${item.type}/${item.id}`} className="flex-shrink-0">
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-20 h-20 object-cover rounded-lg"
                                            />
                                        </Link>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <Link to={`/${item.type}/${item.id}`}>
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                                        {item.title}
                                                    </h3>
                                                    <Badge variant="secondary" className="flex-shrink-0 text-xs">
                                                        {item.type === "room" ? <Building2 className="w-3 h-3 mr-1" /> : <UtensilsCrossed className="w-3 h-3 mr-1" />}
                                                        {item.type}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="line-clamp-1">{item.location}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-primary font-semibold text-sm">
                                                        ₹{item.price.toLocaleString()}/mo
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                        {item.rating.toFixed(1)}
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>

                                        {/* Remove button */}
                                        <button
                                            onClick={() => handleRemoveFavorite(item.id)}
                                            className="absolute top-2 right-2 p-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : recentlyViewed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground mb-2">No recently viewed items</p>
                            <p className="text-sm text-muted-foreground">
                                Your browsing history will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentlyViewed.map((item) => (
                                <Link
                                    key={item.id}
                                    to={`/${item.type}/${item.id}`}
                                    className="group flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        {item.type === "room" ? (
                                            <Building2 className="w-5 h-5 text-primary" />
                                        ) : (
                                            <UtensilsCrossed className="w-5 h-5 text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="line-clamp-1">{item.location}</span>
                                            <span>•</span>
                                            <span>₹{item.price.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs text-muted-foreground">
                                            {formatTimeAgo(item.timestamp)}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border">
                    <div className="flex gap-3">
                        <Button asChild variant="outline" className="flex-1">
                            <Link to="/rooms">Browse Rooms</Link>
                        </Button>
                        <Button asChild className="flex-1">
                            <Link to="/mess">Browse Mess</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FavoritesDrawer;
