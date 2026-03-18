"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const toggleVariants = cva(
  [
    "inline-flex items-center justify-center rounded-lg",
    "text-sm font-medium",
    "transition-all duration-fast ease-default",
    "hover:bg-bg-hover",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "motion-reduce:transition-none",
    /* Active state: accent-primary fill */
    "data-[state=on]:bg-accent-primary data-[state=on]:text-white",
    /* Inactive state: bg-surface */
    "data-[state=off]:bg-bg-surface data-[state=off]:text-text-secondary",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-8 px-2.5",
        md: "h-9 px-3",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const Toggle = React.forwardRef<
  React.ComponentRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ size, className }))}
    {...props}
  />
));
Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
