import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <div className="relative flex items-center w-full">
            <span className="absolute left-2 text-primary font-bold select-none">{'>'}</span>
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full bg-black border-b border-border px-3 py-2 pl-7 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted/50 focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 font-mono text-primary caret-primary",
                    className
                )}
                ref={ref}
                spellCheck={false}
                {...props}
            />
        </div>
    )
})
Input.displayName = "Input"

export { Input }
