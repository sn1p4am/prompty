import { PROVIDER_INFO } from '../constants/providers'

export function ApiKeyManager({ apiConfig, onToast }) {
    const { currentProvider, getApiKey, saveApiKey, clearApiKey, switchProvider } = apiConfig
    const apiKey = getApiKey()
    const hasKey = !!apiKey
    const providerInfo = PROVIDER_INFO[currentProvider]

    const handleSaveKey = () => {
        const input = document.getElementById('api-key-input')
        if (input && input.value) {
            saveApiKey(currentProvider, input.value)
            input.value = ''
            onToast('API Key 已保存')
            // 强制重新渲染
            window.location.reload()
        }
    }

    const handleClearKey = () => {
        if (confirm('确定要清除当前供应商的 API Key 吗？')) {
            clearApiKey(currentProvider)
            onToast('API Key 已清除')
            window.location.reload()
        }
    }

    return (
        <div className="mb-5 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-card">
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                </svg>
                <span className="font-semibold">API Key 配置</span>
                {hasKey && (
                    <span className="ml-auto inline-flex items-center gap-2 px-3 py-1 bg-green-500/15 border border-green-500/30 rounded-full text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        已配置
                    </span>
                )}
            </div>

            {/* 供应商选择 */}
            <div className="mb-3">
                <label className="block mb-2 text-sm font-semibold">选择供应商</label>
                <select
                    value={currentProvider}
                    onChange={(e) => {
                        switchProvider(e.target.value)
                        window.location.reload()
                    }}
                    className="w-full max-w-xs px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                    {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <option key={key} value={key}>
                            {info.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* API Key 输入 */}
            <div className="flex gap-2 items-center flex-wrap">
                <input
                    id="api-key-input"
                    type="password"
                    placeholder={hasKey ? '••••••••' : `请输入 ${providerInfo?.name} API Key...`}
                    className="flex-1 min-w-[200px] px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveKey()}
                />
                <button
                    onClick={handleSaveKey}
                    className="px-4 py-2 bg-primary-gradient text-white font-semibold rounded-lg hover:opacity-90 transition-all"
                >
                    保存
                </button>
                <button
                    onClick={handleClearKey}
                    className="px-4 py-2 bg-white/10 border border-card rounded-lg hover:bg-white/15 transition-all"
                >
                    清除
                </button>
            </div>

            {/* 获取 Key 链接 */}
            {providerInfo?.getKeyUrl && (
                <div className="mt-2 text-sm text-text-secondary">
                    没有 API Key？
                    <a
                        href={providerInfo.getKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-1"
                    >
                        点击获取
                    </a>
                </div>
            )}
        </div>
    )
}
