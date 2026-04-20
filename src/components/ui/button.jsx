import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-body tracking-wide",
  {
    variants: {
      variant: {
        // PRIMARY CTA — IM Vision signal purple, used sparingly
        default:
          "bg-signal text-white shadow-sm hover:bg-signal-hover active:bg-signal-active uppercase tracking-[0.05em] text-[13px] font-medium",
        // SECONDARY — black bg
        secondary:
          "bg-black text-white shadow-sm hover:bg-zinc-800 active:bg-zinc-900",
        // DESTRUCTIVE
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-red-700 active:bg-red-800",
        // GHOST — transparent with signal border
        outline:
          "border border-signal bg-transparent text-signal hover:bg-signal-subtle active:bg-signal-light",
        // GHOST — no border
        ghost:
          "bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
        link: "text-signal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-8 rounded px-3 text-xs",
        lg: "h-14 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }