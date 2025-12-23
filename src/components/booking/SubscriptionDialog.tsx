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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createSubscription, getActiveSubscription } from "@/services/bookingService";
import { initiatePayment, generateOrderId, PaymentDetails, getPlanPrices } from "@/services/paymentService";
import { useLanguage } from "@/contexts/LanguageContext";

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

    const handlePayment = async () => {
        if (!user) return;

        setLoading(true);

        try {
            const amount = planDetails[selectedPlan].price;

            // Create payment
            const paymentDetails: PaymentDetails = {
                amount,
                currency: "INR",
                orderId: generateOrderId(),
                listingId: messId,
                listingType: "mess",
                listingTitle: messTitle,
                planType: selectedPlan,
                userId: user.id,
                userEmail: user.email || "",
                userName: user.user_metadata?.first_name || "User",
            };

            const paymentResult = await initiatePayment(paymentDetails);

            if (paymentResult.success) {
                // Create subscription
                const result = createSubscription({
                    userId: user.id,
                    messId,
                    messTitle,
                    planType: selectedPlan,
                    amount,
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
                    throw new Error(result.error);
                }
            }
        } catch (error: any) {
            toast({
                title: "Payment Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setTimeout(() => {
            setStep("plan");
            setSelectedPlan("monthly");
            setSelectedMeals(["breakfast", "lunch", "dinner"]);
        }, 300);
    };

    // If already subscribed, show status
    if (existingSubscription) {
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
                        <div className="p-4 bg-success/10 rounded-xl space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Mess</span>
                                <span className="font-medium">{existingSubscription.messTitle}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Plan</span>
                                <span className="capitalize">{existingSubscription.planType}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Meals</span>
                                <span className="capitalize">{existingSubscription.mealTypes.join(", ")}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Valid Until</span>
                                <span className="font-medium text-success">
                                    {new Date(existingSubscription.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleClose} className="w-full">
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
                                Pay to activate your subscription
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <div className="p-4 bg-muted rounded-xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Mess</span>
                                    <span className="font-medium">{messTitle}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Plan</span>
                                    <span className="capitalize">{selectedPlan}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Meals</span>
                                    <span className="capitalize">{selectedMeals.join(", ")}</span>
                                </div>
                                <hr />
                                <div className="flex justify-between font-semibold text-lg">
                                    <span>Amount</span>
                                    <span className="text-primary">
                                        ₹{planDetails[selectedPlan].price.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex-col gap-2">
                            <Button onClick={handlePayment} disabled={loading} className="w-full gap-2">
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
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
        </Dialog>
    );
};

export default SubscriptionDialog;
