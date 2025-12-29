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
            </div>
        </div>
    )
}
