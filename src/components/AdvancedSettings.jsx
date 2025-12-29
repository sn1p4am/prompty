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
}) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {/* 请求数 */}
            <div>
                <label className="block mb-2 text-sm font-semibold">请求数</label>
                <select
                    value={batchSize}
                    onChange={(e) => onBatchSizeChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </select>
            </div>

            {/* 间隔 */}
            <div>
                <label className="block mb-2 text-sm font-semibold">间隔(ms)</label>
                <input
                    type="number"
                    min="0"
                    max="5000"
                    step="100"
                    value={interval}
                    onChange={(e) => onIntervalChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
            </div>

            {/* 并发数 */}
            <div>
                <label className="block mb-2 text-sm font-semibold">并发数</label>
                <input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={concurrency}
                    onChange={(e) => onConcurrencyChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
            </div>

            {/* Temperature */}
            <div>
                <label className="block mb-2 text-sm font-semibold">Temperature</label>
                <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
            </div>

            {/* Top-p */}
            <div>
                <label className="block mb-2 text-sm font-semibold">Top-p</label>
                <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(e) => onTopPChange(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
            </div>

            {/* 最大输出Token */}
            <div>
                <label className="block mb-2 text-sm font-semibold">最大输出Token</label>
                <select
                    value={maxTokens}
                    onChange={(e) => onMaxTokensChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                    <option value="">不限制</option>
                    <option value="512">512</option>
                    <option value="1024">1024</option>
                    <option value="2048">2048</option>
                    <option value="4096">4096</option>
                    <option value="8192">8192</option>
                    <option value="16384">16384</option>
                </select>
            </div>

            {/* 响应模式 */}
            <div>
                <label className="block mb-2 text-sm font-semibold">响应模式</label>
                <select
                    value={streamMode ? 'true' : 'false'}
                    onChange={(e) => onStreamModeChange(e.target.value === 'true')}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                    <option value="true">流式</option>
                    <option value="false">非流式</option>
                </select>
            </div>
        </div>
    )
}
