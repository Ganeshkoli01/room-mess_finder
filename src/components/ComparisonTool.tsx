import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Scale,
    X,
    Star,
    MapPin,
    Check,
    Minus,
    Building2,
    IndianRupee,
    Wifi,
    Car,
    Shield,
    Zap,
    Droplets,
    Wind,
    ArrowRight,
    Trash2,
} from "lucide-react";

// Storage key
const COMPARE_KEY = "rm_compare_items";

export interface CompareItem {
    id: string;
    title: string;
    location: string;
    price: number;
    rating: number;
    reviews: number;
    image: string;
    type: string;
    facilities: string[];
    isVerified: boolean;
    distance?: number;
}

// Get items to compare
export const getCompareItems = (): CompareItem[] => {
    try {
        return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
    } catch {
        return [];
    }
};

// Add item to compare
export const addToCompare = (item: CompareItem): boolean => {
    const items = getCompareItems();

    if (items.length >= 3) {
        return false; // Max 3 items
    }

    if (items.some((i) => i.id === item.id)) {
        return false; // Already exists
    }

    items.push(item);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(items));
    return true;
};

// Remove item from compare
export const removeFromCompare = (id: string): void => {
    const items = getCompareItems().filter((i) => i.id !== id);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(items));
};

// Clear all compare items
export const clearCompare = (): void => {
    localStorage.removeItem(COMPARE_KEY);
};

// Check if item is in compare
export const isInCompare = (id: string): boolean => {
    return getCompareItems().some((i) => i.id === id);
};

// Facility icons mapping
const facilityIcons: Record<string, React.ElementType> = {
    wifi: Wifi,
    ac: Wind,
    parking: Car,
    security: Shield,
    power: Zap,
    water: Droplets,
};

const getFacilityIcon = (facility: string) => {
    const key = facility.toLowerCase();
    for (const [name, Icon] of Object.entries(facilityIcons)) {
        if (key.includes(name)) return Icon;
    }
    return Check;
};

interface ComparisonToolProps {
    isOpen: boolean;
    onClose: () => void;
}

const ComparisonTool = ({ isOpen, onClose }: ComparisonToolProps) => {
    const [items, setItems] = useState<CompareItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            setItems(getCompareItems());
        }
    }, [isOpen]);

    const handleRemove = (id: string) => {
        removeFromCompare(id);
        setItems(getCompareItems());
    };

    const handleClear = () => {
        clearCompare();
        setItems([]);
    };

    // Get all unique facilities across all items
    const allFacilities = Array.from(
        new Set(items.flatMap((item) => item.facilities))
    );

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-4 md:inset-10 bg-card rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Scale className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Compare Properties</h2>
                            <p className="text-sm text-muted-foreground">
                                Compare up to 3 properties side by side
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {items.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleClear}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear All
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Scale className="w-16 h-16 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium mb-2">No items to compare</h3>
                            <p className="text-muted-foreground mb-4 max-w-md">
                                Add items to compare by clicking the "Compare" button on any
                                listing card. You can compare up to 3 items.
                            </p>
                            <Button asChild>
                                <Link to="/rooms">
                                    Browse Rooms
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr>
                                        <th className="text-left p-3 bg-muted/50 rounded-tl-xl w-40">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Feature
                                            </span>
                                        </th>
                                        {items.map((item) => (
                                            <th
                                                key={item.id}
                                                className="p-3 bg-muted/50 last:rounded-tr-xl"
                                            >
                                                <div className="relative">
                                                    <button
                                                        onClick={() => handleRemove(item.id)}
                                                        className="absolute -top-1 -right-1 w-6 h-6 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-full flex items-center justify-center"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <Link to={`/rooms/${item.id}`}>
                                                        <img
                                                            src={item.image}
                                                            alt={item.title}
                                                            className="w-full h-24 object-cover rounded-xl mb-2"
                                                        />
                                                        <h3 className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors">
                                                            {item.title}
                                                        </h3>
                                                    </Link>
                                                </div>
                                            </th>
                                        ))}
                                        {/* Empty slots */}
                                        {Array.from({ length: 3 - items.length }).map((_, i) => (
                                            <th
                                                key={`empty-${i}`}
                                                className="p-3 bg-muted/50 last:rounded-tr-xl"
                                            >
                                                <div className="h-24 border-2 border-dashed border-muted-foreground/20 rounded-xl flex items-center justify-center">
                                                    <span className="text-xs text-muted-foreground">
                                                        Add item
                                                    </span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Location */}
                                    <tr>
                                        <td className="p-3 border-b border-border">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                Location
                                            </div>
                                        </td>
                                        {items.map((item) => (
                                            <td
                                                key={item.id}
                                                className="p-3 border-b border-border text-center"
                                            >
                                                <span className="text-sm">{item.location}</span>
                                                {item.distance && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.distance.toFixed(1)} km away
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                        {Array.from({ length: 3 - items.length }).map((_, i) => (
                                            <td
                                                key={`empty-${i}`}
                                                className="p-3 border-b border-border"
                                            />
                                        ))}
                                    </tr>

                                    {/* Price */}
                                    <tr>
                                        <td className="p-3 border-b border-border">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                                                Price
                                            </div>
                                        </td>
                                        {items.map((item) => {
                                            const lowestPrice = Math.min(...items.map((i) => i.price));
                                            const isLowest = item.price === lowestPrice;
                                            return (
                                                <td
                                                    key={item.id}
                                                    className="p-3 border-b border-border text-center"
                                                >
                                                    <span
                                                        className={`text-lg font-bold ${isLowest ? "text-success" : ""
                                                            }`}
                                                    >
                                                        ₹{item.price.toLocaleString()}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        /mo
                                                    </span>
                                                    {isLowest && (
                                                        <Badge variant="default" className="mt-1 ml-2">
                                                            Best Price
                                                        </Badge>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        {Array.from({ length: 3 - items.length }).map((_, i) => (
                                            <td
                                                key={`empty-${i}`}
                                                className="p-3 border-b border-border"
                                            />
                                        ))}
                                    </tr>

                                    {/* Rating */}
                                    <tr>
                                        <td className="p-3 border-b border-border">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <Star className="w-4 h-4 text-muted-foreground" />
                                                Rating
                                            </div>
                                        </td>
                                        {items.map((item) => {
                                            const highestRating = Math.max(
                                                ...items.map((i) => i.rating)
                                            );
                                            const isHighest = item.rating === highestRating;
                                            return (
                                                <td
                                                    key={item.id}
                                                    className="p-3 border-b border-border text-center"
                                                >
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Star
                                                            className={`w-5 h-5 ${isHighest
                                                                    ? "text-yellow-500 fill-yellow-500"
                                                                    : "text-muted-foreground fill-muted-foreground"
                                                                }`}
                                                        />
                                                        <span
                                                            className={`font-semibold ${isHighest ? "text-yellow-600" : ""
                                                                }`}
                                                        >
                                                            {item.rating.toFixed(1)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({item.reviews} reviews)
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        {Array.from({ length: 3 - items.length }).map((_, i) => (
                                            <td
                                                key={`empty-${i}`}
                                                className="p-3 border-b border-border"
                                            />
                                        ))}
                                    </tr>

                                    {/* Type */}
                                    <tr>
                                        <td className="p-3 border-b border-border">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                Type
                                            </div>
                                        </td>
                                        {items.map((item) => (
                                            <td
                                                key={item.id}
                                                className="p-3 border-b border-border text-center"
                                            >
                                                <Badge variant="secondary">{item.type}</Badge>
                                            </td>
                                        ))}
                                        {Array.from({ length: 3 - items.length }).map((_, i) => (
                                            <td
                                                key={`empty-${i}`}
                                                className="p-3 border-b border-border"
                                            />
                                        ))}
                                    </tr>

                                    {/* Verified */}
                                    <tr>
                                        <td className="p-3 border-b border-border">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <Shield className="w-4 h-4 text-muted-foreground" />
                                                Verified
                                            </div>
                                        </td>
                                        {items.map((item) => (
                                            <td
                                                key={item.id}
                                                className="p-3 border-b border-border text-center"
                                            >
                                                {item.isVerified ? (
                                                    <Check className="w-5 h-5 text-success mx-auto" />
                                                ) : (
                                                    <Minus className="w-5 h-5 text-muted-foreground mx-auto" />
                                                )}
                                            </td>
                                        ))}
                                        {Array.from({ length: 3 - items.length }).map((_, i) => (
                                            <td
                                                key={`empty-${i}`}
                                                className="p-3 border-b border-border"
                                            />
                                        ))}
                                    </tr>

                                    {/* Facilities */}
                                    {allFacilities.map((facility) => {
                                        const Icon = getFacilityIcon(facility);
                                        return (
                                            <tr key={facility}>
                                                <td className="p-3 border-b border-border">
                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                        <Icon className="w-4 h-4 text-muted-foreground" />
                                                        {facility}
                                                    </div>
                                                </td>
                                                {items.map((item) => (
                                                    <td
                                                        key={item.id}
                                                        className="p-3 border-b border-border text-center"
                                                    >
                                                        {item.facilities.some(
                                                            (f) =>
                                                                f.toLowerCase() === facility.toLowerCase()
                                                        ) ? (
                                                            <Check className="w-5 h-5 text-success mx-auto" />
                                                        ) : (
                                                            <Minus className="w-5 h-5 text-muted-foreground mx-auto" />
                                                        )}
                                                    </td>
                                                ))}
                                                {Array.from({ length: 3 - items.length }).map(
                                                    (_, i) => (
                                                        <td
                                                            key={`empty-${i}`}
                                                            className="p-3 border-b border-border"
                                                        />
                                                    )
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ComparisonTool;
