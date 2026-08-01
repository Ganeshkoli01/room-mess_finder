import { cn } from "@/lib/utils";

import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-muted",
        className
      )}
      {...props}
    />
  );
};

// Card Skeleton for Room/Mess listings
export const CardSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-card">
      {/* Image skeleton */}
      <Skeleton className="aspect-[4/3] w-full" />

      {/* Content skeleton */}
      <div className="p-5 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />

        {/* Facilities skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>

        {/* Button skeleton */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
};

// Grid of card skeletons
export const CardGridSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

// Hero skeleton
export const HeroSkeleton = () => {
  return (
    <div className="relative pt-16 min-h-[80vh]">
      <Skeleton className="absolute inset-0" />
      <div className="relative container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-2xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-14 w-40" />
            <Skeleton className="h-14 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Text skeleton
export const TextSkeleton = ({ lines = 3 }: { lines?: number }) => {
  const widths = ["w-full", "w-5/6", "w-4/6", "w-3/6", "w-2/6"];
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${widths[Math.min(i, widths.length - 1)]}`}
        />
      ))}
    </div>
  );
};


// Avatar skeleton
export const AvatarSkeleton = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return <Skeleton className={cn("rounded-full", sizes[size])} />;
};

// Stats skeleton
export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="text-center p-6 rounded-2xl bg-card">
          <Skeleton className="w-14 h-14 mx-auto rounded-xl mb-4" />
          <Skeleton className="h-8 w-24 mx-auto mb-2" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
};

// Search bar skeleton
export const SearchBarSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl p-4 shadow-card">
      <div className="flex flex-col lg:flex-row gap-4">
        <Skeleton className="h-12 w-full lg:w-40" />
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 w-full lg:w-40" />
        <Skeleton className="h-12 w-full lg:w-24" />
        <Skeleton className="h-12 w-full lg:w-32" />
      </div>
    </div>
  );
};

// Detail page skeleton
export const DetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Image gallery skeleton */}
      <Skeleton className="w-full h-[50vh]" />

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <TextSkeleton lines={5} />
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-card rounded-2xl p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Skeleton };
