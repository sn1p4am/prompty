import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
    "inline-flex items-center px-2 py-0.5 text-xs font-bold transition-colors focus:outline-none font-mono uppercase tracking-wider",
    {
        variants: {
            variant: {
                default:
                    "border border-primary bg-primary/10 text-primary",
                secondary:
                    "border border-secondary bg-secondary/10 text-secondary",
                destructive:
                    "border border-destructive bg-destructive/10 text-destructive",
                outline: "text-foreground border border-foreground",
                success: "text-primary border border-primary bg-primary/20",
                warning: "text-secondary border border-secondary bg-secondary/20",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({ className, variant, children, ...props }) {
    // Add brackets
    const label = `[ ${children} ]`;
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props}>
            {label}
        </div>
    )
}

export { Badge, badgeVariants }
