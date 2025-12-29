export function ConfigPanel({
    prompt,
    onPromptChange,
    temperature,
    onTemperatureChange,
    topP,
    onTopPChange,
    maxTokens,
    onMaxTokensChange,
}) {
    return (
        <div>
            {/* 提示词输入 */}
            <div className="mb-5">
                <label className="block mb-2 font-semibold">提示词</label>
                <textarea
                    className="w-full min-h-[150px] p-4 bg-white/5 border border-card rounded-card text-text-primary resize-vertical focus:outline-none focus:border-primary transition-all"
                    placeholder="输入你的提示词..."
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                />
            </div>

            {/* 参数设置 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
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
                <div>
                    <label className="block mb-2 text-sm font-semibold">Top P</label>
                    <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={topP}
                        onChange={(e) => onTopPChange(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-semibold">Max Tokens</label>
                    <input
                        type="number"
                        min="1"
                        max="32000"
                        step="1"
                        value={maxTokens}
                        onChange={(e) => onMaxTokensChange(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                    />
                </div>
            </div>
        </div>
    )
}
