import { useEffect, useRef } from 'react'
import { renderMarkdown } from '../services/markdownRenderer'
import { extractHtml, repairHtml, isHtmlTruncated } from '../utils/htmlExtractor'

export function ResultCard({ result, displayMode }) {
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
                return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">进行中</span>
            case 'success':
                return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">成功</span>
            case 'failed':
                return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">失败</span>
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
                    <div className="flex-1 bg-white rounded overflow-hidden">
                        <iframe
                            srcDoc={repairedHtml}
                            className="w-full h-full border-0"
                            sandbox="allow-scripts"
                            title={`preview-${result.id}`}
                        />
                    </div>
                    {isTruncated && (
                        <div className="mt-2 text-xs text-yellow-400">⚠️ 内容可能被截断</div>
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
                    className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 transition-all"
                >
                    复制
                </button>
            </div>
        </div>
    )
}

export function ResultsGrid({ results, displayMode }) {
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
                <ResultCard key={result.id} result={result} displayMode={displayMode} />
            ))}
        </div>
    )
}
