import * as React from "react"
import { cn } from "../../lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                "flex min-h-[80px] w-full bg-black border border-border px-3 py-2 text-sm ring-offset-background placeholder:text-muted/50 focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 font-mono text-primary resize-none custom-scrollbar",
                className
            )}
            ref={ref}
            spellCheck={false}
            {...props}
        />
    )
})
Textarea.displayName = "Textarea"

export { Textarea }
