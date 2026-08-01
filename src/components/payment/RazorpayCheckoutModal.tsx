import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    CreditCard,
    Building2,
    Smartphone,
    Wallet,
    Clock,
    ShieldCheck,
    Lock,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    QrCode,
} from "lucide-react";
import { PaymentDetails, PaymentResult, generateTransactionId, savePaymentRecord } from "@/services/paymentService";

interface RazorpayCheckoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    details: PaymentDetails | null;
    onSuccess: (result: PaymentResult) => void;
    onFailure: (error: Error) => void;
}

type PaymentTab = "cards" | "netbanking" | "upi" | "wallet" | "paylater";

export const RazorpayCheckoutModal = ({
    open,
    onOpenChange,
    details,
    onSuccess,
    onFailure,
}: RazorpayCheckoutModalProps) => {
    const [activeTab, setActiveTab] = useState<PaymentTab>("cards");
    const [loading, setLoading] = useState(false);

    // Form states
    const [cardNumber, setCardNumber] = useState("4532 1100 8899 4321");
    const [cardExpiry, setCardExpiry] = useState("12/28");
    const [cardCvv, setCardCvv] = useState("432");
    const [selectedBank, setSelectedBank] = useState("HDFC Bank");
    const [upiId, setUpiId] = useState("user@upi");

    if (!details) return null;

    const formattedAmount = details.amount.toLocaleString();

    const handlePaySuccess = async () => {
        setLoading(true);
        try {
            // Simulate 1 second processing delay
            await new Promise((res) => setTimeout(res, 800));

            const result: PaymentResult = {
                success: true,
                transactionId: generateTransactionId(),
                orderId: details.orderId,
                amount: details.amount,
                timestamp: new Date(),
            };

            await savePaymentRecord(details, result);
            setLoading(false);
            onOpenChange(false);
            onSuccess(result);
        } catch (err: any) {
            setLoading(false);
            onFailure(err instanceof Error ? err : new Error("Payment error"));
        }
    };

    const handlePayFail = async () => {
        setLoading(true);
        await new Promise((res) => setTimeout(res, 600));
        setLoading(false);
        onOpenChange(false);
        onFailure(new Error("Payment failed: Transaction declined by bank. Subscription not activated."));
    };

    const handleCancel = () => {
        onOpenChange(false);
        onFailure(new Error("Payment was cancelled by user. Subscription not activated."));
    };

    return (
        <Dialog open={open} onOpenChange={handleCancel}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-background rounded-2xl shadow-2xl">
                <div className="relative flex flex-col md:flex-row min-h-[520px] w-full">
                    {/* Test Mode Corner Badge */}
                    <div className="absolute top-4 right-[-34px] rotate-45 bg-red-600 text-white font-bold text-[10px] tracking-wider uppercase py-1 px-10 z-50 shadow-md pointer-events-none">
                        Test Mode
                    </div>

                    {/* Left Sidebar (Blue / Gradient Razorpay Style) */}
                    <div className="w-full md:w-2/5 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white p-6 flex flex-col justify-between relative overflow-hidden">
                        {/* Background illustration graphics */}
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

                        <div className="space-y-6 relative z-10">
                            {/* Logo Branding */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                    <span className="text-xl">🏠</span>
                                </div>
                                <span className="font-bold text-lg tracking-tight">Room & Mess Finder</span>
                            </div>

                            {/* Price Summary Box */}
                            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
                                <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">
                                    Price Summary
                                </span>
                                <div className="text-3xl font-extrabold text-white">
                                    ₹{formattedAmount}
                                </div>
                                <p className="text-xs text-indigo-200 pt-1">
                                    {details.listingTitle} ({details.planType ? `${details.planType} plan` : "Subscription"})
                                </p>
                            </div>

                            {/* User Account Info */}
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-xs text-indigo-100">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    <span>Using as {details.userName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Security Badge */}
                        <div className="pt-6 relative z-10 flex items-center justify-between text-xs text-indigo-200/80 border-t border-white/10">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                                Secured by <strong className="text-white">Razorpay</strong>
                            </span>
                        </div>
                    </div>

                    {/* Right Payment Options Panel */}
                    <div className="w-full md:w-3/5 p-6 bg-slate-900 text-slate-100 flex flex-col justify-between">
                        <div>
                            {/* Panel Header */}
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                                <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
                                    Payment Options
                                </h3>
                                <button
                                    onClick={handleCancel}
                                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Main Content Layout (Tabs + Option Details) */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Navigation Tabs */}
                                <div className="col-span-1 space-y-1.5 border-r border-slate-800 pr-2">
                                    <button
                                        onClick={() => setActiveTab("cards")}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition text-left ${
                                            activeTab === "cards"
                                                ? "bg-indigo-600 text-white font-semibold shadow"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        <CreditCard className="w-4 h-4 shrink-0" />
                                        <span>Cards</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("upi")}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition text-left ${
                                            activeTab === "upi"
                                                ? "bg-indigo-600 text-white font-semibold shadow"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        <Smartphone className="w-4 h-4 shrink-0" />
                                        <span>UPI / QR</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("netbanking")}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition text-left ${
                                            activeTab === "netbanking"
                                                ? "bg-indigo-600 text-white font-semibold shadow"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4 shrink-0" />
                                        <span>Netbanking</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("wallet")}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition text-left ${
                                            activeTab === "wallet"
                                                ? "bg-indigo-600 text-white font-semibold shadow"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        <Wallet className="w-4 h-4 shrink-0" />
                                        <span>Wallet</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("paylater")}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition text-left ${
                                            activeTab === "paylater"
                                                ? "bg-indigo-600 text-white font-semibold shadow"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        <Clock className="w-4 h-4 shrink-0" />
                                        <span>Pay Later</span>
                                    </button>
                                </div>

                                {/* Active Tab Option Panel */}
                                <div className="col-span-2 space-y-4 pl-1">
                                    {activeTab === "cards" && (
                                        <div className="space-y-3">
                                            <span className="text-xs font-semibold text-slate-300 block">
                                                Add Credit / Debit Card
                                            </span>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] text-slate-400">Card Number</Label>
                                                <Input
                                                    value={cardNumber}
                                                    onChange={(e) => setCardNumber(e.target.value)}
                                                    className="bg-slate-800 border-slate-700 text-slate-100 h-9 text-xs"
                                                    placeholder="4532 1100 8899 4321"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] text-slate-400">Expiry (MM/YY)</Label>
                                                    <Input
                                                        value={cardExpiry}
                                                        onChange={(e) => setCardExpiry(e.target.value)}
                                                        className="bg-slate-800 border-slate-700 text-slate-100 h-9 text-xs"
                                                        placeholder="12/28"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] text-slate-400">CVV</Label>
                                                    <Input
                                                        type="password"
                                                        maxLength={4}
                                                        value={cardCvv}
                                                        onChange={(e) => setCardCvv(e.target.value)}
                                                        className="bg-slate-800 border-slate-700 text-slate-100 h-9 text-xs"
                                                        placeholder="432"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "upi" && (
                                        <div className="space-y-3">
                                            <span className="text-xs font-semibold text-slate-300 block">
                                                UPI Payment / GPay / PhonePe
                                            </span>
                                            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-center space-y-2">
                                                <QrCode className="w-12 h-12 text-indigo-400 mx-auto" />
                                                <p className="text-[11px] text-slate-400">Scan QR Code using Google Pay, PhonePe, or Paytm</p>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px] text-slate-400">Or Enter VPA / UPI ID</Label>
                                                <Input
                                                    value={upiId}
                                                    onChange={(e) => setUpiId(e.target.value)}
                                                    className="bg-slate-800 border-slate-700 text-slate-100 h-9 text-xs"
                                                    placeholder="username@upi"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "netbanking" && (
                                        <div className="space-y-3">
                                            <span className="text-xs font-semibold text-slate-300 block">
                                                Select Your Bank
                                            </span>
                                            <div className="grid grid-cols-2 gap-2">
                                                {["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak", "PNB"].map((bank) => (
                                                    <button
                                                        key={bank}
                                                        onClick={() => setSelectedBank(bank)}
                                                        className={`p-2.5 rounded-lg border text-xs font-medium transition text-left ${
                                                            selectedBank === bank
                                                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                                                                : "border-slate-800 bg-slate-800/50 text-slate-300 hover:border-slate-700"
                                                        }`}
                                                    >
                                                        {bank}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "wallet" && (
                                        <div className="space-y-3">
                                            <span className="text-xs font-semibold text-slate-300 block">
                                                Supported Wallets
                                            </span>
                                            <div className="space-y-2">
                                                {["Paytm Wallet", "PhonePe Wallet", "MobiKwik", "Airtel Money"].map((wallet) => (
                                                    <div
                                                        key={wallet}
                                                        className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs text-slate-200 flex items-center justify-between"
                                                    >
                                                        <span>{wallet}</span>
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "paylater" && (
                                        <div className="space-y-3">
                                            <span className="text-xs font-semibold text-slate-300 block">
                                                Pay Later Services
                                            </span>
                                            <div className="space-y-2">
                                                {["LazyPay", "ICICI Bank PayLater", "Simple"].map((service) => (
                                                    <div
                                                        key={service}
                                                        className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs text-slate-200 flex items-center justify-between"
                                                    >
                                                        <span>{service}</span>
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Pay Buttons */}
                        <div className="pt-4 border-t border-slate-800 space-y-2">
                            <Button
                                onClick={handlePaySuccess}
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11 gap-2 rounded-xl shadow-lg shadow-emerald-950/40"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing Payment...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        Pay ₹{formattedAmount} (Test Success)
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handlePayFail}
                                disabled={loading}
                                className="w-full border-red-900/60 text-red-400 hover:bg-red-950/40 hover:text-red-300 h-9 text-xs gap-1.5 rounded-xl"
                            >
                                <AlertCircle className="w-3.5 h-3.5" />
                                Simulate Payment Failure (Test Error Behavior)
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
