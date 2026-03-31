import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { PROVIDERS, PROVIDER_INFO, STORAGE_KEYS, DEFAULT_CONFIG } from '../constants/providers'

function normalizeVertexModelId(model = '') {
    const normalizedModel = String(model).trim()

    if (!normalizedModel) {
        return ''
    }

    return normalizedModel
        .replace(/^publishers\/google\/models\//, '')
        .replace(/^models\//, '')
        .replace(/^google\//, '')
}

/**
 * 自定义 Hook：管理 API 配置（API Keys、供应商切换、自定义模型）
 */
export function useApiConfig() {
    // 当前选中的供应商
    const [currentProvider, setCurrentProvider] = useLocalStorage(
        STORAGE_KEYS.CURRENT_PROVIDER,
        DEFAULT_CONFIG.provider
    )

    // 自定义模型（格式：{provider: 'xxx', model: 'xxx'}[]）
    const [customModels, setCustomModels] = useLocalStorage(STORAGE_KEYS.CUSTOM_MODELS, [])

    // 获取指定供应商的 API Key（使用供应商专属的 key）
    const getApiKey = useCallback((provider = currentProvider) => {
        const keyName = PROVIDER_INFO[provider]?.keyStorageKey
        if (!keyName) return ''
        return localStorage.getItem(keyName) || ''
    }, [currentProvider])

    // 保存 API Key
    const saveApiKey = useCallback((provider, key) => {
        const keyName = PROVIDER_INFO[provider]?.keyStorageKey
        if (keyName) {
            localStorage.setItem(keyName, key)
        }
    }, [])

    // 清除 API Key
    const clearApiKey = useCallback((provider) => {
        const keyName = PROVIDER_INFO[provider]?.keyStorageKey
        if (keyName) {
            localStorage.removeItem(keyName)
        }
    }, [])

    // 获取 provider 额外配置字段定义
    const getProviderExtraFields = useCallback((provider = currentProvider) => {
        return PROVIDER_INFO[provider]?.extraConfigFields || []
    }, [currentProvider])

    // 读取 provider 额外配置字段
    const getProviderFieldValue = useCallback((provider = currentProvider, fieldId) => {
        const field = PROVIDER_INFO[provider]?.extraConfigFields?.find(item => item.id === fieldId)
        if (!field?.storageKey) return ''

        return localStorage.getItem(field.storageKey) || field.defaultValue || ''
    }, [currentProvider])

    // 保存 provider 额外配置字段
    const saveProviderFieldValue = useCallback((provider, fieldId, value) => {
        const field = PROVIDER_INFO[provider]?.extraConfigFields?.find(item => item.id === fieldId)
        if (!field?.storageKey) return

        const normalizedValue = value?.trim?.() ?? value
        const fallbackValue = normalizedValue || field.defaultValue || ''

        if (fallbackValue) {
            localStorage.setItem(field.storageKey, fallbackValue)
            return
        }

        localStorage.removeItem(field.storageKey)
    }, [])

    // 清除 provider 额外配置字段
    const clearProviderFieldValues = useCallback((provider) => {
        const fields = PROVIDER_INFO[provider]?.extraConfigFields || []
        fields.forEach(field => {
            if (field.storageKey) {
                localStorage.removeItem(field.storageKey)
            }
        })
    }, [])

    const getMissingProviderFields = useCallback((provider = currentProvider) => {
        const fields = PROVIDER_INFO[provider]?.extraConfigFields || []
        return fields
            .filter(field => field.required && !getProviderFieldValue(provider, field.id))
            .map(field => field.label)
    }, [currentProvider, getProviderFieldValue])

    // 切换供应商
    const switchProvider = useCallback((provider) => {
        setCurrentProvider(provider)
    }, [setCurrentProvider])

    // 获取当前供应商的模型列表
    const getModels = useCallback((provider = currentProvider) => {
        const builtInModels = PROVIDER_INFO[provider]?.models || []
        const userModels = customModels
            .filter(m => m.provider === provider)
            .map(m => m.model)

        if (provider === PROVIDERS.VERTEX) {
            const normalizedModels = [...builtInModels, ...userModels]
                .map(model => normalizeVertexModelId(model))
                .filter(Boolean)

            return [...new Set(normalizedModels)]
        }

        return [...builtInModels, ...userModels]
    }, [currentProvider, customModels])

    // 添加自定义模型
    const addCustomModel = useCallback((provider, modelName) => {
        const normalizedModelName = provider === PROVIDERS.VERTEX
            ? normalizeVertexModelId(modelName)
            : modelName

        if (!normalizedModelName) return false

        // 检查是否已存在
        const exists = customModels.some(m =>
            m.provider === provider &&
            (provider === PROVIDERS.VERTEX
                ? normalizeVertexModelId(m.model) === normalizedModelName
                : m.model === normalizedModelName)
        )
        if (exists) return false

        setCustomModels(prev => [...prev, { provider, model: normalizedModelName }])
        return true
    }, [customModels, setCustomModels])

    // 获取 Base URL（Cloudsway / Vertex 需要拼接额外配置）
    const getBaseUrl = useCallback((provider = currentProvider) => {
        const baseUrl = PROVIDER_INFO[provider]?.baseUrl || ''
        if (provider === PROVIDERS.CLOUDSWAY) {
            const appId = getProviderFieldValue(provider, 'appId')
            return appId ? `${baseUrl}/${appId}` : ''
        }
        return baseUrl
    }, [currentProvider, getProviderFieldValue])

    // 获取供应商信息
    const getProviderInfo = useCallback((provider = currentProvider) => {
        return PROVIDER_INFO[provider] || null
    }, [currentProvider])

    return {
        // 状态
        currentProvider,
        customModels,

        // API Key 相关
        getApiKey,
        saveApiKey,
        clearApiKey,

        // Provider 额外配置
        getProviderExtraFields,
        getProviderFieldValue,
        saveProviderFieldValue,
        clearProviderFieldValues,
        getMissingProviderFields,

        // 供应商相关
        switchProvider,
        getBaseUrl,
        getProviderInfo,

        // 模型相关
        getModels,
        addCustomModel,
    }
}
