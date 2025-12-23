import { MapPin, Navigation, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/contexts/LocationContext";
import { useState } from "react";

const LocationBanner = () => {
    const { location, loading, error, permissionState, requestLocation } = useLocation();
    const [dismissed, setDismissed] = useState(false);

    // Don't show if already have location or dismissed
    if (location || dismissed) return null;

    // Don't show if permission is denied (show different UI in that case)
    if (permissionState === "denied") {
        return (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground">Location Access Denied</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Enable location in your browser settings to find rooms and mess near you.
                        </p>
                    </div>
                    <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Enable Location</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Allow location access to find rooms and mess options near you, sorted by distance.
                    </p>
                    {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={requestLocation}
                        disabled={loading}
                        className="gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Detecting...
                            </>
                        ) : (
                            <>
                                <MapPin className="w-4 h-4" />
                                Enable
                            </>
                        )}
                    </Button>
                    <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationBanner;
