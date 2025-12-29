import { DISPLAY_MODES } from '../constants/providers'

export function DisplayModeSwitcher({ displayMode, onDisplayModeChange }) {
    return (
        <div className="flex gap-4">
            <button
                onClick={() => onDisplayModeChange(DISPLAY_MODES.CARD)}
                className={`flex-1 px-6 py-4 rounded-lg flex items-center justify-center gap-3 transition-all ${displayMode === DISPLAY_MODES.CARD
                        ? 'bg-primary-gradient text-white'
                        : 'bg-white/5 hover:bg-white/10 border border-card'
                    }`}
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 5v2h-4V5h4M9 5v6H5V5h4m10 8v6h-4v-6h4M9 17v2H5v-2h4M21 3h-8v6h8V3zM11 3H3v10h8V3zm10 8h-8v10h8V11zm-10 4H3v6h8v-6z" />
                </svg>
                <span className="font-semibold">卡片模式</span>
            </button>
            <button
                onClick={() => onDisplayModeChange(DISPLAY_MODES.HTML)}
                className={`flex-1 px-6 py-4 rounded-lg flex items-center justify-center gap-3 transition-all ${displayMode === DISPLAY_MODES.HTML
                        ? 'bg-primary-gradient text-white'
                        : 'bg-white/5 hover:bg-white/10 border border-card'
                    }`}
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
                </svg>
                <span className="font-semibold">HTML 预览</span>
            </button>
        </div>
    )
}
