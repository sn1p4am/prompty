import { useState } from 'react'

/**
 * Toast 通知组件
 */
export function Toast({ message, onClose }) {
    return (
        <div
            className="fixed top-5 right-5 bg-success-gradient text-white px-5 py-3 rounded-lg z-[10000] animate-slideIn shadow-lg"
            style={{
                animation: 'slideIn 0.3s ease',
            }}
        >
            {message}
        </div>
    )
}

/**
 * Toast Hook
 */
export function useToast() {
    const [toast, setToast] = useState(null)

    const showToast = (message) => {
        setToast(message)
        setTimeout(() => {
            setToast(null)
        }, 2000)
    }

    return { toast, showToast }
}
