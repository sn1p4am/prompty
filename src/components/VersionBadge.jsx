import { useState } from 'react'
import { Calendar, CheckCircle2 } from 'lucide-react'

// 版本信息配置
const VERSION_INFO = {
    version: 'v3.1.2',
    date: '2026-01-15',
    changes: [
        { emoji: '🧠', label: 'Thinking 完善', desc: '修复火山方舟和阿里百炼的深度思考参数配置' },
        { emoji: '✨', label: '思维链显示', desc: '自动解析并显示 reasoning_content 思维链内容' },
        { emoji: '📊', label: '性能指标', desc: '所有 provider 显示性能指标，包含思维链 token 统计' },
        { emoji: '🔧', label: '参数优化', desc: '完善 thinking 和 enable_thinking 参数逻辑' },
    ]
}

export function VersionBadge() {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            className="relative z-50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 版本徽章 */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-full text-[11px] text-primary cursor-help transition-all hover:bg-primary/20 hover:-translate-y-0.5">
                <Calendar className="w-3 h-3" />
                <span className="font-mono">{VERSION_INFO.version}</span>
            </div>

            {/* 更新日志 Tooltip */}
            {isHovered && (
                <div className="absolute top-full left-0 mt-2 bg-background border border-border rounded-lg p-4 min-w-[320px] max-w-[400px] shadow-lg shadow-black/50 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* 箭头 */}
                    <div className="absolute -top-1.5 left-4 w-3 h-3 bg-background border-l border-t border-border rotate-45" />

                    {/* 标题 */}
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-primary pb-2 mb-3 border-b border-border">
                        <CheckCircle2 className="w-4 h-4" />
                        {VERSION_INFO.version} 更新日志
                        <span className="text-[10px] text-muted font-normal ml-auto">{VERSION_INFO.date}</span>
                    </h4>

                    {/* 更新列表 */}
                    <ul className="space-y-2">
                        {VERSION_INFO.changes.map((change, index) => (
                            <li key={index} className="text-xs text-foreground/80 leading-relaxed">
                                <span className="mr-1.5">{change.emoji}</span>
                                <strong className="text-primary">{change.label}</strong>
                                <span className="text-muted">：{change.desc}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
