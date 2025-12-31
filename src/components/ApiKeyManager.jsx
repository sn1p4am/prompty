import React from 'react'
import { PROVIDER_INFO } from '../constants/providers'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Label } from "./ui/label"
import { Key, Unlock } from "lucide-react"

export function ApiKeyManager({ apiConfig, onToast }) {
    const { currentProvider, getApiKey, saveApiKey, clearApiKey, switchProvider } = apiConfig
    const [localKey, setLocalKey] = React.useState(getApiKey())
    const [saveButtonText, setSaveButtonText] = React.useState('保存')

    // Update local key when provider changes
    React.useEffect(() => {
        setLocalKey(getApiKey())
    }, [currentProvider, getApiKey])

    const hasKey = !!localKey
    const providerInfo = PROVIDER_INFO[currentProvider]

    const handleSaveKey = () => {
        const input = document.getElementById('api-key-input')
        if (input && input.value) {
            saveApiKey(currentProvider, input.value)
            setLocalKey(input.value) // Update state immediately
            input.value = ''

            // Visual feedback
            onToast('密钥已保存')
            setSaveButtonText('已保存!')
            setTimeout(() => setSaveButtonText('保存'), 2000)
        }
    }

    const handleClearKey = () => {
        if (confirm('确认撤销访问密钥?')) {
            clearApiKey(currentProvider)
            setLocalKey('') // Update state immediately
            onToast('密钥已撤销')
        }
    }

    return (
        <div className="flex items-end gap-6 border-b border-border pb-4 w-full">
            {/* 供应商选择 */}
            <div className="w-[200px]">
                <Label>供应商网络</Label>
                <Select
                    value={currentProvider}
                    onChange={(e) => {
                        switchProvider(e.target.value)
                        // window.location.reload() // Removed reload
                    }}
                >
                    {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <option key={key} value={key}>
                            {info.name}
                        </option>
                    ))}
                </Select>
            </div>

            {/* API Key 输入 */}
            <div className="flex-1 flex flex-col justify-end">
                <Label className="flex justify-between w-full">
                    <span>访问令牌 (ACCESS_TOKEN)</span>
                    {hasKey ? (
                        <span className="text-xs text-primary font-bold flex items-center gap-2 animate-pulse">
                            <Key className="w-3 h-3" /> 已认证
                        </span>
                    ) : (
                        <span className="text-xs text-destructive flex items-center gap-2">
                            <Unlock className="w-3 h-3" /> 未加密
                        </span>
                    )}
                </Label>

                <div className="flex gap-4">
                    <Input
                        id="api-key-input"
                        type="password"
                        placeholder={hasKey ? '****************' : `输入 ${providerInfo?.name.toUpperCase()} 密钥`}
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                        disabled={hasKey}
                    />
                    <Button onClick={handleSaveKey} size="sm" disabled={saveButtonText !== '保存'}>
                        {saveButtonText}
                    </Button>
                    {hasKey && (
                        <Button variant="destructive" onClick={handleClearKey} size="sm">
                            撤销
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
