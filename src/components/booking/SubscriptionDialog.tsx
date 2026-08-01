// Mess Subscription Dialog
// Allows users to subscribe to a mess with daily/weekly/monthly plans

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    CheckCircle,
    Loader2,
    UtensilsCrossed,
    Calendar,
    CalendarDays,
    CalendarRange,
    Coffee,
    Sun,
    Moon,
    CreditCard,
    QrCode,
    Smartphone,
    Building,
    RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createSubscription, getActiveSubscription } from "@/services/bookingService";
import { generateOrderId, PaymentDetails, PaymentResult, getPlanPrices } from "@/services/paymentService";
import { useLanguage } from "@/contexts/LanguageContext";
import { RazorpayCheckoutModal } from "@/components/payment/RazorpayCheckoutModal";

interface SubscriptionDialogProps {
    messId: string;
    messTitle: string;
    monthlyPrice: number;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

type PlanType = "daily" | "weekly" | "monthly";
type MealType = "breakfast" | "lunch" | "dinner";

const SubscriptionDialog = ({
    messId,
    messTitle,
    monthlyPrice,
    trigger,
    onSuccess,
}: SubscriptionDialogProps) => {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"plan" | "meals" | "payment" | "success">("plan");
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanType>("monthly");
    const [selectedMeals, setSelectedMeals] = useState<MealType[]>(["breakfast", "lunch", "dinner"]);
    const [renewing, setRenewing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking" | "razorpay">("upi");
    const { toast } = useToast();
    const { user } = useAuth();
    const { t } = useLanguage();

    // Check if user already has active subscription
    const existingSubscription = user ? getActiveSubscription(user.id, messId) : null;

    const prices = getPlanPrices(monthlyPrice);

    // Adjust price based on meals selected (each meal is ~33%)
    const mealMultiplier = selectedMeals.length / 3;
    const adjustedPrices = {
        daily: Math.round(prices.daily * mealMultiplier),
        weekly: Math.round(prices.weekly * mealMultiplier),
        monthly: Math.round(prices.monthly * mealMultiplier),
    };

    const planDetails = {
        daily: {
            label: t('payment.daily'),
            icon: Calendar,
            price: adjustedPrices.daily,
            description: "1 day access",
            badge: undefined as string | undefined,
        },
        weekly: {
            label: t('payment.weekly'),
            icon: CalendarDays,
            price: adjustedPrices.weekly,
            description: "7 days access",
            badge: "Popular",
        },
        monthly: {
            label: t('payment.monthly'),
            icon: CalendarRange,
            price: adjustedPrices.monthly,
            description: "30 days access",
            badge: "Best Value",
        },
    };

    const mealOptions = [
        { id: "breakfast" as MealType, label: "Breakfast", icon: Coffee, time: "7 AM - 10 AM" },
        { id: "lunch" as MealType, label: "Lunch", icon: Sun, time: "12 PM - 3 PM" },
        { id: "dinner" as MealType, label: "Dinner", icon: Moon, time: "7 PM - 10 PM" },
    ];

    const toggleMeal = (meal: MealType) => {
        setSelectedMeals(prev =>
            prev.includes(meal)
                ? prev.filter(m => m !== meal)
                : [...prev, meal]
        );
    };

    const handleSubscribe = async () => {
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to subscribe",
                variant: "destructive",
            });
            return;
        }

        if (selectedMeals.length === 0) {
            toast({
                title: "Select Meals",
                description: "Please select at least one meal",
                variant: "destructive",
            });
            return;
        }

        setStep("payment");
    };

    const [showRazorpayModal, setShowRazorpayModal] = useState(false);
    const [pendingDetails, setPendingDetails] = useState<PaymentDetails | null>(null);

    const handlePayment = () => {
        const activeUserId = user?.id || `user_${Date.now()}`;
        const activeUserEmail = user?.email || "user@example.com";
        const activeUserName = user?.user_metadata?.first_name || "Subscriber";
        const amount = planDetails[selectedPlan].price;

        const paymentDetails: PaymentDetails = {
            amount,
            currency: "INR",
            orderId: generateOrderId(),
            listingId: messId,
            listingType: "mess",
            listingTitle: messTitle,
            planType: selectedPlan,
            userId: activeUserId,
            userEmail: activeUserEmail,
            userName: activeUserName,
            paymentMethod: paymentMethod,
        };

        setPendingDetails(paymentDetails);
        setShowRazorpayModal(true);
    };

    const handleRazorpaySuccess = async (paymentResult: PaymentResult) => {
        if (!pendingDetails) return;
        const result = await createSubscription({
            userId: pendingDetails.userId,
            messId,
            messTitle,
            planType: selectedPlan,
            amount: pendingDetails.amount,
            mealTypes: selectedMeals,
        });

        if (result.success) {
            setStep("success");
            toast({
                title: "Subscription Active! 🎉",
                description: `Your ${selectedPlan} subscription to ${messTitle} is now active.`,
            });
            onSuccess?.();
        } else {
            toast({
                title: "Subscription Failed",
                description: result.error || "Could not activate subscription",
                variant: "destructive",
            });
        }
    };

    const handleRazorpayFailure = (error: Error) => {
        toast({
            title: "Payment Failed",
            description: error.message || "Payment process could not be completed.",
            variant: "destructive",
        });
    };

    const handleClose = () => {
        setOpen(false);
        setTimeout(() => {
            setStep("plan");
            setSelectedPlan("monthly");
            setSelectedMeals(["breakfast", "lunch", "dinner"]);
        }, 300);
    };

    // If already subscribed and not explicitly renewing, show active status with option to renew/change
    if (existingSubscription && !renewing) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="outline" className="gap-2">
                            <CheckCircle className="w-4 h-4 text-success" />
                            Subscribed
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-success">
                            <CheckCircle className="w-5 h-5" />
                            Active Subscription
                        </DialogTitle>
                        <DialogDescription>
                            You have an active subscription to this mess
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="p-4 bg-success/10 rounded-xl space-y-2 border border-success/20">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Mess</span>
                                <span className="font-medium text-foreground">{existingSubscription.messTitle}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Plan</span>
                                <span className="capitalize font-medium text-foreground">{existingSubscription.planType}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Meals</span>
                                <span className="capitalize font-medium text-foreground">{existingSubscription.mealTypes.join(", ")}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Valid Until</span>
                                <span className="font-medium text-success">
                                    {new Date(existingSubscription.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex-col gap-2">
                        <Button
                            onClick={() => setRenewing(true)}
                            className="w-full gap-2 bg-primary hover:bg-primary/90"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Renew / Change Subscription Plan
                        </Button>
                        <Button variant="outline" onClick={handleClose} className="w-full">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <UtensilsCrossed className="w-4 h-4" />
                        Subscribe
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                {step === "plan" && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UtensilsCrossed className="w-5 h-5 text-primary" />
                                Subscribe to Mess
                            </DialogTitle>
                            <DialogDescription>
                                Choose a plan for <strong>{messTitle}</strong>
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
                                                            {detail.description}
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
                        </div>

                        <DialogFooter>
                            <Button onClick={() => setStep("meals")} className="w-full">
                                Select Meals
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === "meals" && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UtensilsCrossed className="w-5 h-5 text-primary" />
                                Select Meals
                            </DialogTitle>
                            <DialogDescription>
                                Choose which meals you want included
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-3">
                            {mealOptions.map((meal) => {
                                const Icon = meal.icon;
                                const isSelected = selectedMeals.includes(meal.id);

                                return (
                                    <div
                                        key={meal.id}
                                        onClick={() => toggleMeal(meal.id)}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox checked={isSelected} />
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Icon className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <span className="font-semibold">{meal.label}</span>
                                                <p className="text-xs text-muted-foreground">{meal.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="mt-4 p-4 bg-muted rounded-xl">
                                <div className="flex justify-between">
                                    <span>Selected Plan:</span>
                                    <span className="font-medium capitalize">{selectedPlan}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Meals:</span>
                                    <span className="capitalize">{selectedMeals.length}/3</span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-semibold">
                                    <span>Total:</span>
                                    <span className="text-primary">
                                        ₹{planDetails[selectedPlan].price.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex-col gap-2">
                            <Button
                                onClick={handleSubscribe}
                                disabled={selectedMeals.length === 0}
                                className="w-full"
                            >
                                Continue to Payment
                            </Button>
                            <Button variant="outline" onClick={() => setStep("plan")} className="w-full">
                                Back
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === "payment" && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                Complete Payment
                            </DialogTitle>
                            <DialogDescription>
                                Select a payment method to activate your subscription
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            {/* Summary Card */}
                            <div className="p-4 bg-muted/60 rounded-xl space-y-2 border border-border">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Mess</span>
                                    <span className="font-medium">{messTitle}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Plan</span>
                                    <span className="capitalize font-medium">{selectedPlan}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Meals</span>
                                    <span className="capitalize font-medium">{selectedMeals.join(", ")}</span>
                                </div>
                                <hr className="border-border" />
                                <div className="flex justify-between font-semibold text-lg">
                                    <span>Total Payable Amount</span>
                                    <span className="text-primary font-bold">
                                        ₹{planDetails[selectedPlan].price.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Select Payment Method
                                </Label>
                                <RadioGroup
                                    value={paymentMethod}
                                    onValueChange={(val) => setPaymentMethod(val as any)}
                                    className="grid grid-cols-2 gap-2"
                                >
                                    <div>
                                        <RadioGroupItem value="upi" id="pm-upi" className="peer sr-only" />
                                        <Label
                                            htmlFor="pm-upi"
                                            className="flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted text-center"
                                        >
                                            <Smartphone className="w-5 h-5 text-primary mb-1" />
                                            <span className="text-xs font-semibold">UPI / GPay</span>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="card" id="pm-card" className="peer sr-only" />
                                        <Label
                                            htmlFor="pm-card"
                                            className="flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted text-center"
                                        >
                                            <CreditCard className="w-5 h-5 text-primary mb-1" />
                                            <span className="text-xs font-semibold">Card</span>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="netbanking" id="pm-nb" className="peer sr-only" />
                                        <Label
                                            htmlFor="pm-nb"
                                            className="flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted text-center"
                                        >
                                            <Building className="w-5 h-5 text-primary mb-1" />
                                            <span className="text-xs font-semibold">Net Banking</span>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="razorpay" id="pm-rzp" className="peer sr-only" />
                                        <Label
                                            htmlFor="pm-rzp"
                                            className="flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted text-center"
                                        >
                                            <QrCode className="w-5 h-5 text-primary mb-1" />
                                            <span className="text-xs font-semibold">Razorpay</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <DialogFooter className="flex-col gap-2">
                            <Button onClick={handlePayment} disabled={loading} className="w-full gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing Payment...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Pay ₹{planDetails[selectedPlan].price.toLocaleString()}
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setStep("meals")} className="w-full">
                                Back
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === "success" && (
                    <div className="py-8 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4">
                            <CheckCircle className="w-10 h-10 text-success" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Subscription Active! 🎉</h3>
                        <p className="text-muted-foreground mb-4">
                            Your {selectedPlan} subscription to <strong>{messTitle}</strong> is now active.
                            <br />
                            Meals: {selectedMeals.join(", ")}
                        </p>
                        <Button onClick={handleClose} className="w-full">
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
            <RazorpayCheckoutModal
                open={showRazorpayModal}
                onOpenChange={setShowRazorpayModal}
                details={pendingDetails}
                onSuccess={handleRazorpaySuccess}
                onFailure={handleRazorpayFailure}
            />
        </Dialog>
    );
};

export default SubscriptionDialog;
