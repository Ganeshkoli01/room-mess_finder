import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
    {
        id: 1,
        name: "Priya Sharma",
        role: "Engineering Student",
        college: "IIT Delhi",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
        rating: 5,
        text: "Found my perfect room within a day! The verified listings gave me confidence, and the location-based search made it super easy to find accommodation near my college.",
    },
    {
        id: 2,
        name: "Rahul Verma",
        role: "Working Professional",
        college: "Bengaluru",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        rating: 5,
        text: "The mess finder feature is a game-changer! I can now compare prices, see menus, and read genuine reviews. Saved me from many bad meal decisions.",
    },
    {
        id: 3,
        name: "Anjali Patel",
        role: "Medical Student",
        college: "AIIMS Mumbai",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        rating: 5,
        text: "As someone new to Mumbai, this app was a lifesaver. The map integration helped me find affordable accommodation close to my hospital within my budget.",
    },
    {
        id: 4,
        name: "Vikram Singh",
        role: "MBA Student",
        college: "IIM Ahmedabad",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        rating: 4,
        text: "The comparison tool is brilliant! Was able to shortlist and compare 3 rooms side by side. Made my decision-making process so much easier.",
    },
];

const TestimonialsSection = () => {
    return (
        <section className="py-24 bg-muted/30 overflow-hidden">
            <div className="container mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    className="text-center max-w-2xl mx-auto mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        ⭐ Testimonials
                    </span>
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Loved by Students & Professionals
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Join thousands of happy users who found their perfect room and mess through our platform.
                    </p>
                </motion.div>

                {/* Testimonials Grid */}
                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.id}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{
                                duration: 0.6,
                                delay: index * 0.1,
                                ease: [0.23, 1, 0.32, 1],
                            }}
                        >
                            <div className="h-full bg-card rounded-2xl p-6 shadow-soft border border-border/50 card-hover-lift relative overflow-hidden group">
                                {/* Quote icon */}
                                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Quote className="w-16 h-16 text-primary" />
                                </div>

                                {/* Rating */}
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i < testimonial.rating
                                                    ? "text-warning fill-warning"
                                                    : "text-muted"
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Quote */}
                                <p className="text-foreground/80 leading-relaxed mb-6">
                                    "{testimonial.text}"
                                </p>

                                {/* Author */}
                                <div className="flex items-center gap-4">
                                    <img
                                        src={testimonial.image}
                                        alt={testimonial.name}
                                        className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                                    />
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            {testimonial.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {testimonial.role} • {testimonial.college}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16"
                >
                    <div className="text-center">
                        <p className="text-4xl md:text-5xl font-bold text-primary">50K+</p>
                        <p className="text-muted-foreground mt-1">Happy Users</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl md:text-5xl font-bold text-primary">4.8</p>
                        <p className="text-muted-foreground mt-1">Average Rating</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl md:text-5xl font-bold text-primary">100+</p>
                        <p className="text-muted-foreground mt-1">Cities Covered</p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
