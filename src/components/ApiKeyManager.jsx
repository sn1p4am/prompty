import { PROVIDER_INFO } from '../constants/providers'

export function ApiKeyManager({ apiConfig, onToast }) {
    const { currentProvider, getApiKey, saveApiKey, clearApiKey, switchProvider } = apiConfig
    const apiKey = getApiKey()
    const hasKey = !!apiKey

    const handleSaveKey = () => {
        const input = document.getElementById('api-key-input')
        if (input && input.value) {
            saveApiKey(currentProvider, input.value)
            input.value = ''
            onToast('API Key 已保存')
        }
    }

    const handleClearKey = () => {
        if (confirm('确定要清除当前供应商的 API Key 吗？')) {
            clearApiKey(currentProvider)
            onToast('API Key 已清除')
        }
    }

    return (
        <div className="mb-5 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-card">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">API Key 配置</h3>
                {hasKey && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/15 border border-green-500/30 rounded-full text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        已配置
                    </span>
                )}
            </div>

            {/* 供应商选择（下拉框） */}
            <div className="mb-3">
                <label className="block mb-2 text-sm font-semibold">选择供应商</label>
                <select
                    value={currentProvider}
                    onChange={(e) => switchProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                    {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <option key={key} value={key}>
                            {info.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* API Key 输入 */}
            {!hasKey ? (
                <div className="flex gap-2">
                    <input
                        id="api-key-input"
                        type="password"
                        placeholder={`输入 ${PROVIDER_INFO[currentProvider].name} API Key`}
                        className="flex-1 px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                    />
                    <button
                        onClick={handleSaveKey}
                        className="px-6 py-2 bg-primary-gradient text-white font-semibold rounded-lg hover:opacity-90 transition-all"
                    >
                        保存
                    </button>
                </div>
            ) : (
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-text-secondary">API Key: ••••••••</span>
                    <button
                        onClick={handleClearKey}
                        className="px-4 py-1 text-sm bg-red-500/20 border border-red-500/30 text-red-400 rounded hover:bg-red-500/30 transition-all"
                    >
                        清除
                    </button>
                </div>
            )}
        </div>
    )
}
