import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NewsletterSection = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus("loading");

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setStatus("success");
        setEmail("");

        // Reset after 3 seconds
        setTimeout(() => setStatus("idle"), 3000);
    };

    return (
        <section className="relative py-24 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 hero-animated-bg opacity-90" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

            {/* Decorative blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-blob" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-blob blob-2" />

            <div className="relative container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    className="max-w-2xl mx-auto text-center"
                >
                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                        className="w-16 h-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center mb-6 backdrop-blur-sm"
                    >
                        <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>

                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
                        Stay Updated with New Listings
                    </h2>
                    <p className="text-white/80 text-lg mb-8">
                        Get the best rooms and mess options in your inbox. No spam, just great finds!
                    </p>

                    {/* Form */}
                    <motion.form
                        onSubmit={handleSubmit}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                    >
                        <div className="relative flex-1">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={status === "loading" || status === "success"}
                                className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-white/30"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={status === "loading" || status === "success"}
                            className="h-14 px-8 bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
                        >
                            {status === "loading" ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : status === "success" ? (
                                <>
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Subscribed!
                                </>
                            ) : (
                                "Subscribe"
                            )}
                        </Button>
                    </motion.form>

                    {/* Success message */}
                    {status === "success" && (
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-white mt-4 text-sm"
                        >
                            🎉 Welcome aboard! Check your inbox for a confirmation.
                        </motion.p>
                    )}

                    {/* Privacy note */}
                    <p className="text-white/50 text-xs mt-6">
                        By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default NewsletterSection;
