import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  // Determine if this is a range slider (two thumbs)
  const valueArray = value || defaultValue || [0];
  const isRange = valueArray.length > 1;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center group cursor-pointer py-1.5",
        className
      )}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary/60 transition-colors group-hover:bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary via-primary/90 to-primary/80" />
      </SliderPrimitive.Track>

      {/* Render thumb(s) - one for single value, two for range */}
      {valueArray.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className={cn(
            "block h-5 w-5 rounded-full border-2 border-primary bg-background",
            "shadow-md shadow-primary/20",
            "ring-offset-background transition-transform duration-100",
            "hover:scale-125 hover:shadow-lg hover:shadow-primary/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "active:scale-110 active:border-primary/90",
            "disabled:pointer-events-none disabled:opacity-50",
            "cursor-grab active:cursor-grabbing"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
