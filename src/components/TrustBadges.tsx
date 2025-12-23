import { motion } from "framer-motion";
import { Shield, CheckCircle, Award, Lock, Clock, HeartHandshake } from "lucide-react";

const trustBadges = [
    {
        icon: Shield,
        title: "Verified Listings",
        description: "Every property is personally verified by our team",
    },
    {
        icon: Lock,
        title: "Secure Payments",
        description: "256-bit SSL encryption for all transactions",
    },
    {
        icon: Clock,
        title: "24/7 Support",
        description: "Round-the-clock customer assistance",
    },
    {
        icon: HeartHandshake,
        title: "Satisfaction Guarantee",
        description: "100% refund if you're not happy",
    },
];

const partners = [
    { name: "Supabase", logo: "https://supabase.com/brand-assets/supabase-logo-icon.svg" },
    { name: "OpenStreetMap", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Openstreetmap_logo.svg" },
];

const TrustBadges = () => {
    return (
        <section className="py-16 border-t border-border/50">
            <div className="container mx-auto px-4">
                {/* Trust badges */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
                >
                    {trustBadges.map((badge, index) => (
                        <motion.div
                            key={badge.title}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{
                                duration: 0.4,
                                delay: index * 0.1,
                                ease: [0.23, 1, 0.32, 1],
                            }}
                            className="text-center group"
                        >
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                                <badge.icon className="w-7 h-7 text-primary" />
                            </div>
                            <h4 className="font-semibold text-foreground text-sm mb-1">
                                {badge.title}
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {badge.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Certifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-border/30"
                >
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-sm">GDPR Compliant</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Award className="w-5 h-5 text-warning" />
                        <span className="text-sm">ISO 27001 Certified</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="text-sm">PCI DSS Compliant</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default TrustBadges;
