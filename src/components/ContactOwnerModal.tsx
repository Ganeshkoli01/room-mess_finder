import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Phone,
    MessageCircle,
    Mail,
    Globe,
    User,
    Calendar,
    CheckCircle,
    CreditCard,
    Star,
    Clock,
    Shield,
    IndianRupee,
    Loader2,
    MessageSquare,
    Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    ContactInfo,
    InquiryData,
    sendWhatsAppInquiry,
    makePhoneCall,
    storeInquiry,
    isValidPhoneNumber,
    isValidEmail,
} from "@/services/contactService";
import {
    getOwnerDetails,
    getBusinessListing,
    getWhatsAppLink,
    getCallLink,
    OwnerDetails,
    BusinessListing,
} from "@/services/businessDataService";
import {
    createOrder,
    processPayment,
    calculateTotalAmount,
} from "@/services/razorpayService";

interface ContactOwnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    listingName: string;
    listingType: "room" | "mess";
    price: number;
    contact?: ContactInfo;
}

const ContactOwnerModal = ({
    isOpen,
    onClose,
    listingId,
    listingName,
    listingType,
    price,
    contact,
}: ContactOwnerModalProps) => {
    const { toast } = useToast();

    // Owner and business data
    const [owner, setOwner] = useState<OwnerDetails | null>(null);
    const [business, setBusiness] = useState<BusinessListing | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        userName: "",
        userPhone: "",
        userEmail: "",
        message: "",
        moveInDate: "",
        stayDuration: "monthly" as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
        mealPlan: "all" as "breakfast" | "lunch" | "dinner" | "all",
        subscriptionDuration: "monthly" as "daily" | "weekly" | "monthly" | "quarterly",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<"contact" | "book">("book");

    // Load owner details when modal opens
    useEffect(() => {
        if (isOpen && listingId) {
            const ownerData = getOwnerDetails(
                listingId,
                listingName,
                listingType,
                contact ? {
                    phone: contact.phone,
                    email: contact.email,
                    ownerName: contact.ownerName,
                    operatorName: contact.operatorName,
                } : undefined
            );
            setOwner(ownerData);

            const businessData = getBusinessListing(
                listingId,
                listingName,
                listingType,
                price,
                contact ? {
                    phone: contact.phone,
                    email: contact.email,
                    ownerName: contact.ownerName,
                    operatorName: contact.operatorName,
                } : undefined
            );
            setBusiness(businessData);
        }
    }, [isOpen, listingId, listingName, listingType, price, contact]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.userName.trim()) {
            newErrors.userName = "Name is required";
        }

        if (!formData.userPhone.trim()) {
            newErrors.userPhone = "Phone number is required";
        } else if (!isValidPhoneNumber(formData.userPhone)) {
            newErrors.userPhone = "Please enter a valid 10-digit phone number";
        }

        if (formData.userEmail && !isValidEmail(formData.userEmail)) {
            newErrors.userEmail = "Please enter a valid email address";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Calculate pricing
    const getPlanType = () => {
        return listingType === "room" ? formData.stayDuration : formData.subscriptionDuration;
    };

    const pricing = calculateTotalAmount(
        price,
        getPlanType(),
        listingType === "room"
    );

    // Handle WhatsApp inquiry
    const handleWhatsAppInquiry = () => {
        if (!owner) return;

        const message = `Hi ${owner.ownerName},\n\nI'm interested in ${listingType === "room" ? "booking" : "subscribing to"} "${listingName}".\n\nMy Details:\nName: ${formData.userName || "Interested Customer"}\nPhone: ${formData.userPhone || "Will share later"}\n\n${formData.message || "Please share more details."}\n\nThank you!`;

        const link = getWhatsAppLink(owner.phone, message);
        window.open(link, "_blank");

        toast({
            title: "Opening WhatsApp",
            description: "Your inquiry is being sent",
        });
    };

    // Handle phone call
    const handlePhoneCall = () => {
        if (!owner) return;
        window.location.href = getCallLink(owner.phone);
        toast({
            title: "Calling Owner",
            description: `Dialing ${owner.ownerName}`,
        });
    };

    // Handle payment and booking
    const handlePayment = async () => {
        if (!validateForm() || !owner) return;

        setIsProcessing(true);

        try {
            // Create order
            const order = await createOrder({
                amount: pricing.total,
                listingId,
                listingType,
                listingTitle: listingName,
                planType: listingType === "room" ? "booking" : getPlanType(),
                userId: `user_${Date.now()}`,
                userEmail: formData.userEmail || `${formData.userPhone}@temp.com`,
                userName: formData.userName,
                userPhone: formData.userPhone,
            });

            // Process payment
            const result = await processPayment(order, {
                amount: pricing.total,
                listingId,
                listingType,
                listingTitle: listingName,
                planType: listingType === "room" ? "booking" : getPlanType(),
                userId: `user_${Date.now()}`,
                userEmail: formData.userEmail || `${formData.userPhone}@temp.com`,
                userName: formData.userName,
                userPhone: formData.userPhone,
            }, {
                name: owner.ownerName,
                phone: owner.phone,
            });

            if (result.success) {
                toast({
                    title: "🎉 Booking Successful!",
                    description: `Your ${listingType === "room" ? "room booking" : "mess subscription"} is confirmed. Payment ID: ${result.paymentId}`,
                });

                // Store inquiry
                storeInquiry({
                    listingId,
                    listingName,
                    listingType,
                    userName: formData.userName,
                    userPhone: formData.userPhone,
                    userEmail: formData.userEmail,
                    message: formData.message,
                    inquiryType: listingType === "room" ? "booking" : "subscription",
                    moveInDate: formData.moveInDate,
                    stayDuration: formData.stayDuration,
                    mealPlan: formData.mealPlan,
                    subscriptionDuration: formData.subscriptionDuration,
                });

                onClose();
            }
        } catch (error: any) {
            if (error.message !== "Payment cancelled by user") {
                toast({
                    title: "Payment Failed",
                    description: error.message || "Something went wrong. Please try again.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!owner) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {listingType === "room" ? "🏠 Book This Room" : "🍽️ Subscribe to Mess"}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        {listingName}
                    </DialogDescription>
                </DialogHeader>

                {/* Owner Profile Card */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-4">
                        <img
                            src={owner.profileImage}
                            alt={owner.ownerName}
                            className="w-16 h-16 rounded-full border-2 border-white shadow-lg"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg truncate">{owner.ownerName}</h3>
                                {owner.isVerified && (
                                    <Badge className="bg-green-500 text-white text-xs px-1.5 py-0 h-5">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Verified
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 truncate">
                                <Building2 className="w-3 h-3 inline mr-1" />
                                {owner.businessName}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    {owner.rating?.toFixed(1)} rating
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {owner.responseTime}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    {owner.responseRate} replies
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Contact */}
                    <div className="flex gap-2 mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2 bg-white dark:bg-gray-900"
                            onClick={handlePhoneCall}
                        >
                            <Phone className="w-4 h-4" />
                            {owner.phone}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                            onClick={handleWhatsAppInquiry}
                        >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab("book")}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === "book"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                    >
                        <CreditCard className="w-4 h-4 inline mr-2" />
                        {listingType === "room" ? "Book & Pay" : "Subscribe & Pay"}
                    </button>
                    <button
                        onClick={() => setActiveTab("contact")}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === "contact"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                    >
                        <MessageCircle className="w-4 h-4 inline mr-2" />
                        Contact Only
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="userName" className="text-sm">Your Name *</Label>
                            <Input
                                id="userName"
                                placeholder="Enter your name"
                                value={formData.userName}
                                onChange={(e) =>
                                    setFormData({ ...formData, userName: e.target.value })
                                }
                                className={errors.userName ? "border-red-500" : ""}
                            />
                            {errors.userName && (
                                <p className="text-xs text-red-500">{errors.userName}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="userPhone" className="text-sm">Phone Number *</Label>
                            <Input
                                id="userPhone"
                                placeholder="+91 98765 43210"
                                value={formData.userPhone}
                                onChange={(e) =>
                                    setFormData({ ...formData, userPhone: e.target.value })
                                }
                                className={errors.userPhone ? "border-red-500" : ""}
                            />
                            {errors.userPhone && (
                                <p className="text-xs text-red-500">{errors.userPhone}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="userEmail" className="text-sm">Email (for receipt)</Label>
                        <Input
                            id="userEmail"
                            type="email"
                            placeholder="your@email.com"
                            value={formData.userEmail}
                            onChange={(e) =>
                                setFormData({ ...formData, userEmail: e.target.value })
                            }
                            className={errors.userEmail ? "border-red-500" : ""}
                        />
                    </div>

                    {/* Plan selection */}
                    {activeTab === "book" && (
                        <div className="grid grid-cols-2 gap-3">
                            {listingType === "room" ? (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Move-in Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.moveInDate}
                                            onChange={(e) =>
                                                setFormData({ ...formData, moveInDate: e.target.value })
                                            }
                                            min={new Date().toISOString().split("T")[0]}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Duration</Label>
                                        <select
                                            value={formData.stayDuration}
                                            onChange={(e) =>
                                                setFormData({ ...formData, stayDuration: e.target.value as any })
                                            }
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">3 Months (5% off)</option>
                                            <option value="yearly">12 Months (10% off)</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Meal Plan</Label>
                                        <select
                                            value={formData.mealPlan}
                                            onChange={(e) =>
                                                setFormData({ ...formData, mealPlan: e.target.value as any })
                                            }
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                        >
                                            <option value="all">All Meals</option>
                                            <option value="breakfast">Breakfast Only</option>
                                            <option value="lunch">Lunch Only</option>
                                            <option value="dinner">Dinner Only</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Subscription</Label>
                                        <select
                                            value={formData.subscriptionDuration}
                                            onChange={(e) =>
                                                setFormData({ ...formData, subscriptionDuration: e.target.value as any })
                                            }
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly (5% off)</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">3 Months (5% off)</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-sm">Message (optional)</Label>
                        <Textarea
                            placeholder={
                                listingType === "room"
                                    ? "Any questions about the room?"
                                    : "Any dietary preferences?"
                            }
                            value={formData.message}
                            onChange={(e) =>
                                setFormData({ ...formData, message: e.target.value })
                            }
                            rows={2}
                        />
                    </div>

                    {/* Price Breakdown for Book tab */}
                    {activeTab === "book" && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {listingType === "room" ? "Rent" : "Subscription"} ({getPlanType()})
                                </span>
                                <span>₹{pricing.subtotal.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">GST (18%)</span>
                                <span>₹{pricing.tax.toLocaleString("en-IN")}</span>
                            </div>
                            {pricing.securityDeposit > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Security Deposit</span>
                                    <span>₹{pricing.securityDeposit.toLocaleString("en-IN")}</span>
                                </div>
                            )}
                            <div className="border-t pt-2 flex justify-between font-semibold">
                                <span>Total</span>
                                <span className="text-lg text-indigo-600 dark:text-indigo-400">
                                    ₹{pricing.total.toLocaleString("en-IN")}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                <Shield className="w-3 h-3" />
                                Secure payment via Razorpay
                            </div>
                        </div>
                    )}

                    {/* Contact tab - simple price display */}
                    {activeTab === "contact" && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                    {listingType === "room" ? "Monthly Rent" : "Monthly Price"}
                                </span>
                                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                    ₹{price.toLocaleString("en-IN")}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {activeTab === "book" ? (
                        <Button
                            className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-12"
                            onClick={handlePayment}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5" />
                                    Pay ₹{pricing.total.toLocaleString("en-IN")} & {listingType === "room" ? "Book" : "Subscribe"}
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="flex gap-3">
                            <Button
                                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 h-12"
                                onClick={handleWhatsAppInquiry}
                            >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2 h-12"
                                onClick={handlePhoneCall}
                            >
                                <Phone className="w-5 h-5" />
                                Call Now
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ContactOwnerModal;
