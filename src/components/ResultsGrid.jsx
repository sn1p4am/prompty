import { DISPLAY_MODES } from '../constants/providers'

function ResultCard({ result, onViewFull, onCopy }) {
    const statusColors = {
        pending: 'bg-gray-500/20 text-gray-400',
        running: 'bg-blue-500/20 text-blue-400',
        success: 'bg-green-500/20 text-green-400',
        failed: 'bg-red-500/20 text-red-400',
    }

    const statusLabels = {
        pending: '等待中',
        running: '生成中...',
        success: '完成',
        failed: '失败',
    }

    return (
        <div className="bg-card-bg border border-card rounded-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-card">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-secondary">#{result.index + 1}</span>
                    <span className="text-sm text-text-primary">{result.model}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${statusColors[result.status]}`}>
                    {result.status === 'running' && (
                        <span className="inline-block w-3 h-3 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    )}
                    {statusLabels[result.status]}
                </span>
            </div>

            {/* Content */}
            <div className="p-4 min-h-[150px] max-h-[300px] overflow-auto">
                {result.error ? (
                    <div className="text-red-400 text-sm">{result.error}</div>
                ) : result.content ? (
                    <div className="text-sm text-text-primary whitespace-pre-wrap">{result.content}</div>
                ) : (
                    <div className="text-text-secondary text-sm italic">等待响应...</div>
                )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-4 py-3 border-t border-card bg-white/5">
                <button
                    onClick={() => onViewFull(result)}
                    className="flex-1 px-3 py-1 text-xs bg-white/10 rounded hover:bg-white/15 transition-all"
                >
                    查看完整
                </button>
                <button
                    onClick={() => onCopy(result.content)}
                    disabled={!result.content}
                    className="flex-1 px-3 py-1 text-xs bg-white/10 rounded hover:bg-white/15 transition-all disabled:opacity-50"
                >
                    复制
                </button>
            </div>
        </div>
    )
}

export function ResultsGrid({ results, displayMode, onViewFull, onCopy }) {
    if (results.length === 0) return null

    if (displayMode === DISPLAY_MODES.HTML) {
        // HTML 预览模式
        return (
            <div className="space-y-4">
                {results.map(result => (
                    <div key={result.id} className="bg-card-bg border border-card rounded-card overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-card">
                            <span className="text-sm">#{result.index + 1} - {result.model}</span>
                            <span className={`px-2 py-1 rounded text-xs ${result.status === 'success' ? 'bg-green-500/20 text-green-400' :
                                    result.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                        result.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-gray-500/20 text-gray-400'
                                }`}>
                                {result.status === 'running' ? '生成中...' : result.status === 'success' ? '完成' : result.status === 'failed' ? '失败' : '等待中'}
                            </span>
                        </div>
                        <div
                            className="p-4 min-h-[200px] bg-white text-black"
                            dangerouslySetInnerHTML={{
                                __html: result.content || (result.error ? `<span style="color:red">${result.error}</span>` : '<span style="color:gray">等待响应...</span>')
                            }}
                        />
                    </div>
                ))}
            </div>
        )
    }

    // 卡片模式
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
