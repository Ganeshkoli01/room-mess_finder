// Room Booking Dialog
// Allows users to book a room after enquiry is approved

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    CalendarIcon,
    CheckCircle,
    Loader2,
    Home,
    CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createBooking, Enquiry } from "@/services/bookingService";
import { initiatePayment, generateOrderId, PaymentDetails } from "@/services/paymentService";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingDialogProps {
    enquiry: Enquiry;
    monthlyRent: number;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

const BookingDialog = ({
    enquiry,
    monthlyRent,
    trigger,
    onSuccess,
}: BookingDialogProps) => {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"details" | "payment" | "success">("details");
    const [loading, setLoading] = useState(false);
    const [moveInDate, setMoveInDate] = useState<Date>();
    const [duration, setDuration] = useState<number>(1); // months
    const { toast } = useToast();
    const { user } = useAuth();
    const { t } = useLanguage();

    const totalAmount = monthlyRent * duration;
    const securityDeposit = monthlyRent; // 1 month security
    const grandTotal = totalAmount + securityDeposit;

    const handleBooking = async () => {
        if (!moveInDate) {
            toast({
                title: "Select Date",
                description: "Please select a move-in date",
                variant: "destructive",
            });
            return;
        }

        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to book",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            // Create booking
            const endDate = new Date(moveInDate);
            endDate.setMonth(endDate.getMonth() + duration);

            const result = createBooking({
                enquiryId: enquiry.id,
                userId: user.id,
                listingId: enquiry.listingId,
                listingType: enquiry.listingType,
                listingTitle: enquiry.listingTitle,
                startDate: moveInDate,
                endDate,
                amount: grandTotal,
            });

            if (result.success) {
                setStep("payment");
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Booking Failed",
                description: error.message || "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!user) return;

        setLoading(true);

        try {
            const paymentDetails: PaymentDetails = {
                amount: grandTotal,
                currency: "INR",
                orderId: generateOrderId(),
                listingId: enquiry.listingId,
                listingType: enquiry.listingType,
                listingTitle: enquiry.listingTitle,
                planType: "monthly",
                userId: user.id,
                userEmail: user.email || enquiry.userEmail,
                userName: enquiry.userName,
            };

            const result = await initiatePayment(paymentDetails);

            if (result.success) {
                setStep("success");
                toast({
                    title: "Booking Confirmed! 🎉",
                    description: `Your room at ${enquiry.listingTitle} is booked.`,
                });
                onSuccess?.();
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
            setStep("details");
            setMoveInDate(undefined);
            setDuration(1);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <Home className="w-4 h-4" />
                        Book Now
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                {step === "details" && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Home className="w-5 h-5 text-primary" />
                                Book Room
                            </DialogTitle>
                            <DialogDescription>
                                Complete your booking for <strong>{enquiry.listingTitle}</strong>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            {/* Move-in Date */}
                            <div className="space-y-2">
                                <Label>Move-in Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {moveInDate ? format(moveInDate, "PPP") : "Select date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={moveInDate}
                                            onSelect={setMoveInDate}
                                            disabled={(date) => date < new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Duration */}
                            <div className="space-y-2">
                                <Label>Duration (months)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                                />
                            </div>

                            {/* Price Breakdown */}
                            <div className="p-4 bg-muted rounded-xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Monthly Rent</span>
                                    <span>₹{monthlyRent.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Duration</span>
                                    <span>{duration} month(s)</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Rent Total</span>
                                    <span>₹{totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Security Deposit</span>
                                    <span>₹{securityDeposit.toLocaleString()}</span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-semibold">
                                    <span>Grand Total</span>
                                    <span className="text-primary">₹{grandTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleBooking} disabled={loading || !moveInDate} className="w-full gap-2">
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Proceed to Payment
                                        <CreditCard className="w-4 h-4" />
                                    </>
                                )}
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
                                Pay ₹{grandTotal.toLocaleString()} to confirm your booking
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <div className="p-4 bg-muted rounded-xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Room</span>
                                    <span className="font-medium">{enquiry.listingTitle}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Move-in Date</span>
                                    <span>{moveInDate && format(moveInDate, "PPP")}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Duration</span>
                                    <span>{duration} month(s)</span>
                                </div>
                                <hr />
                                <div className="flex justify-between font-semibold text-lg">
                                    <span>Amount</span>
                                    <span className="text-primary">₹{grandTotal.toLocaleString()}</span>
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
                                        Pay ₹{grandTotal.toLocaleString()}
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setStep("details")} className="w-full">
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
                        <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
                        <p className="text-muted-foreground mb-4">
                            Your room at <strong>{enquiry.listingTitle}</strong> is booked.
                            <br />
                            Move-in: {moveInDate && format(moveInDate, "PPP")}
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

export default BookingDialog;
