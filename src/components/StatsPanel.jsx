export function StatsPanel({ stats }) {
    return (
        <div className="bg-card backdrop-blur-lg border border-card rounded-card p-6 mb-8 shadow-card">
            <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                    <div className="text-5xl font-bold bg-primary-gradient bg-clip-text text-transparent">
                        {stats.success}
                    </div>
                    <div className="text-sm text-text-secondary mt-2 uppercase tracking-wider">成功</div>
                </div>
                <div>
                    <div className="text-5xl font-bold bg-error-gradient bg-clip-text text-transparent">
                        {stats.failed}
                    </div>
                    <div className="text-sm text-text-secondary mt-2 uppercase tracking-wider">失败</div>
                </div>
                <div>
                    <div className="text-5xl font-bold bg-success-gradient bg-clip-text text-transparent">
                        {stats.running}
                    </div>
                    <div className="text-sm text-text-secondary mt-2 uppercase tracking-wider">进行中</div>
                </div>
            </div>
        </div>
    )
}
