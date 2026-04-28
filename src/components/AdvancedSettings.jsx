import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { Settings } from "lucide-react"
import { useState } from "react"
import { cn } from "../lib/utils"

const TEMPERATURE_OPTIONS = [
    '',
    ...Array.from({ length: 21 }, (_, index) => (index / 10).toFixed(1).replace(/\.0$/, ''))
]

const TOP_P_OPTIONS = [
    '',
    ...Array.from({ length: 21 }, (_, index) => (index * 0.05).toFixed(2).replace(/0$/, '').replace(/\.0$/, ''))
]

function parseOptionalNumber(value) {
    return value === '' ? '' : parseFloat(value)
}

export function AdvancedSettings({
    batchSize,
    onBatchSizeChange,
    interval,
    onIntervalChange,
    concurrency,
    onConcurrencyChange,
    temperature,
    onTemperatureChange,
    topP,
    onTopPChange,
    maxTokens,
    onMaxTokensChange,
    streamMode,
    onStreamModeChange,
    enableThinking,
    onEnableThinkingChange,
}) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="border border-border bg-black">
            <Button
                variant="ghost"
                className="w-full flex justify-between items-center px-4 py-2 h-10 border-none hover:bg-primary hover:text-black uppercase tracking-widest text-xs"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" /> 高级参数配置
                </span>
                {isOpen ? "[-]" : "[+]"}
            </Button>

            <div className={cn(
                "grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6 px-4 overflow-hidden transition-all duration-300 border-t border-dashed border-border",
                isOpen ? "py-6 max-h-[500px] opacity-100" : "max-h-0 opacity-0 py-0 border-none"
            )}>
                {/* 批量大小 */}
                <div className="flex flex-col gap-2">
                    <Label title="单次并发请求的数量" className="text-xs text-muted-foreground uppercase tracking-wider">批量大小 (Batch)</Label>
                    <Select
                        value={batchSize}
                        onChange={(e) => onBatchSizeChange(parseInt(e.target.value))}
                        className="h-9 text-sm"
                    >
                        {[5, 10, 20, 30, 50, 100].map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </Select>
                </div>

                {/* 模式 */}
                <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">输出模式</Label>
                    <Select
                        value={streamMode ? 'true' : 'false'}
                        onChange={(e) => onStreamModeChange(e.target.value === 'true')}
                        className="h-9 text-sm"
                    >
                        <option value="true">流式 (Stream)</option>
                        <option value="false">缓冲 (Buffer)</option>
                    </Select>
                </div>

                {/* 深度思考 */}
                <div className="flex flex-col gap-2">
                    <Label title="启用深度思考模式（阿里/火山/Vertex 原生支持，AiOnly/AiIIOnly 会按模型兼容协议自动尝试）" className="text-xs text-muted-foreground uppercase tracking-wider">深度思考 (Thinking)</Label>
                    <Select
                        value={enableThinking ? 'true' : 'false'}
                        onChange={(e) => onEnableThinkingChange(e.target.value === 'true')}
                        className="h-9 text-sm"
                    >
                        <option value="false">禁用 (Disabled)</option>
                        <option value="true">启用 (Enabled)</option>
                    </Select>
                </div>

                {/* 并发 */}
                <div className="flex flex-col gap-2">
                    <Label title="同时执行的任务线程数" className="text-xs text-muted-foreground uppercase tracking-wider">并发线程</Label>
                    <Select
                        value={concurrency}
                        onChange={(e) => onConcurrencyChange(parseInt(e.target.value))}
                        className="h-9 text-sm"
                    >
                        {[1, 2, 3, 5, 10].map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </Select>
                </div>

                {/* 间隔 */}
                <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">请求间隔 (ms)</Label>
                    <Input
                        type="number" step="100"
                        value={interval}
                        onChange={(e) => onIntervalChange(parseInt(e.target.value))}
                        className="h-9 text-sm font-mono"
                    />
                </div>

                {/* Temp */}
                <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">温度 (Temp)</Label>
                    <Select
                        value={temperature === '' ? '' : String(temperature)}
                        onChange={(e) => onTemperatureChange(parseOptionalNumber(e.target.value))}
                        className="h-9 text-sm font-mono"
                    >
                        {TEMPERATURE_OPTIONS.map(value => (
                            <option key={value || 'disabled'} value={value}>
                                {value || '关闭 (Omit)'}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Top P */}
                <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">核采样 (Top P)</Label>
                    <Select
                        value={topP === '' ? '' : String(topP)}
                        onChange={(e) => onTopPChange(parseOptionalNumber(e.target.value))}
                        className="h-9 text-sm font-mono"
                    >
                        {TOP_P_OPTIONS.map(value => (
                            <option key={value || 'disabled'} value={value}>
                                {value || '关闭 (Omit)'}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Max Tokens */}
                <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">最大 Token</Label>
                    <Select
                        value={maxTokens}
                        onChange={(e) => onMaxTokensChange(e.target.value)}
                        className="h-9 text-sm font-mono"
                    >
                        <option value="">无限 (Inf)</option>
                        {[512, 1024, 2048, 4096, 8192, 16384].map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </Select>
                </div>
            </div>
        </div>
    )
}
