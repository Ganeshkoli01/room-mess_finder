import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, MapPin, IndianRupee, Home, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { motion, AnimatePresence } from "framer-motion";

interface SmartSearchSuggestion {
    type: "room" | "mess" | "location" | "price" | "feature";
    text: string;
    query: Record<string, any>;
    icon: React.ReactNode;
}

const AISmartSearchBar = () => {
    const isAiSearchEnabled = useFeatureFlag("ai_search");
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<SmartSearchSuggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const navigate = useNavigate();
    const { toast } = useToast();

    if (!isAiSearchEnabled) return null;

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("recentSearches");
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
    }, []);

    // AI-powered query analysis
    const analyzeQuery = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsAnalyzing(true);

        try {
            // Simulate AI analysis (replace with actual Gemini AI call)
            const analyzed = await analyzeSearchWithAI(searchQuery);
            setSuggestions(analyzed);
        } catch (error) {
            console.error("Search analysis error:", error);
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            analyzeQuery(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, analyzeQuery]);

    // Handle search execution
    const executeSearch = (suggestion?: SmartSearchSuggestion) => {
        const searchText = suggestion?.text || query;

        // Save to recent searches
        const updated = [searchText, ...recentSearches.filter(s => s !== searchText)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));

        // Navigate with search params
        const params = new URLSearchParams();

        if (suggestion) {
            Object.entries(suggestion.query).forEach(([key, value]) => {
                params.set(key, String(value));
            });
        } else {
            params.set("q", searchText);
        }

        const targetPage = suggestion?.type === "mess" ? "/mess-listings" : "/room-listings";
        navigate(`${targetPage}?${params.toString()}`);

        toast({
            title: "🔍 Searching...",
            description: `Finding ${suggestion?.type || "listings"} for: ${searchText}`,
        });
    };

    const clearSearch = () => {
        setQuery("");
        setSuggestions([]);
    };

    const removeRecentSearch = (search: string) => {
        const updated = recentSearches.filter(s => s !== search);
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
    };

    return (
        <div className="relative w-full max-w-3xl mx-auto">
            {/* Search Input */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    {isAnalyzing && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                            <Sparkles className="w-4 h-4 text-primary" />
                        </motion.div>
                    )}
                </div>

                <Input
                    type="text"
                    placeholder="Try: 'cheap room near college under 5000' or 'mess with home food'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            executeSearch();
                        }
                    }}
                    className="pl-14 pr-12 h-14 text-base rounded-2xl border-2 focus:border-primary transition-all"
                />

                {query && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={clearSearch}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* AI Suggestions Dropdown */}
            <AnimatePresence>
                {(suggestions.length > 0 || recentSearches.length > 0) && query.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 w-full bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                        {/* AI Suggestions */}
                        {suggestions.length > 0 && (
                            <div className="p-2">
                                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                                    <Sparkles className="w-3 h-3" />
                                    AI Suggestions
                                </div>
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => executeSearch(suggestion)}
                                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-xl transition-colors text-left group"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            {suggestion.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                {suggestion.text}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {getSuggestionDescription(suggestion)}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {suggestion.type}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Recent Searches */}
                        {recentSearches.length > 0 && query.length < 3 && (
                            <div className="p-2 border-t">
                                <div className="flex items-center justify-between px-3 py-2">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Recent Searches
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => {
                                            setRecentSearches([]);
                                            localStorage.removeItem("recentSearches");
                                        }}
                                    >
                                        Clear All
                                    </Button>
                                </div>
                                {recentSearches.map((search, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-xl transition-colors group"
                                    >
                                        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <button
                                            onClick={() => setQuery(search)}
                                            className="flex-1 text-sm text-left truncate"
                                        >
                                            {search}
                                        </button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeRecentSearch(search)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
                <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                    onClick={() => setQuery("cheap room under 5000")}
                >
                    <IndianRupee className="w-3 h-3 mr-1" />
                    Budget Rooms
                </Badge>
                <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                    onClick={() => setQuery("mess with home food")}
                >
                    <Utensils className="w-3 h-3 mr-1" />
                    Home Food
                </Badge>
                <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                    onClick={() => setQuery("room near college")}
                >
                    <MapPin className="w-3 h-3 mr-1" />
                    Near College
                </Badge>
                <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                    onClick={() => setQuery("furnished room")}
                >
                    <Home className="w-3 h-3 mr-1" />
                    Furnished
                </Badge>
            </div>
        </div>
    );
};

// AI Analysis Function (to be replaced with actual Gemini AI)
async function analyzeSearchWithAI(query: string): Promise<SmartSearchSuggestion[]> {
    const lowerQuery = query.toLowerCase();
    const suggestions: SmartSearchSuggestion[] = [];

    // Price detection
    const priceMatch = lowerQuery.match(/(\d+)/);
    if (priceMatch) {
        const price = parseInt(priceMatch[1]);
        suggestions.push({
            type: "price",
            text: `Rooms under ₹${price}`,
            query: { maxPrice: price, type: "room" },
            icon: <IndianRupee className="w-4 h-4" />,
        });
    }

    // Location detection
    if (lowerQuery.includes("near") || lowerQuery.includes("college") || lowerQuery.includes("office")) {
        suggestions.push({
            type: "location",
            text: `Rooms near educational institutions`,
            query: { nearCollege: true },
            icon: <MapPin className="w-4 h-4" />,
        });
    }

    // Room type detection
    if (lowerQuery.includes("room") || lowerQuery.includes("pg") || lowerQuery.includes("hostel")) {
        suggestions.push({
            type: "room",
            text: `All available rooms`,
            query: { type: "room" },
            icon: <Home className="w-4 h-4" />,
        });
    }

    // Mess type detection
    if (lowerQuery.includes("mess") || lowerQuery.includes("food") || lowerQuery.includes("tiffin")) {
        suggestions.push({
            type: "mess",
            text: `Mess services with ${lowerQuery.includes("home") ? "home-style" : "quality"} food`,
            query: { type: "mess", foodType: lowerQuery.includes("home") ? "home" : "all" },
            icon: <Utensils className="w-4 h-4" />,
        });
    }

    // Feature detection
    if (lowerQuery.includes("furnished") || lowerQuery.includes("ac") || lowerQuery.includes("wifi")) {
        const feature = lowerQuery.includes("furnished") ? "Furnished" :
            lowerQuery.includes("ac") ? "AC" : "WiFi";
        suggestions.push({
            type: "feature",
            text: `Rooms with ${feature}`,
            query: { amenities: feature.toLowerCase() },
            icon: <Sparkles className="w-4 h-4" />,
        });
    }

    return suggestions;
}

// Helper function
function getSuggestionDescription(suggestion: SmartSearchSuggestion): string {
    switch (suggestion.type) {
        case "price":
            return "Budget-friendly options";
        case "location":
            return "Based on your location preference";
        case "room":
            return "Rooms, PGs, and hostels";
        case "mess":
            return "Mess and tiffin services";
        case "feature":
            return "Filtered by amenities";
        default:
            return "";
    }
}

export default AISmartSearchBar;
