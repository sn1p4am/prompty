import { useState } from 'react'

export function TabNavigation({ activeTab, onTabChange, children }) {
    return (
        <div className="bg-card backdrop-blur-lg border border-card rounded-card mb-8 shadow-card overflow-hidden">
            {/* 标签导航 */}
            <div className="flex bg-black/20 border-b border-card">
                <button
                    onClick={() => onTabChange('config')}
                    className={`flex-1 px-6 py-4 font-semibold transition-all border-b-3 ${activeTab === 'config'
                            ? 'bg-primary/10 border-primary text-text-primary'
                            : 'border-transparent text-text-secondary hover:bg-white/5'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        基础配置
                    </div>
                </button>
                <button
                    onClick={() => onTabChange('advanced')}
                    className={`flex-1 px-6 py-4 font-semibold transition-all border-b-3 ${activeTab === 'advanced'
                            ? 'bg-primary/10 border-primary text-text-primary'
                            : 'border-transparent text-text-secondary hover:bg-white/5'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        高级设置
                    </div>
                </button>
            </div>

            {/* 标签内容 */}
            <div className="p-6">
                {children}
            </div>
        </div>
    )
}
