import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // IM Vision: 44px height (touch-friendly), Roboto, signal focus ring
        "flex h-11 w-full rounded border border-input bg-background px-3 py-2 text-base font-body shadow-sm transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  );
})
Input.displayName = "Input"

export { Input }