import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    CreditCard,
    Calendar,
    CalendarDays,
    CalendarRange,
    Shield,
    Loader2,
    CheckCircle,
    Download,
    IndianRupee,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
    initiatePayment,
    generateOrderId,
    getPlanPrices,
    downloadReceipt,
    PaymentDetails,
    PaymentReceipt,
} from "@/services/paymentService";
import {
    addNotification,
    notificationTemplates,
} from "@/services/notificationService";

interface PaymentDialogProps {
    listingId: string;
    listingType: "room" | "mess";
    listingTitle: string;
    basePrice: number;
    trigger?: React.ReactNode;
}

type PlanType = "daily" | "weekly" | "monthly";

const PaymentDialog = ({
    listingId,
    listingType,
    listingTitle,
    basePrice,
    trigger,
}: PaymentDialogProps) => {
    const [open, setOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanType>("monthly");
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();

    const prices = getPlanPrices(basePrice);

    const planDetails = {
        daily: {
            label: "Daily",
            icon: Calendar,
            price: prices.daily,
            description: "Pay per day",
            duration: "1 day access",
            badge: undefined as string | undefined,
        },
        weekly: {
            label: "Weekly",
            icon: CalendarDays,
            price: prices.weekly,
            description: "10% discount",
            duration: "7 days access",
            badge: "Popular",
        },
        monthly: {
            label: "Monthly",
            icon: CalendarRange,
            price: prices.monthly,
            description: "Best value",
            duration: "30 days access",
            badge: "Best Value",
        },
    };

    const handlePayment = async () => {
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to make a payment.",
                variant: "destructive",
            });
            return;
        }

        const paymentDetails: PaymentDetails = {
            amount: planDetails[selectedPlan].price,
            currency: "INR",
            orderId: generateOrderId(),
            listingId,
            listingType,
            listingTitle,
            planType: selectedPlan,
            userId: user.id,
            userEmail: user.email || "",
            userName: user.user_metadata?.first_name || "User",
        };

        // Close dialog before opening Razorpay to prevent z-index issues
        setOpen(false);

        // Wait for dialog to close before opening Razorpay
        setTimeout(async () => {
            setIsProcessing(true);

            try {
                const result = await initiatePayment(paymentDetails);

                if (result.success) {
                    // Reopen dialog to show success
                    setOpen(true);
                    setPaymentSuccess(true);
                    setReceipt({
                        id: result.orderId,
                        transactionId: result.transactionId,
                        orderId: result.orderId,
                        amount: result.amount,
                        currency: "INR",
                        listingTitle,
                        listingType,
                        planType: selectedPlan,
                        userName: paymentDetails.userName,
                        userEmail: paymentDetails.userEmail,
                        timestamp: result.timestamp,
                        status: "success",
                    });

                    // Add notification
                    addNotification(
                        notificationTemplates.paymentSuccess(result.amount, listingTitle),
                        user?.id
                    );

                    toast({
                        title: "Payment Successful! 🎉",
                        description: `Your ${selectedPlan} plan for ${listingTitle} is now active.`,
                    });
                }
            } catch (error: any) {
                toast({
                    title: "Payment Failed",
                    description: error.message || "Something went wrong. Please try again.",
                    variant: "destructive",
                });

                addNotification(notificationTemplates.paymentFailed(listingTitle), user?.id);

                // Reopen dialog on failure so user can try again
                setOpen(true);
            } finally {
                setIsProcessing(false);
            }
        }, 300); // Wait for dialog close animation
    };

    const handleDownloadReceipt = () => {
        if (receipt) {
            downloadReceipt(receipt);
        }
    };

    const handleClose = () => {
        setOpen(false);
        // Reset state after dialog closes
        setTimeout(() => {
            setPaymentSuccess(false);
            setReceipt(null);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <CreditCard className="w-4 h-4" />
                        Pay Now
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                {!paymentSuccess ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                Choose Your Plan
                            </DialogTitle>
                            <DialogDescription>
                                Select a subscription plan for <strong>{listingTitle}</strong>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <RadioGroup
                                value={selectedPlan}
                                onValueChange={(value) => setSelectedPlan(value as PlanType)}
                                className="space-y-3"
                            >
                                {(Object.keys(planDetails) as PlanType[]).map((plan) => {
                                    const detail = planDetails[plan];
                                    const Icon = detail.icon;

                                    return (
                                        <div key={plan}>
                                            <RadioGroupItem
                                                value={plan}
                                                id={plan}
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor={plan}
                                                className="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Icon className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{detail.label}</span>
                                                            {detail.badge && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {detail.badge}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {detail.duration} • {detail.description}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-primary">
                                                        ₹{detail.price.toLocaleString()}
                                                    </div>
                                                </div>
                                            </Label>
                                        </div>
                                    );
                                })}
                            </RadioGroup>

                            <Separator className="my-4" />

                            <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Amount</p>
                                    <p className="text-2xl font-bold text-foreground flex items-center">
                                        <IndianRupee className="w-5 h-5" />
                                        {planDetails[selectedPlan].price.toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-success text-sm">
                                    <Shield className="w-4 h-4" />
                                    Secure Payment
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex-col gap-2 sm:flex-col">
                            <Button
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="w-full gap-2"
                                size="lg"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Pay ₹{planDetails[selectedPlan].price.toLocaleString()}
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                Powered by Razorpay • 100% Secure
                            </p>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader className="text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                                <CheckCircle className="w-10 h-10 text-success" />
                            </div>
                            <DialogTitle className="text-2xl">Payment Successful!</DialogTitle>
                            <DialogDescription>
                                Your {selectedPlan} plan is now active
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            <div className="p-4 bg-muted rounded-xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Transaction ID</span>
                                    <span className="font-mono">{receipt?.transactionId}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Amount Paid</span>
                                    <span className="font-semibold text-success">
                                        ₹{receipt?.amount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Plan</span>
                                    <span className="capitalize">{receipt?.planType}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Listing</span>
                                    <span className="truncate max-w-[150px]">{receipt?.listingTitle}</span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex-col gap-2 sm:flex-col">
                            <Button
                                onClick={handleDownloadReceipt}
                                variant="outline"
                                className="w-full gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download Receipt
                            </Button>
                            <Button onClick={handleClose} className="w-full">
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PaymentDialog;
