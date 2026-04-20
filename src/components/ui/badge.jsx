import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-brand text-[11px] tracking-[0.05em] rounded",
  {
    variants: {
      variant: {
        // Default: signal purple (primary brand)
        default:
          "border-transparent bg-signal text-white shadow",
        // Status: verified / active
        verified:
          "bg-green-100 text-green-800 border-green-200",
        // Status: pending / waiting
        pending:
          "bg-amber-100 text-amber-800 border-amber-200",
        // Status: quarantine / error
        quarantine:
          "bg-red-100 text-red-800 border-red-200",
        // Status: blocked
        blocked:
          "bg-orange-100 text-orange-800 border-orange-200",
        // Status: info
        info:
          "bg-sky-100 text-sky-800 border-sky-200",
        // Secondary / neutral
        secondary:
          "border-transparent bg-muted text-muted-foreground",
        // Destructive alias
        destructive:
          "border-transparent bg-red-100 text-red-800 border-red-200",
        // Outline
        outline: "text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants }