import { useState } from 'react'

export function ModelSelector({ apiConfig, selectedModel, onModelChange }) {
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [newModelName, setNewModelName] = useState('')

    const models = apiConfig.getModels()

    const handleAddModel = () => {
        if (newModelName.trim()) {
            const success = apiConfig.addCustomModel(apiConfig.currentProvider, newModelName.trim())
            if (success) {
                onModelChange(newModelName.trim())
                setNewModelName('')
                setShowAddDialog(false)
            }
        }
    }

    return (
        <div>
            <label className="block mb-2 font-semibold">模型</label>
            <div className="flex gap-2">
                <select
                    value={selectedModel || ''}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                    <option value="">选择模型</option>
                    {models.map(model => (
                        <option key={model} value={model}>
                            {model}
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => setShowAddDialog(!showAddDialog)}
                    className="px-3 py-2 bg-primary-gradient text-white rounded-lg hover:opacity-90 transition-all flex items-center justify-center"
                    title="添加自定义模型"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                </button>
            </div>

            {/* 添加自定义模型对话框 */}
            {showAddDialog && (
                <div className="mt-3 p-3 bg-white/5 border border-card rounded-lg">
                    <input
                        type="text"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="输入模型 ID（如 openai/gpt-4o）"
                        className="w-full px-3 py-2 bg-white/5 border border-card rounded-lg text-text-primary mb-2 focus:outline-none focus:border-primary"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddModel()}
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setShowAddDialog(false)}
                            className="px-4 py-1 text-sm bg-white/10 border border-card rounded hover:bg-white/15 transition-all"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleAddModel}
                            className="px-4 py-1 text-sm bg-primary-gradient text-white rounded hover:opacity-90 transition-all"
                        >
                            确定
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
