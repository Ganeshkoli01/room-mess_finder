import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Mic,
    MicOff,
    X,
    Sparkles,
    Clock,
    Building2,
    UtensilsCrossed,
    Loader2,
    ArrowRight,
} from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { parseSmartSearch, SmartSearchResult } from "@/services/smartSearchService";
import { getSearchHistory, addToSearchHistory, SearchHistoryItem } from "@/services/recommendationsService";
import logger from "@/lib/logger";

interface SmartSearchBarProps {
    onSearch?: (result: SmartSearchResult) => void;
    placeholder?: string;
    className?: string;
}

const SmartSearchBar = ({ onSearch, placeholder, className = "" }: SmartSearchBarProps) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [searchResult, setSearchResult] = useState<SmartSearchResult | null>(null);
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        isListening,
        transcript,
        error: voiceError,
        isSupported: voiceSupported,
        startListening,
        stopListening,
        resetTranscript,
    } = useVoiceSearch();

    // Load search history
    useEffect(() => {
        setSearchHistory(getSearchHistory());
    }, []);

    // Update query when voice transcript changes
    useEffect(() => {
        if (transcript) {
            setQuery(transcript);
        }
    }, [transcript]);

    // Parse query with AI when typing stops
    useEffect(() => {
        if (query.length < 3) {
            setSearchResult(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsParsing(true);
            try {
                const result = await parseSmartSearch(query);
                setSearchResult(result);
                logger.debug("Smart search result", { context: "SmartSearch", data: result });
            } finally {
                setIsParsing(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = () => {
        if (!query.trim()) return;

        const result = searchResult || {
            type: "both" as const,
            keywords: query.split(" "),
            understood: query,
        };

        // Add to history
        addToSearchHistory(query, result.type);
        setSearchHistory(getSearchHistory());

        // Callback or navigate
        if (onSearch) {
            onSearch(result);
        } else {
            // Navigate to appropriate page
            const path = result.type === "mess" ? "/mess" : "/rooms";
            navigate(`${path}?q=${encodeURIComponent(query)}`);
        }

        setIsOpen(false);
    };

    const handleHistoryClick = (item: SearchHistoryItem) => {
        setQuery(item.query);
        setIsOpen(false);
        setTimeout(handleSearch, 100);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const toggleVoice = () => {
        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            startListening();
        }
    };

    const clearQuery = () => {
        setQuery("");
        setSearchResult(null);
        inputRef.current?.focus();
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative flex items-center">
                <div className="absolute left-4 flex items-center gap-2">
                    {isParsing ? (
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    ) : (
                        <Search className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>

                <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyPress}
                    placeholder={placeholder || "Search 'PG near college under 5000' or 'veg mess in Pune'..."}
                    className="pl-12 pr-24 h-14 text-base bg-card border-2 focus-visible:ring-primary rounded-2xl shadow-soft"
                />

                <div className="absolute right-3 flex items-center gap-1">
                    {query && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={clearQuery}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}

                    {voiceSupported && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${isListening ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={toggleVoice}
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                    )}

                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-gradient-to-r from-primary to-accent"
                        onClick={handleSearch}
                    >
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Voice listening indicator */}
            {isListening && (
                <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm">
                        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                        Listening... Speak now
                    </div>
                </div>
            )}

            {/* Voice error */}
            {voiceError && (
                <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
                    <div className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm">
                        {voiceError}
                    </div>
                </div>
            )}

            {/* Dropdown */}
            {isOpen && (query || searchHistory.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
                    {/* AI Understanding */}
                    {searchResult && query.length >= 3 && (
                        <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">AI Understanding</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{searchResult.understood}</p>

                            <div className="flex flex-wrap gap-2">
                                {searchResult.type !== "both" && (
                                    <Badge variant="secondary" className="gap-1">
                                        {searchResult.type === "room" ? <Building2 className="w-3 h-3" /> : <UtensilsCrossed className="w-3 h-3" />}
                                        {searchResult.type === "room" ? "Rooms" : "Mess"}
                                    </Badge>
                                )}
                                {searchResult.location && (
                                    <Badge variant="outline">{searchResult.location}</Badge>
                                )}
                                {searchResult.priceRange && (
                                    <Badge variant="outline">
                                        Up to ₹{searchResult.priceRange.max.toLocaleString()}
                                    </Badge>
                                )}
                                {searchResult.roomType?.map((type) => (
                                    <Badge key={type} variant="outline">{type}</Badge>
                                ))}
                                {searchResult.foodType && (
                                    <Badge variant="outline">{searchResult.foodType}</Badge>
                                )}
                                {searchResult.facilities?.map((facility) => (
                                    <Badge key={facility} variant="outline">{facility}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search History */}
                    {searchHistory.length > 0 && !searchResult && (
                        <div className="p-3">
                            <div className="flex items-center gap-2 mb-2 px-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Recent Searches</span>
                            </div>
                            <div className="space-y-1">
                                {searchHistory.slice(0, 5).map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleHistoryClick(item)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                                    >
                                        {item.type === "mess" ? (
                                            <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        <span className="text-sm">{item.query}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="p-3 bg-muted/30 border-t border-border">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Press Enter to search</span>
                            <Button
                                size="sm"
                                className="h-8 gap-1"
                                onClick={handleSearch}
                            >
                                Search
                                <ArrowRight className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartSearchBar;
