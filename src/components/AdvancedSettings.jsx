export function AdvancedSettings({ concurrency, onConcurrencyChange, interval, onIntervalChange }) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block mb-2 text-sm font-semibold">并发数</label>
                <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={concurrency}
                    onChange={(e) => onConcurrencyChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-text-secondary mt-1">同时发送的最大请求数</p>
            </div>
            <div>
                <label className="block mb-2 text-sm font-semibold">请求间隔（毫秒）</label>
                <input
                    type="number"
                    min="0"
                    max="5000"
                    step="100"
                    value={interval}
                    onChange={(e) => onIntervalChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-text-secondary mt-1">每个请求之间的延迟</p>
            </div>
        </div>
    )
}
