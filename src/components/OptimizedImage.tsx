import { useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
    src: string;
    alt: string;
    className?: string;
    wrapperClassName?: string;
    aspectRatio?: "square" | "video" | "wide" | "tall" | "auto";
    objectFit?: "cover" | "contain" | "fill";
    priority?: boolean;
    onLoad?: () => void;
    onClick?: () => void;
}

const aspectRatios = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[16/9]",
    tall: "aspect-[3/4]",
    auto: "",
};

const OptimizedImage = ({
    src,
    alt,
    className,
    wrapperClassName,
    aspectRatio = "auto",
    objectFit = "cover",
    priority = false,
    onLoad,
    onClick,
}: OptimizedImageProps) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
    };

    // Placeholder gradient for loading/error states
    const placeholder = (
        <div
            className={cn(
                "absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10 animate-pulse",
                aspectRatios[aspectRatio]
            )}
        />
    );

    // Error fallback
    if (hasError) {
        return (
            <div
                className={cn(
                    "relative overflow-hidden bg-muted flex items-center justify-center",
                    aspectRatios[aspectRatio],
                    wrapperClassName
                )}
            >
                <div className="text-center text-muted-foreground p-4">
                    <svg
                        className="w-12 h-12 mx-auto mb-2 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <p className="text-xs">Image unavailable</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative overflow-hidden",
                aspectRatios[aspectRatio],
                wrapperClassName
            )}
            onClick={onClick}
        >
            {/* Loading skeleton */}
            {!isLoaded && placeholder}

            {/* Actual image */}
            <LazyLoadImage
                src={src}
                alt={alt}
                effect="blur"
                threshold={100}
                className={cn(
                    "w-full h-full transition-all duration-700",
                    objectFit === "cover" && "object-cover",
                    objectFit === "contain" && "object-contain",
                    objectFit === "fill" && "object-fill",
                    isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
                    className
                )}
                afterLoad={handleLoad}
                onError={handleError}
                visibleByDefault={priority}
            />

            {/* Overlay gradient on hover (for cards) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
    );
};

export default OptimizedImage;
