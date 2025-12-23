import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Mail, CheckCircle, ArrowRight, RefreshCw, Sparkles } from "lucide-react";

const EmailConfirmation = () => {
    const [searchParams] = useSearchParams();
    const email = searchParams.get("email") || "your email";
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        // Hide confetti after animation
        const timer = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResend = () => {
        // In a real app, you'd call the resend verification email API
        setResendCooldown(60);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Floating Blobs */}
                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-blob blob-2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

                {/* Floating Particles */}
                {showConfetti && (
                    <>
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-2 h-2 rounded-full animate-float"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    backgroundColor: i % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
                                    opacity: 0.6,
                                    animationDelay: `${Math.random() * 2}s`,
                                    animationDuration: `${3 + Math.random() * 2}s`,
                                }}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-lg">
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-2 mb-8 animate-fade-in">
                    <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-lg shadow-primary/30">
                        <Building2 className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="font-heading font-bold text-2xl text-foreground">
                        Room<span className="text-primary">&</span>Mess
                    </span>
                </Link>

                {/* Card */}
                <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl shadow-primary/10 border border-border/50 animate-scale-in">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-pulse-soft">
                                <Mail className="w-12 h-12 text-primary" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-bounce-in" style={{ animationDelay: '0.5s' }}>
                                <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <Sparkles className="absolute -top-2 -left-2 w-6 h-6 text-accent animate-pulse" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="font-heading font-bold text-2xl md:text-3xl text-center text-foreground mb-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        Check Your Email! ✉️
                    </h1>

                    {/* Description */}
                    <p className="text-center text-muted-foreground mb-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        We've sent a confirmation email to
                    </p>

                    {/* Email Badge */}
                    <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <p className="text-center font-semibold text-primary truncate">
                            {email}
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4 mb-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-sm font-bold text-primary">1</span>
                            </div>
                            <p className="text-muted-foreground">
                                Open your email inbox (check spam folder too!)
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-sm font-bold text-primary">2</span>
                            </div>
                            <p className="text-muted-foreground">
                                Click the <strong>"Confirm Email"</strong> button in the email
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-sm font-bold text-primary">3</span>
                            </div>
                            <p className="text-muted-foreground">
                                Come back and <strong>login</strong> to start exploring!
                            </p>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.6s' }}>
                        <Link to="/auth" className="block">
                            <Button className="w-full gap-2 h-12 text-base" size="lg">
                                Go to Login
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>

                        <Button
                            variant="outline"
                            className="w-full gap-2 h-12"
                            onClick={handleResend}
                            disabled={resendCooldown > 0}
                        >
                            {resendCooldown > 0 ? (
                                <>
                                    Resend in {resendCooldown}s
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Resend Confirmation Email
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-muted-foreground text-sm mt-6 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                    Wrong email?{" "}
                    <Link to="/auth" className="text-primary font-semibold hover:underline">
                        Sign up again
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default EmailConfirmation;
