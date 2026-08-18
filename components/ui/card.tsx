import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur",
        className
      )}
      {...props}
    />
  );
}

/**
 * Heading level is a document-outline decision, not a styling one: pages have
 * an <h1>, so a card title defaults to <h2> and never skips a level. Existing
 * callers pass no props and keep working; override with `as` where the card
 * genuinely sits deeper (e.g. `as="h3"` inside a section that has its own h2).
 */
export type CardTitleElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: CardTitleElement;
}

export function CardTitle({ className, as: Comp = "h2", ...props }: CardTitleProps) {
  return <Comp className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}
