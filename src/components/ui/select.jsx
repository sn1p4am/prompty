import * as React from "react"
import { cn } from "../../lib/utils"

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
    return (
        <div className={cn("relative group w-full", className)}>
            <select
                className={cn(
                    "flex h-10 w-full items-center justify-between border-b border-border bg-black px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none font-mono text-primary group-hover:bg-primary/5 transition-colors cursor-pointer",
                )}
                ref={ref}
                {...props}
            >
                {children}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-primary">
                <span className="text-xs">▼</span>
            </div>
        </div>
    )
})
Select.displayName = "Select"

export { Select }
