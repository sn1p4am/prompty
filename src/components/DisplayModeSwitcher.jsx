export function DisplayModeSwitcher({ displayMode, onModeChange }) {
    return (
        <div className="flex gap-2 mb-5">
            <button
                onClick={() => onModeChange('card')}
                className={`flex-1 px-5 py-3 rounded-card font-semibold transition-all flex items-center justify-center gap-2 ${displayMode === 'card'
                        ? 'bg-primary-gradient text-white shadow-lg'
                        : 'bg-white/5 border border-card hover:bg-white/10'
                    }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                原始输出
            </button>
            <button
                onClick={() => onModeChange('html-preview')}
                className={`flex-1 px-5 py-3 rounded-card font-semibold transition-all flex items-center justify-center gap-2 ${displayMode === 'html-preview'
                        ? 'bg-primary-gradient text-white shadow-lg'
                        : 'bg-white/5 border border-card hover:bg-white/10'
                    }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                HTML 预览
            </button>
        </div>
    )
}
