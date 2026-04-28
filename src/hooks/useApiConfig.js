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

function normalizeModelConfig(modelConfig) {
    if (typeof modelConfig === 'string') {
        return { model: modelConfig }
    }

    if (!modelConfig || typeof modelConfig !== 'object') {
        return { model: '' }
    }

    return {
        ...modelConfig,
        model: String(modelConfig.model || '').trim(),
        ...(modelConfig.appId !== undefined && { appId: String(modelConfig.appId || '').trim() }),
    }
}

function normalizeModelNameForProvider(provider, model = '') {
    return provider === PROVIDERS.VERTEX
        ? normalizeVertexModelId(model)
        : String(model).trim()
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

    // 自定义模型（格式：{ provider: 'xxx', model: 'xxx', appId?: 'xxx' }[]）
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

    // 切换供应商
    const switchProvider = useCallback((provider) => {
        setCurrentProvider(provider)
    }, [setCurrentProvider])

    // 获取当前供应商的模型列表
    const getModels = useCallback((provider = currentProvider) => {
        const builtInModels = (PROVIDER_INFO[provider]?.models || [])
            .map(modelConfig => normalizeModelConfig(modelConfig).model)
            .filter(Boolean)
        const userModels = customModels
            .filter(m => m.provider === provider)
            .map(m => normalizeModelConfig(m).model)
            .filter(Boolean)

        if (provider === PROVIDERS.VERTEX) {
            const normalizedModels = [...builtInModels, ...userModels]
                .map(model => normalizeVertexModelId(model))
                .filter(Boolean)

            return [...new Set(normalizedModels)]
        }

        return [...new Set([...builtInModels, ...userModels])]
    }, [currentProvider, customModels])

    const getModelConfig = useCallback((provider = currentProvider, modelName = '') => {
        const normalizedModelName = normalizeModelNameForProvider(provider, modelName)
        if (!normalizedModelName) {
            return null
        }

        const builtInModelConfig = (PROVIDER_INFO[provider]?.models || [])
            .map(normalizeModelConfig)
            .find(modelConfig => normalizeModelNameForProvider(provider, modelConfig.model) === normalizedModelName)

        const customModelConfig = customModels
            .filter(modelConfig => modelConfig.provider === provider)
            .map(normalizeModelConfig)
            .find(modelConfig => normalizeModelNameForProvider(provider, modelConfig.model) === normalizedModelName)

        return {
            ...(builtInModelConfig || {}),
            ...(customModelConfig || {}),
            provider,
            model: normalizedModelName,
        }
    }, [currentProvider, customModels])

    const getModelAppId = useCallback((provider = currentProvider, modelName = '') => {
        if (provider !== PROVIDERS.CLOUDSWAY) {
            return ''
        }

        return getModelConfig(provider, modelName)?.appId || ''
    }, [currentProvider, getModelConfig])

    const saveModelAppId = useCallback((provider, modelName, appId) => {
        if (provider !== PROVIDERS.CLOUDSWAY) {
            return false
        }

        const normalizedModelName = normalizeModelNameForProvider(provider, modelName)
        if (!normalizedModelName) {
            return false
        }

        const normalizedAppId = String(appId || '').trim()

        setCustomModels(prev => {
            let found = false
            const nextModels = prev.map(modelConfig => {
                const normalizedModelConfig = normalizeModelConfig(modelConfig)
                const isTargetModel = modelConfig.provider === provider &&
                    normalizeModelNameForProvider(provider, normalizedModelConfig.model) === normalizedModelName

                if (!isTargetModel) {
                    return modelConfig
                }

                found = true
                return {
                    ...modelConfig,
                    provider,
                    model: normalizedModelName,
                    appId: normalizedAppId,
                }
            })

            if (found) {
                return nextModels
            }

            return [
                ...nextModels,
                {
                    provider,
                    model: normalizedModelName,
                    appId: normalizedAppId,
                }
            ]
        })

        return true
    }, [setCustomModels])

    // 添加自定义模型
    const addCustomModel = useCallback((provider, modelName, metadata = {}) => {
        const normalizedModelName = normalizeModelNameForProvider(provider, modelName)

        if (!normalizedModelName) return false

        if (provider === PROVIDERS.CLOUDSWAY) {
            const appId = String(metadata.appId || '').trim()
            if (!appId) return false

            saveModelAppId(provider, normalizedModelName, appId)
            return true
        }

        // 检查是否已存在
        const exists = customModels.some(m =>
            m.provider === provider &&
            (provider === PROVIDERS.VERTEX
                ? normalizeVertexModelId(normalizeModelConfig(m).model) === normalizedModelName
                : normalizeModelConfig(m).model === normalizedModelName)
        )
        if (exists) return false

        setCustomModels(prev => [...prev, { provider, model: normalizedModelName }])
        return true
    }, [customModels, saveModelAppId, setCustomModels])

    const getMissingProviderFields = useCallback((provider = currentProvider, modelName = '') => {
        const fields = PROVIDER_INFO[provider]?.extraConfigFields || []
        const missingFields = fields
            .filter(field => field.required && !getProviderFieldValue(provider, field.id))
            .map(field => field.label)

        if (provider === PROVIDERS.CLOUDSWAY && modelName && !getModelAppId(provider, modelName)) {
            missingFields.push(`App ID（${modelName}）`)
        }

        return missingFields
    }, [currentProvider, getModelAppId, getProviderFieldValue])

    // 获取 Base URL（Cloudsway 需要按模型拼接 App ID）
    const getBaseUrl = useCallback((provider = currentProvider, modelName = '') => {
        const baseUrl = PROVIDER_INFO[provider]?.baseUrl || ''
        if (provider === PROVIDERS.CLOUDSWAY) {
            const appId = getModelAppId(provider, modelName)
            return appId ? `${baseUrl}/${appId}` : ''
        }
        return baseUrl
    }, [currentProvider, getModelAppId])

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
        getModelConfig,
        getModelAppId,
        saveModelAppId,
        addCustomModel,
    }
}
