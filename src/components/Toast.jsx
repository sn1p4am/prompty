import { useState, useEffect } from 'react'
import { cn } from "../lib/utils"
import { CheckCircle2, Terminal } from "lucide-react"

export function Toast({ message }) {
    if (!message) return null

    return (
        <div
            className="fixed top-6 right-6 z-[10000] animate-in slide-in-from-right duration-300"
        >
            <div className="bg-black border border-primary text-primary px-4 py-3 shadow-glow flex items-center gap-3">
                <span className="animate-pulse">_</span>
                <span className="font-mono text-sm uppercase tracking-wider font-bold">
                    {`[ SYS_MSG: ${message} ]`}
                </span>
            </div>
        </div>
    )
}

export function useToast() {
    const [toast, setToast] = useState(null)

    const showToast = (message) => {
        setToast(message)
    }

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    return { toast, showToast }
}
