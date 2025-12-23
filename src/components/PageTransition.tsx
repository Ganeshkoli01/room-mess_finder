import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
    children: ReactNode;
}

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    in: {
        opacity: 1,
        y: 0,
    },
    out: {
        opacity: 0,
        y: -20,
    },
};

const pageTransition = {
    type: "tween" as const,
    ease: "easeOut" as const,
    duration: 0.5,
};

const PageTransition = ({ children }: PageTransitionProps) => {
    const location = useLocation();

    return (
        <motion.div
            key={location.pathname}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
        >
            {children}
        </motion.div>
    );
};

// Section reveal animation wrapper
interface ScrollRevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export const ScrollReveal = ({ children, className, delay = 0 }: ScrollRevealProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
                duration: 0.6,
                delay,
                ease: [0.23, 1, 0.32, 1],
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Stagger children animation wrapper
interface StaggerContainerProps {
    children: ReactNode;
    className?: string;
    staggerDelay?: number;
}

export const StaggerContainer = ({ children, className, staggerDelay = 0.1 }: StaggerContainerProps) => {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
                visible: {
                    transition: {
                        staggerChildren: staggerDelay,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Stagger child item
interface StaggerItemProps {
    children: ReactNode;
    className?: string;
}

export const StaggerItem = ({ children, className }: StaggerItemProps) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 30 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                        duration: 0.5,
                        ease: [0.23, 1, 0.32, 1],
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Fade in animation
interface FadeInProps {
    children: ReactNode;
    className?: string;
    direction?: "up" | "down" | "left" | "right";
    delay?: number;
    duration?: number;
}

export const FadeIn = ({
    children,
    className,
    direction = "up",
    delay = 0,
    duration = 0.5
}: FadeInProps) => {
    const directions = {
        up: { y: 30 },
        down: { y: -30 },
        left: { x: 30 },
        right: { x: -30 },
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...directions[direction] }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{
                duration,
                delay,
                ease: [0.23, 1, 0.32, 1],
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Scale on hover wrapper
interface ScaleOnHoverProps {
    children: ReactNode;
    className?: string;
    scale?: number;
}

export const ScaleOnHover = ({ children, className, scale = 1.02 }: ScaleOnHoverProps) => {
    return (
        <motion.div
            whileHover={{ scale }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Parallax wrapper
interface ParallaxProps {
    children: ReactNode;
    className?: string;
    offset?: number;
}

export const Parallax = ({ children, className, offset = 50 }: ParallaxProps) => {
    return (
        <motion.div
            initial={{ y: offset }}
            whileInView={{ y: 0 }}
            viewport={{ once: false }}
            transition={{
                type: "tween",
                ease: "linear",
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Count up animation for numbers - simple implementation
interface CountUpProps {
    end: number;
    suffix?: string;
    prefix?: string;
    className?: string;
}

export const CountUp = ({ end, suffix = "", prefix = "", className }: CountUpProps) => {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className={className}
        >
            {prefix}{end.toLocaleString()}{suffix}
        </motion.span>
    );
};

export default PageTransition;
