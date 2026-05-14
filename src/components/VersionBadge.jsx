import { useState } from 'react'
import { Calendar, CheckCircle2 } from 'lucide-react'

// 版本信息配置
const VERSION_INFO = {
    version: 'v3.8.16',
    date: '2026-05-14',
    changes: [
        { emoji: '📊', label: 'OpenAI 缓存字段', desc: '兼容 prompt_tokens_details 与 input_tokens_details 两种 cached_tokens' },
        { emoji: '🔌', label: '代理兼容', desc: '修复部分 OpenAI-compatible 代理命中缓存但 UI 显示为 0 的问题' },
        { emoji: '📚', label: '字段说明', desc: '缓存计算方法同步标注 Chat 与 Responses usage 差异' },
        { emoji: '🧪', label: '测试覆盖', desc: '补充 Responses 风格 usage 的缓存命中断言' },
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
                            <li key={index} className="text-xs text-foreground/90 leading-relaxed">
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
