import { useEffect, useRef } from 'react'
import { renderMarkdown } from '../services/markdownRenderer'
import { extractHtml, repairHtml, isHtmlTruncated } from '../utils/htmlExtractor'

export function ResultCard({ result, displayMode, onViewFull, onViewHtmlFullscreen, onDebug }) {
    const contentRef = useRef(null)

    useEffect(() => {
        if (contentRef.current && result.content && displayMode === 'card') {
            renderMarkdown(contentRef.current, result.content)
        }
    }, [result.content, displayMode])

    const getStatusColor = () => {
        switch (result.status) {
            case 'running':
                return 'border-blue-500/50'
            case 'success':
                return 'border-green-500/50'
            case 'failed':
                return 'border-red-500/50'
            default:
                return 'border-card'
        }
    }

    const getStatusBadge = () => {
        switch (result.status) {
            case 'running':
                return (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1">
                        <span className="animate-spin w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full"></span>
                        进行中
                    </span>
                )
            case 'success':
                return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">✓ 成功</span>
            case 'failed':
                return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">✗ 失败</span>
            default:
                return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">等待中</span>
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(result.content)
            .then(() => alert('已复制到剪贴板'))
            .catch(() => alert('复制失败'))
    }

    // HTML 预览模式
    if (displayMode === 'html-preview') {
        const htmlContent = extractHtml(result.content)
        if (htmlContent) {
            const isTruncated = isHtmlTruncated(htmlContent)
            const repairedHtml = isTruncated ? repairHtml(htmlContent) : htmlContent

            return (
                <div className={`bg-card backdrop-blur-lg border-2 ${getStatusColor()} rounded-card p-3 shadow-card h-[600px] flex flex-col`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm truncate">{result.model}</span>
                        {getStatusBadge()}
                    </div>
                    <div className="flex-1 bg-white rounded overflow-hidden relative group">
                        <iframe
                            srcDoc={repairedHtml}
                            className="w-full h-full border-0"
                            sandbox="allow-scripts"
                            title={`preview-${result.id}`}
                        />
                        {/* 全屏按钮 */}
                        <button
                            onClick={() => onViewHtmlFullscreen && onViewHtmlFullscreen(result)}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-all"
                            title="全屏查看"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                    </div>
                    {isTruncated && (
                        <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            内容可能被截断
                        </div>
                    )}
                </div>
            )
        }
    }

    // 卡片模式
    return (
        <div className={`bg-card backdrop-blur-lg border-2 ${getStatusColor()} rounded-card p-3 shadow-card h-[420px] flex flex-col`}>
            <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm truncate">{result.model}</span>
                {getStatusBadge()}
            </div>

            <div
                ref={contentRef}
                className="flex-1 overflow-y-auto text-sm leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {result.status === 'failed' && result.error ? (
                    <div className="text-red-400 text-xs">{result.error}</div>
                ) : result.content ? (
                    result.content
                ) : (
                    <div className="text-text-secondary text-xs">等待中...</div>
                )}
            </div>

            <div className="mt-2 pt-2 border-t border-card flex gap-2">
                <button
                    onClick={handleCopy}
                    disabled={!result.content}
                    className="flex-1 px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                    title="复制内容"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制
                </button>
                <button
                    onClick={() => onViewFull && onViewFull(result)}
                    disabled={!result.content}
                    className="flex-1 px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                    title="查看完整内容"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    查看
                </button>
                <button
                    onClick={() => onDebug && onDebug(result)}
                    className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-all flex items-center justify-center gap-1"
                    title="调试信息"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export function ResultsGrid({ results, displayMode, onViewFull, onViewHtmlFullscreen, onDebug }) {
    if (results.length === 0) {
        return (
            <div className="text-center text-text-secondary py-12">
                <p>暂无测试结果</p>
                <p className="text-sm mt-2">输入提示词并点击"开始批量测试"开始</p>
            </div>
        )
    }

    return (
        <div className={`grid gap-4 ${displayMode === 'html-preview' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
            {results.map(result => (
                <ResultCard
                    key={result.id}
                    result={result}
                    displayMode={displayMode}
                    onViewFull={onViewFull}
                    onViewHtmlFullscreen={onViewHtmlFullscreen}
                    onDebug={onDebug}
                />
            ))}
        </div>
    )
}
