import { DISPLAY_MODES } from '../constants/providers'
import { Card, CardHeader, CardContent, CardFooter } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"
import { useEffect, useRef } from "react"
import { Copy, Maximize2, Loader2, CheckCircle2, XCircle, Clock, SquareTerminal, AlertTriangle, Brain } from "lucide-react"

/**
 * 解析内容，提取 thinking 部分和实际回答部分
 * 支持多种 thinking 标签格式：<think>、<thinking>、<thought>
 */
function parseThinkingContent(content) {
    if (!content) return { thinking: '', answer: '' }

    // 匹配各种可能的 thinking 标签
    const thinkRegex = /<think>([\s\S]*?)<\/think>|<thinking>([\s\S]*?)<\/thinking>|<thought>([\s\S]*?)<\/thought>/gi

    let thinking = ''
    let answer = content

    // 提取所有 thinking 内容
    const matches = content.matchAll(thinkRegex)
    for (const match of matches) {
        thinking += (match[1] || match[2] || match[3] || '') + '\n\n'
    }

    // 移除 thinking 标签，得到实际回答
    answer = content.replace(thinkRegex, '').trim()

    return {
        thinking: thinking.trim(),
        answer: answer
    }
}

function StatusBadge({ status }) {
    if (status === 'running') return <Badge variant="secondary" className="animate-pulse">运行中</Badge>
    if (status === 'success') return <Badge variant="success">完成</Badge>
    if (status === 'failed') return <Badge variant="destructive">错误</Badge>
    return <Badge variant="outline">等待中</Badge>
}

function ResultCard({ result, onViewFull, onCopy }) {
    // Auto-scroll logic
    const contentRef = useRef(null)

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight
        }
    }, [result.content])

    // Check if metadata should be shown (available for all providers)
    const showMeta = result.metadata && (result.metadata.totalDuration || result.metadata.usage || result.metadata.provider !== undefined)

    return (
        <Card className="flex flex-col h-[300px] overflow-hidden group border-dashed hover:border-solid hover:shadow-glow transition-all duration-300">
            <CardHeader className="p-3 border-b border-border bg-primary/5 flex flex-row items-center justify-between space-y-0 text-xs">
                <div className="flex items-center gap-2 truncate text-primary font-bold">
                    <span className="font-mono opacity-50">#{String(result.index + 1).padStart(2, '0')}</span>
                    <span className="truncate" title={result.model}>{result.model.toUpperCase()}</span>
                </div>
                <StatusBadge status={result.status} />
            </CardHeader>
            <CardContent
                ref={contentRef}
                className="flex-1 p-3 overflow-y-auto text-xs font-mono leading-relaxed custom-scrollbar scroll-smooth"
            >
                {result.error ? (
                    <span className="text-destructive whitespace-pre-wrap">{`[ERROR]: ${result.error}`}</span>
                ) : result.content ? (
                    (() => {
                        const { thinking, answer } = parseThinkingContent(result.content)
                        return (
                            <div className="space-y-3">
                                {/* Thinking 内容区域 */}
                                {thinking && (
                                    <div className="border-l-2 border-blue-500/50 bg-blue-500/5 pl-3 pr-2 py-2 rounded-r">
                                        <div className="flex items-center gap-1 text-blue-400 mb-2 text-[10px] font-bold uppercase tracking-wider">
                                            <Brain className="w-3 h-3" />
                                            <span>深度思考过程</span>
                                        </div>
                                        <div className="text-blue-300/80 whitespace-pre-wrap text-[11px] leading-relaxed">
                                            {thinking}
                                        </div>
                                    </div>
                                )}
                                {/* 实际回答区域 */}
                                {answer && (
                                    <div className="whitespace-pre-wrap text-foreground/90">
                                        {answer}
                                    </div>
                                )}
                            </div>
                        )
                    })()
                ) : (
                    <span className="text-muted text-xs animate-pulse">_ 等待流式输出...</span>
                )}
            </CardContent>
            {/* Footer with actions and OpenRouter metadata */}
            <CardFooter className="p-2 border-t border-border bg-primary/5 flex flex-col gap-1">
                {/* OpenRouter Metadata - 2 rows × 3 columns */}
                {showMeta && (
                    <div className="w-full text-[10px] text-primary/60 font-mono px-1 mb-1 space-y-0.5">
                        {/* Row 1: Provider | 首字延迟 | 耗时 */}
                        <div className="flex items-center justify-between">
                            <span title="实际供应商" className="truncate flex-1">
                                {result.metadata.provider === null
                                    ? <span className="animate-pulse">加载中...</span>
                                    : (result.metadata.provider || '-')}
                            </span>
                            <span title="首字延迟" className="flex-1 text-center">
                                首字:{result.metadata.firstTokenLatency || 0}ms
                            </span>
                            <span title="总耗时" className="flex-1 text-right">
                                耗时:{result.metadata.totalDuration ? (result.metadata.totalDuration / 1000).toFixed(2) : 0}s
                            </span>
                        </div>
                        {/* Row 2: Tokens | 速度 | 费用 */}
                        {result.metadata.usage && (
                            <div className="flex items-center justify-between">
                                <span title="入/出/总 Tokens" className="flex-1">
                                    {result.metadata.usage.prompt_tokens || 0}/{result.metadata.usage.completion_tokens || 0}({result.metadata.usage.total_tokens || 0})
                                </span>
                                <span title="生成速度" className="flex-1 text-center">
                                    {result.metadata.usage.completion_tokens && result.metadata.totalDuration
                                        ? (result.metadata.usage.completion_tokens / (result.metadata.totalDuration / 1000)).toFixed(1)
                                        : 0}tok/s
                                </span>
                                <span title="费用 (USD)" className="flex-1 text-right text-yellow-400/80">
                                    ${result.metadata.usage.cost !== undefined ? result.metadata.usage.cost.toFixed(6) : '0.000000'}
                                </span>
                            </div>
                        )}
                    </div>
                )}
                {/* Action Buttons Row */}
                <div className="w-full flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1" onClick={() => onViewFull(result)}>
                        展开
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1" onClick={() => onCopy(result.content)} disabled={!result.content}>
                        复制
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}

function HtmlPreviewCard({ result, onViewFull }) {
    const isCompleted = result.status === 'success' || result.status === 'failed'

    // Extract HTML content logic
    const getHtmlContent = (content) => {
        if (!content) return null
        const match = content.match(/<!DOCTYPE html>[\s\S]*<\/html>/i) || content.match(/<html[\s\S]*<\/html>/i)
        return match ? match[0] : null
    }

    const htmlContent = isCompleted ? getHtmlContent(result.content) : null

    return (
        <Card className="flex flex-col h-[600px] overflow-hidden border-border hover:shadow-glow">
            <CardHeader className="p-3 border-b border-border bg-primary/10 flex flex-row items-center justify-between space-y-0">
                <div className="text-sm font-bold text-primary">
                    <SquareTerminal className="w-4 h-4 inline-block mr-2" />
                    {`页面预览_${String(result.index + 1).padStart(3, '0')}`}
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={result.status} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:text-black hover:bg-primary ml-2"
                        onClick={() => onViewFull(result)}
                        title="全屏预览"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <div className="flex-1 bg-white relative overflow-hidden">
                {!isCompleted ? (
                    // Running/Pending State
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-black/50 gap-4 bg-gray-50">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm font-mono animate-pulse">正在生成 HTML...</span>
                    </div>
                ) : htmlContent ? (
                    // Success with valid HTML
                    <iframe
                        srcDoc={htmlContent}
                        className="w-full h-full border-none"
                        title={`Preview ${result.index}`}
                        sandbox="allow-scripts"
                    />
                ) : (
                    // Failed or No HTML found
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive gap-4 p-8 text-center bg-red-50">
                        <AlertTriangle className="w-10 h-10 opacity-50" />
                        <div className="space-y-2">
                            <h3 className="font-bold">无法渲染预览</h3>
                            <p className="text-xs opacity-70 font-mono">
                                {result.error || "未检测到有效的 HTML 代码块 (<!DOCTYPE html>...</html>)"}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}

export function ResultsGrid({ results, displayMode, onViewFull, onCopy }) {
    if (!results || results.length === 0) return null

    if (displayMode === DISPLAY_MODES.HTML) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {results.map(result => (
                    <HtmlPreviewCard key={result.id} result={result} onViewFull={onViewFull} />
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
            {results.map(result => (
                <ResultCard
                    key={result.id}
                    result={result}
                    onViewFull={onViewFull}
                    onCopy={onCopy}
                />
            ))}
        </div>
    )
}
