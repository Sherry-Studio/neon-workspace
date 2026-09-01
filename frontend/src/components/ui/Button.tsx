"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium uppercase tracking-[0.18em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan/70",
  {
    variants: {
      variant: {
        primary:
          "bg-white text-black hover:bg-accent-cyan hover:text-black hover:shadow-[0_0_36px_-4px_rgba(34,211,238,0.6)]",
        outline:
          "border border-white/15 bg-white/[0.02] text-white hover:border-accent-cyan/60 hover:bg-accent-cyan/[0.06]",
        ghost: "text-text-secondary hover:text-white",
        glass: "glass text-white hover:border-accent-cyan/40",
        solid: "bg-white text-black hover:bg-white/90",
      },
      size: {
        sm: "px-5 py-2.5 text-[11px]",
        md: "px-8 py-4 text-xs",
        lg: "px-10 py-5 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type BaseProps = VariantProps<typeof buttonVariants> & { className?: string };

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    BaseProps {
  href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, href, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);
    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export default Button;
export { buttonVariants };
