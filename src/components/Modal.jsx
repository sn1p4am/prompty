import { cn } from "../lib/utils"
import { X, Terminal, Settings } from "lucide-react"
import { Button } from "./ui/button"

export function Modal({ isOpen, onClose, title, children, className, defaultViewMode, onDefaultViewModeChange }) {
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-6 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={cn(
                    "bg-black border border-primary w-full max-w-5xl h-[80vh] flex flex-col shadow-glow animate-in zoom-in-95 duration-200",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-primary bg-primary/10">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest">
                        <Terminal className="w-4 h-4" />
                        {`>> VIEW_BUFFER: ${title}`}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* 默认视图模式选择器 */}
                        {onDefaultViewModeChange && (
                            <div className="flex items-center gap-2 mr-2 text-xs">
                                <Settings className="w-3 h-3 text-primary/70" />
                                <span className="text-primary/70 hidden sm:inline">默认:</span>
                                <select
                                    value={defaultViewMode}
                                    onChange={(e) => onDefaultViewModeChange(e.target.value)}
                                    className="bg-black border border-primary/30 text-primary text-xs px-2 py-1 rounded hover:border-primary focus:outline-none focus:border-primary cursor-pointer"
                                    title="设置弹窗默认展示模式"
                                >
                                    <option value="raw">原始</option>
                                    <option value="markdown">Markdown</option>
                                    <option value="html">HTML</option>
                                </select>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-6 w-6 p-0 hover:bg-primary hover:text-black"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 font-mono text-sm leading-relaxed custom-scrollbar">
                    {children}
                </div>

                {/* Footer Status Bar */}
                <div className="border-t border-primary p-2 bg-primary/5 text-xs text-primary/70 flex justify-between uppercase">
                    <span>MODE: READ_ONLY</span>
                    <span>EOF</span>
                </div>
            </div>
        </div>
    )
}
