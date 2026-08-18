import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Token-backed classes. Every token below was checked against the literal it
// replaced in app/globals.css (primary = slate-900, border/input = slate-200,
// card = white, background = slate-50, accent = slate-100, ring = brand-500),
// so light mode renders identically and .dark now works.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // hover stays literal slate-800: no token carries that value, and
        // primary/90 blends to a different colour. See FOUNDATION.md.
        default: "bg-primary text-primary-foreground hover:bg-slate-800",
        brand: "bg-brand-600 text-white hover:bg-brand-700",
        outline: "border border-border bg-card hover:bg-background",
        ghost: "hover:bg-accent"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render the child element instead of a <button>, merging props and classes
   * onto it. Use for links so CTAs emit a single <a> instead of <a><button>.
   */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
