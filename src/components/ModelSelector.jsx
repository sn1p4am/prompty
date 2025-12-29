import { useState } from 'react'

export function ModelSelector({ apiConfig, selectedModels, onModelsChange }) {
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [newModelName, setNewModelName] = useState('')

    const models = apiConfig.getModels()

    const toggleModel = (model) => {
        if (selectedModels.includes(model)) {
            onModelsChange(selectedModels.filter(m => m !== model))
        } else {
            onModelsChange([...selectedModels, model])
        }
    }

    const handleAddModel = () => {
        if (newModelName.trim()) {
            apiConfig.addCustomModel(apiConfig.currentProvider, newModelName.trim())
            onModelsChange([...selectedModels, newModelName.trim()])
            setNewModelName('')
            setShowAddDialog(false)
        }
    }

    return (
        <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
                <label className="font-semibold">选择模型（可多选）</label>
                <button
                    onClick={() => setShowAddDialog(!showAddDialog)}
                    className="px-3 py-1 text-sm bg-primary-gradient text-white rounded-lg hover:opacity-90 transition-all"
                >
                    + 添加自定义模型
                </button>
            </div>

            {/* 添加自定义模型对话框 */}
            {showAddDialog && (
                <div className="mb-3 p-3 bg-white/5 border border-card rounded-lg">
                    <input
                        type="text"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="输入模型名称，例如：gpt-4o-2024-08-06"
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
                            确认添加
                        </button>
                    </div>
                </div>
            )}

            {/* 模型列表 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {models.map(model => (
                    <button
                        key={model}
                        onClick={() => toggleModel(model)}
                        className={`px-3 py-2 text-sm rounded-lg transition-all text-left ${selectedModels.includes(model)
                                ? 'bg-primary text-white font-semibold'
                                : 'bg-white/5 border border-card hover:bg-white/10'
                            }`}
                    >
                        <div className="truncate">{model}</div>
                    </button>
                ))}
            </div>

            {selectedModels.length > 0 && (
                <div className="mt-2 text-sm text-text-secondary">
                    已选择 {selectedModels.length} 个模型
                </div>
            )}
        </div>
    )
}
