export function StatsPanel({ total, success, failed, running }) {
    return (
        <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-card-bg border border-card rounded-card p-4 text-center">
                <div className="text-2xl font-bold text-text-primary">{total}</div>
                <div className="text-sm text-text-secondary">总数</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-card p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{success}</div>
                <div className="text-sm text-green-400/70">成功</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-card p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{failed}</div>
                <div className="text-sm text-red-400/70">失败</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-card p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{running}</div>
                <div className="text-sm text-blue-400/70">运行中</div>
            </div>
        </div>
    )
}
