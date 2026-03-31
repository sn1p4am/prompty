import React from 'react'
import { PROVIDER_INFO } from '../constants/providers'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Label } from "./ui/label"
import { Key, Unlock } from "lucide-react"

function buildFieldValueMap(provider, getProviderExtraFields, getProviderFieldValue) {
    const fields = getProviderExtraFields(provider)

    return fields.reduce((values, field) => {
        values[field.id] = getProviderFieldValue(provider, field.id)
        return values
    }, {})
}

export function ApiKeyManager({ apiConfig, onToast }) {
    const {
        currentProvider,
        getApiKey,
        saveApiKey,
        clearApiKey,
        switchProvider,
        getProviderExtraFields,
        getProviderFieldValue,
        saveProviderFieldValue,
        clearProviderFieldValues,
    } = apiConfig

    const [localKey, setLocalKey] = React.useState(getApiKey())
    const [draftKey, setDraftKey] = React.useState('')
    const [localFieldValues, setLocalFieldValues] = React.useState(() =>
        buildFieldValueMap(currentProvider, getProviderExtraFields, getProviderFieldValue)
    )
    const [draftFieldValues, setDraftFieldValues] = React.useState(() =>
        buildFieldValueMap(currentProvider, getProviderExtraFields, getProviderFieldValue)
    )
    const [saveButtonText, setSaveButtonText] = React.useState('保存')

    const providerInfo = PROVIDER_INFO[currentProvider]
    const extraFields = getProviderExtraFields(currentProvider)
    const hasKey = !!localKey

    React.useEffect(() => {
        const nextFieldValues = buildFieldValueMap(currentProvider, getProviderExtraFields, getProviderFieldValue)
        setLocalKey(getApiKey())
        setDraftKey('')
        setLocalFieldValues(nextFieldValues)
        setDraftFieldValues(nextFieldValues)
    }, [currentProvider, getApiKey, getProviderExtraFields, getProviderFieldValue])

    const handleSaveKey = () => {
        const normalizedKey = draftKey.trim()
        if (!normalizedKey) {
            onToast('请先填写访问凭证')
            return
        }

        const nextFieldValues = {}
        for (const field of extraFields) {
            const rawValue = draftFieldValues[field.id]
            const normalizedValue = rawValue?.trim?.() || field.defaultValue || ''

            if (field.required && !normalizedValue) {
                onToast(`请填写 ${field.label}`)
                return
            }

            if (normalizedValue) {
                saveProviderFieldValue(currentProvider, field.id, normalizedValue)
            }

            nextFieldValues[field.id] = normalizedValue
        }

        saveApiKey(currentProvider, normalizedKey)
        setLocalKey(normalizedKey)
        setLocalFieldValues(nextFieldValues)
        setDraftFieldValues(nextFieldValues)
        setDraftKey('')

        onToast('密钥已保存')
        setSaveButtonText('已保存!')
        setTimeout(() => setSaveButtonText('保存'), 2000)
    }

    const handleClearKey = () => {
        if (!confirm('确认撤销访问密钥?')) {
            return
        }

        clearApiKey(currentProvider)
        clearProviderFieldValues(currentProvider)

        const clearedFieldValues = extraFields.reduce((values, field) => {
            values[field.id] = field.defaultValue || ''
            return values
        }, {})

        setLocalKey('')
        setDraftKey('')
        setLocalFieldValues(clearedFieldValues)
        setDraftFieldValues(clearedFieldValues)
        onToast('密钥已撤销')
    }

    return (
        <div className="flex items-end gap-6 border-b border-border pb-4 w-full">
            <div className="w-[200px]">
                <Label>供应商网络</Label>
                <Select
                    value={currentProvider}
                    onChange={(e) => {
                        switchProvider(e.target.value)
                    }}
                >
                    {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <option key={key} value={key}>
                            {info.name}
                        </option>
                    ))}
                </Select>
            </div>

            {extraFields.map(field => {
                const fieldValue = hasKey
                    ? (localFieldValues[field.id] || '')
                    : (draftFieldValues[field.id] ?? field.defaultValue ?? '')

                return (
                    <div key={field.id} className="w-[200px] flex flex-col justify-end">
                        <Label className="flex justify-between w-full">
                            <span>{field.label}</span>
                            {localFieldValues[field.id] ? (
                                <span className="text-xs text-primary font-bold">已配置</span>
                            ) : (
                                <span className="text-xs text-destructive">未配置</span>
                            )}
                        </Label>
                        <Input
                            type="text"
                            value={fieldValue}
                            placeholder={field.placeholder}
                            disabled={hasKey}
                            onChange={(e) => {
                                setDraftFieldValues(prev => ({
                                    ...prev,
                                    [field.id]: e.target.value,
                                }))
                            }}
                        />
                    </div>
                )
            })}

            <div className="flex-1 flex flex-col justify-end">
                <Label className="flex justify-between w-full">
                    <span>{providerInfo?.credentialLabel || '访问令牌 (ACCESS_TOKEN)'}</span>
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
                        type="password"
                        value={draftKey}
                        placeholder={hasKey ? '****************' : (providerInfo?.credentialPlaceholder || `输入 ${providerInfo?.name?.toUpperCase()} 密钥`)}
                        className="flex-1"
                        onChange={(e) => setDraftKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                        disabled={hasKey}
                    />
                    <Button onClick={handleSaveKey} size="sm" disabled={hasKey || saveButtonText !== '保存'}>
                        {saveButtonText}
                    </Button>
                    {hasKey && (
                        <Button variant="destructive" onClick={handleClearKey} size="sm">
                            撤销
                        </Button>
                    )}
                </div>

                {providerInfo?.credentialHelpText && (
                    <p className="text-[11px] text-muted-foreground mt-2">{providerInfo.credentialHelpText}</p>
                )}
            </div>
        </div>
    )
}
