// External Food Service Integration
// Shows Zomato/Swiggy options when mess is closed

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, UtensilsCrossed, Clock, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExternalFoodOptionsProps {
    location?: string;
    messTimings?: string;
    isMessClosed?: boolean;
}

// Check if current time is outside mess timings
const checkIfMessClosed = (timings?: string): boolean => {
    if (!timings) return false;

    const now = new Date();
    const currentHour = now.getHours();

    // Parse timing string like "7AM - 10PM"
    const timeMatch = timings.match(/(\d+)(AM|PM)\s*-\s*(\d+)(AM|PM)/i);
    if (!timeMatch) return false;

    let startHour = parseInt(timeMatch[1]);
    const startPeriod = timeMatch[2].toUpperCase();
    let endHour = parseInt(timeMatch[3]);
    const endPeriod = timeMatch[4].toUpperCase();

    // Convert to 24-hour format
    if (startPeriod === "PM" && startHour !== 12) startHour += 12;
    if (startPeriod === "AM" && startHour === 12) startHour = 0;
    if (endPeriod === "PM" && endHour !== 12) endHour += 12;
    if (endPeriod === "AM" && endHour === 12) endHour = 0;

    // Check if current time is outside mess hours
    return currentHour < startHour || currentHour >= endHour;
};

const ExternalFoodOptions = ({
    location = "",
    messTimings,
    isMessClosed: forceClosed,
}: ExternalFoodOptionsProps) => {
    const { t } = useLanguage();

    const isMessClosed = forceClosed ?? checkIfMessClosed(messTimings);

    // Generate Zomato URL with location
    const getZomatoUrl = () => {
        const searchQuery = encodeURIComponent(location);
        return `https://www.zomato.com/search?q=${searchQuery}`;
    };

    // Generate Swiggy URL with location
    const getSwiggyUrl = () => {
        const searchQuery = encodeURIComponent(location);
        return `https://www.swiggy.com/search?query=${searchQuery}`;
    };

    if (!isMessClosed) return null;

    return (
        <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            {t("food.messIsClosed")}
                            <Badge variant="outline" className="text-warning border-warning">
                                Closed Now
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Order food from these popular delivery apps
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {/* Zomato */}
                    <a
                        href={getZomatoUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                    >
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-[#E23744] hover:bg-[#E23744]/5 transition-all">
                            <div className="w-10 h-10 rounded-lg bg-[#E23744] flex items-center justify-center">
                                <UtensilsCrossed className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm group-hover:text-[#E23744] transition-colors">
                                    Zomato
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Order now
                                </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-[#E23744] transition-colors" />
                        </div>
                    </a>

                    {/* Swiggy */}
                    <a
                        href={getSwiggyUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                    >
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-[#FC8019] hover:bg-[#FC8019]/5 transition-all">
                            <div className="w-10 h-10 rounded-lg bg-[#FC8019] flex items-center justify-center">
                                <UtensilsCrossed className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm group-hover:text-[#FC8019] transition-colors">
                                    Swiggy
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Order now
                                </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-[#FC8019] transition-colors" />
                        </div>
                    </a>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-3">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Opens external app. Delivery charges may apply.
                </p>
            </CardContent>
        </Card>
    );
};

// Compact version for cards
export const ExternalFoodBadge = ({ location }: { location: string }) => {
    return (
        <div className="flex items-center gap-2 mt-2">
            <a
                href={`https://www.zomato.com/search?q=${encodeURIComponent(location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#E23744]/10 text-[#E23744] text-xs hover:bg-[#E23744]/20 transition-colors"
            >
                <UtensilsCrossed className="w-3 h-3" />
                Zomato
            </a>
            <a
                href={`https://www.swiggy.com/search?query=${encodeURIComponent(location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#FC8019]/10 text-[#FC8019] text-xs hover:bg-[#FC8019]/20 transition-colors"
            >
                <UtensilsCrossed className="w-3 h-3" />
                Swiggy
            </a>
        </div>
    );
};

export default ExternalFoodOptions;
