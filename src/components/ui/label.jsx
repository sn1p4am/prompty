import * as React from "react"
import { cn } from "../../lib/utils"

const labelVariants = "text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block"

const Label = React.forwardRef(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(labelVariants, className)}
        {...props}
    />
))
Label.displayName = "Label"

export { Label }
