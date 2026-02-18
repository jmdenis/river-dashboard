import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white font-medium hover:brightness-110",
        destructive:
          "bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] text-[var(--destructive)] hover:bg-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.35)]",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--text-2)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[var(--border-hover)]",
        secondary:
          "bg-transparent border border-[var(--border)] text-[var(--text-2)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[var(--border-hover)]",
        ghost: "bg-transparent border border-transparent text-[var(--text-2)] hover:bg-[rgba(255,255,255,0.06)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-[14px] py-[6px]",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
