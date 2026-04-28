import { useEffect, useState } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Label } from "./ui/label"
import { Plus } from "lucide-react"
import { PROVIDERS } from "../constants/providers"

export function ModelSelector({ apiConfig, selectedModel, onModelChange }) {
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [newModelName, setNewModelName] = useState('')
    const [newModelAppId, setNewModelAppId] = useState('')
    const [appIdDraft, setAppIdDraft] = useState('')
    const [appIdSaveButtonText, setAppIdSaveButtonText] = useState('保存')

    const models = apiConfig.getModels()
    const isCloudsway = apiConfig.currentProvider === PROVIDERS.CLOUDSWAY
    const selectedModelAppId = isCloudsway && selectedModel
        ? apiConfig.getModelAppId(apiConfig.currentProvider, selectedModel)
        : ''
    const canAddModel = !!newModelName.trim() && (!isCloudsway || !!newModelAppId.trim())

    useEffect(() => {
        setAppIdDraft(selectedModelAppId)
    }, [selectedModelAppId])

    useEffect(() => {
        setAppIdSaveButtonText('保存')
    }, [selectedModel])

    const handleToggleAddDialog = () => {
        const nextShowAddDialog = !showAddDialog
        setShowAddDialog(nextShowAddDialog)
        if (nextShowAddDialog) {
            setNewModelName('')
            setNewModelAppId('')
        }
    }

    const handleAddModel = () => {
        const normalizedModelName = newModelName.trim()
        const normalizedAppId = newModelAppId.trim()

        if (normalizedModelName && (!isCloudsway || normalizedAppId)) {
            const success = apiConfig.addCustomModel(
                apiConfig.currentProvider,
                normalizedModelName,
                isCloudsway ? { appId: normalizedAppId } : undefined
            )
            if (success) {
                onModelChange(normalizedModelName)
                setNewModelName('')
                setNewModelAppId('')
                setShowAddDialog(false)
            }
        }
    }

    const handleSaveModelAppId = () => {
        const normalizedAppId = appIdDraft.trim()
        if (!selectedModel || !normalizedAppId) {
            return
        }

        const success = apiConfig.saveModelAppId(apiConfig.currentProvider, selectedModel, normalizedAppId)
        if (success) {
            setAppIdSaveButtonText('已保存!')
            setTimeout(() => setAppIdSaveButtonText('保存'), 2000)
        }
    }

    return (
        <div className="flex flex-col gap-1 relative w-full">
            <Label>目标模型 (Target Model)</Label>
            <div className="flex gap-2">
                <div className="flex-1">
                    <Select
                        value={selectedModel || ''}
                        onChange={(e) => onModelChange(e.target.value)}
                    >
                        <option value="">选择模型...</option>
                        {models.map(model => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </Select>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleToggleAddDialog}
                    title="添加自定义模型"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {isCloudsway && selectedModel && (
                <div className="flex gap-2 items-end pt-2">
                    <div className="flex-1">
                        <Label className="flex justify-between w-full">
                            <span>App ID</span>
                            {selectedModelAppId ? (
                                <span className="text-xs text-primary font-bold">已配置</span>
                            ) : (
                                <span className="text-xs text-destructive">未配置</span>
                            )}
                        </Label>
                        <Input
                            type="text"
                            value={appIdDraft}
                            placeholder="输入当前模型 App ID"
                            onChange={(e) => setAppIdDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveModelAppId()}
                        />
                    </div>
                    <Button
                        size="sm"
                        onClick={handleSaveModelAppId}
                        disabled={!selectedModel || !appIdDraft.trim() || appIdSaveButtonText !== '保存'}
                    >
                        {appIdSaveButtonText}
                    </Button>
                </div>
            )}

            {showAddDialog && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-black border border-primary p-4 shadow-glow">
                    <Label className="mb-2 block">输入模型 ID</Label>
                    <Input
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="例如: openai/gpt-4o"
                        className={isCloudsway ? "mb-3" : "mb-4"}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                        autoFocus
                    />
                    {isCloudsway && (
                        <>
                            <Label className="mb-2 block">输入 App ID</Label>
                            <Input
                                value={newModelAppId}
                                onChange={(e) => setNewModelAppId(e.target.value)}
                                placeholder="Cloudsway 当前模型 App ID"
                                className="mb-4"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                            />
                        </>
                    )}
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddDialog(false)}
                        >
                            取消
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleAddModel}
                            disabled={!canAddModel}
                        >
                            确认
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
