import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle,
    XCircle,
    Download,
    Mail,
    Copy,
    ExternalLink,
    Sparkles,
    Clock,
    CreditCard,
    User,
    Building2,
    Calendar,
    IndianRupee,
    FileText,
    Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

export interface PaymentResult {
    success: boolean;
    paymentId?: string;
    orderId?: string;
    amount: number;
    listingName: string;
    listingType: "room" | "mess";
    userName: string;
    userEmail: string;
    userPhone: string;
    transactionDate: Date;
    planType?: string;
    duration?: string;
    errorMessage?: string;
}

interface PaymentResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: PaymentResult;
    onDownloadReceipt: () => void;
    onEmailReceipt: () => void;
}

const PaymentResultModal = ({
    isOpen,
    onClose,
    result,
    onDownloadReceipt,
    onEmailReceipt,
}: PaymentResultModalProps) => {
    const { toast } = useToast();
    const [countdown, setCountdown] = useState(5);
    const [showDetails, setShowDetails] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Countdown timer
    useEffect(() => {
        if (!isOpen) {
            setCountdown(5);
            setShowDetails(false);
            setEmailSent(false);
            return;
        }

        // Trigger confetti on success
        if (result.success) {
            const duration = 3 * 1000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#10b981', '#34d399', '#6ee7b7'],
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#10b981', '#34d399', '#6ee7b7'],
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }

        // Show details after animation
        const detailsTimer = setTimeout(() => {
            setShowDetails(true);
        }, 2000);

        // Countdown
        const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearTimeout(detailsTimer);
            clearInterval(countdownInterval);
        };
    }, [isOpen, result.success]);

    const copyPaymentId = () => {
        if (result.paymentId) {
            navigator.clipboard.writeText(result.paymentId);
            toast({
                title: "Copied!",
                description: "Payment ID copied to clipboard",
            });
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await onDownloadReceipt();
            toast({
                title: "Receipt Downloaded",
                description: "Your payment receipt has been downloaded as PDF",
            });
        } catch (error) {
            toast({
                title: "Download Failed",
                description: "Please try again",
                variant: "destructive",
            });
        } finally {
            setDownloading(false);
        }
    };

    const handleEmailReceipt = async () => {
        try {
            await onEmailReceipt();
            setEmailSent(true);
            toast({
                title: "Email Sent!",
                description: `Receipt sent to ${result.userEmail}`,
            });
        } catch (error) {
            toast({
                title: "Email Failed",
                description: "Please download the receipt instead",
                variant: "destructive",
            });
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
                >
                    {/* Animated Header */}
                    <div
                        className={`relative p-8 text-center ${result.success
                                ? "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500"
                                : "bg-gradient-to-br from-red-500 via-rose-500 to-pink-500"
                            }`}
                    >
                        {/* Animated Background Circles */}
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={`absolute rounded-full ${result.success ? "bg-white/10" : "bg-white/10"
                                        }`}
                                    style={{
                                        width: 100 + i * 50,
                                        height: 100 + i * 50,
                                        left: `${20 + i * 10}%`,
                                        top: `${-20 + i * 5}%`,
                                    }}
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.1, 0.2, 0.1],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Icon Animation */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                delay: 0.2,
                            }}
                            className="relative z-10"
                        >
                            <div
                                className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${result.success ? "bg-white/20" : "bg-white/20"
                                    }`}
                            >
                                {result.success ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: [0, 1.2, 1] }}
                                        transition={{ delay: 0.5, duration: 0.5 }}
                                    >
                                        <CheckCircle className="w-14 h-14 text-white" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                                        transition={{ delay: 0.5, duration: 0.5 }}
                                    >
                                        <XCircle className="w-14 h-14 text-white" />
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>

                        {/* Title */}
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="text-2xl font-bold text-white mt-4 relative z-10"
                        >
                            {result.success ? (
                                <span className="flex items-center justify-center gap-2">
                                    Payment Successful! <Sparkles className="w-5 h-5" />
                                </span>
                            ) : (
                                "Payment Failed"
                            )}
                        </motion.h2>

                        {/* Amount */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.9 }}
                            className="text-4xl font-bold text-white mt-2 relative z-10"
                        >
                            {formatAmount(result.amount)}
                        </motion.p>
                    </div>

                    {/* Details Section */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="p-6 space-y-4"
                            >
                                {result.success ? (
                                    <>
                                        {/* Transaction Details */}
                                        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                                Transaction Details
                                            </h3>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <CreditCard className="w-4 h-4" />
                                                        Payment ID
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <code className="text-xs bg-background px-2 py-1 rounded">
                                                            {result.paymentId?.slice(0, 15)}...
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={copyPaymentId}
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Building2 className="w-4 h-4" />
                                                        {result.listingType === "room" ? "Room" : "Mess"}
                                                    </span>
                                                    <span className="text-sm font-medium truncate max-w-[180px]">
                                                        {result.listingName}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        Date & Time
                                                    </span>
                                                    <span className="text-sm font-medium">
                                                        {formatDate(result.transactionDate)}
                                                    </span>
                                                </div>

                                                {result.planType && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                            <Clock className="w-4 h-4" />
                                                            Plan
                                                        </span>
                                                        <span className="text-sm font-medium capitalize">
                                                            {result.planType} ({result.duration})
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <User className="w-4 h-4" />
                                                        Customer
                                                    </span>
                                                    <span className="text-sm font-medium">
                                                        {result.userName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="outline"
                                                className="gap-2"
                                                onClick={handleDownload}
                                                disabled={downloading}
                                            >
                                                {downloading ? (
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{
                                                            repeat: Infinity,
                                                            duration: 1,
                                                        }}
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </motion.div>
                                                ) : (
                                                    <Download className="w-4 h-4" />
                                                )}
                                                {downloading ? "Generating..." : "Download PDF"}
                                            </Button>

                                            <Button
                                                variant="outline"
                                                className="gap-2"
                                                onClick={handleEmailReceipt}
                                                disabled={emailSent}
                                            >
                                                <Mail className="w-4 h-4" />
                                                {emailSent ? "Sent!" : "Email Receipt"}
                                            </Button>
                                        </div>

                                        {/* Success Message */}
                                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                                🎉 Your {result.listingType === "room" ? "booking" : "subscription"} is confirmed!
                                                Check your email for details.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Error Details */}
                                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                                                {result.errorMessage || "Something went wrong with your payment. Please try again."}
                                            </p>
                                            <p className="text-xs text-red-600 dark:text-red-400">
                                                No money has been deducted from your account. If any amount was debited, it will be refunded within 5-7 business days.
                                            </p>
                                        </div>

                                        <Button
                                            className="w-full gap-2"
                                            onClick={onClose}
                                        >
                                            Try Again
                                        </Button>
                                    </>
                                )}

                                {/* Close Button */}
                                <Button
                                    variant="ghost"
                                    className="w-full text-muted-foreground"
                                    onClick={onClose}
                                >
                                    {countdown > 0 ? `Close (${countdown}s)` : "Close"}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PaymentResultModal;
