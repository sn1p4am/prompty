import { useState } from 'react'
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Label } from "./ui/label"
import { Plus } from "lucide-react"

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
                    onClick={() => setShowAddDialog(!showAddDialog)}
                    title="添加自定义模型"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {showAddDialog && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-black border border-primary p-4 shadow-glow">
                    <Label className="mb-2 block">输入模型 ID</Label>
                    <Input
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="例如: openai/gpt-4o"
                        className="mb-4"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                        autoFocus
                    />
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
                        >
                            确认
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
