"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ pressed = false, onPressedChange, className, children, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        aria-pressed={pressed}
        onClick={(e) => {
          props.onClick?.(e);
          onPressedChange?.(!pressed);
        }}
        className={cn(
          "inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          pressed
            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            : "bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Toggle.displayName = "Toggle";

