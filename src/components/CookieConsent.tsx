import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cookie, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("cookie-consent");
        if (!consent) {
            // Delay showing the banner for better UX
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptAll = () => {
        localStorage.setItem("cookie-consent", JSON.stringify({
            necessary: true,
            analytics: true,
            marketing: true,
            timestamp: Date.now(),
        }));
        setIsVisible(false);
    };

    const handleRejectAll = () => {
        localStorage.setItem("cookie-consent", JSON.stringify({
            necessary: true,
            analytics: false,
            marketing: false,
            timestamp: Date.now(),
        }));
        setIsVisible(false);
    };

    const handleSavePreferences = () => {
        // In a real app, you'd save the actual preferences
        localStorage.setItem("cookie-consent", JSON.stringify({
            necessary: true,
            analytics: true,
            marketing: false,
            timestamp: Date.now(),
        }));
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                    }}
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
                >
                    <div className="max-w-4xl mx-auto">
                        <div className="glass rounded-2xl p-6 shadow-2xl border border-border/50">
                            <AnimatePresence mode="wait">
                                {!showPreferences ? (
                                    <motion.div
                                        key="main"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col md:flex-row items-start md:items-center gap-4"
                                    >
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Cookie className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-heading font-semibold text-foreground mb-1">
                                                    We value your privacy 🍪
                                                </h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                                                    By clicking "Accept All", you consent to our use of cookies.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowPreferences(true)}
                                                className="gap-2"
                                            >
                                                <Settings className="w-4 h-4" />
                                                Customize
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleRejectAll}
                                            >
                                                Reject All
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleAcceptAll}
                                                className="gap-2"
                                            >
                                                <Shield className="w-4 h-4" />
                                                Accept All
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="preferences"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-heading font-semibold text-foreground">
                                                Cookie Preferences
                                            </h3>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShowPreferences(false)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-4 mb-6">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                <div>
                                                    <p className="font-medium text-sm">Necessary Cookies</p>
                                                    <p className="text-xs text-muted-foreground">Required for the website to function</p>
                                                </div>
                                                <span className="text-xs text-muted-foreground">Always On</span>
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                <div>
                                                    <p className="font-medium text-sm">Analytics Cookies</p>
                                                    <p className="text-xs text-muted-foreground">Help us improve our service</p>
                                                </div>
                                                <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" />
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                <div>
                                                    <p className="font-medium text-sm">Marketing Cookies</p>
                                                    <p className="text-xs text-muted-foreground">Used for personalized ads</p>
                                                </div>
                                                <input type="checkbox" className="w-4 h-4 accent-primary" />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setShowPreferences(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="default" size="sm" onClick={handleSavePreferences}>
                                                Save Preferences
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
