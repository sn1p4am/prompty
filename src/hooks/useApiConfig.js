import { useState, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { PROVIDERS, PROVIDER_INFO, STORAGE_KEYS, DEFAULT_CONFIG } from '../constants/providers'

/**
 * 自定义 Hook：管理 API 配置（API Keys、供应商切换、自定义模型）
 */
export function useApiConfig() {
    // API Keys 存储（多供应商）
    const [apiKeys, setApiKeys] = useLocalStorage(STORAGE_KEYS.API_KEYS, {})

    // 当前选中的供应商
    const [currentProvider, setCurrentProvider] = useLocalStorage(
        STORAGE_KEYS.CURRENT_PROVIDER,
        DEFAULT_CONFIG.provider // 从配置读取默认值
    )

    // 自定义模型
    const [customModels, setCustomModels] = useLocalStorage(STORAGE_KEYS.CUSTOM_MODELS, {})

    // 获取指定供应商的 API Key
    const getApiKey = useCallback((provider = currentProvider) => {
        return apiKeys[provider] || ''
    }, [apiKeys, currentProvider])

    // 保存 API Key
    const saveApiKey = useCallback((provider, key) => {
        setApiKeys(prev => ({
            ...prev,
            [provider]: key,
        }))
    }, [setApiKeys])

    // 清除 API Key
    const clearApiKey = useCallback((provider) => {
        setApiKeys(prev => {
            const newKeys = { ...prev }
            delete newKeys[provider]
            return newKeys
        })
    }, [setApiKeys])

    // 切换供应商
    const switchProvider = useCallback((provider) => {
        setCurrentProvider(provider)
    }, [setCurrentProvider])

    // 获取当前供应商的模型列表
    const getModels = useCallback((provider = currentProvider) => {
        const builtInModels = PROVIDER_INFO[provider]?.models || []
        const userModels = customModels[provider] || []
        return [...builtInModels, ...userModels]
    }, [currentProvider, customModels])

    // 添加自定义模型
    const addCustomModel = useCallback((provider, modelName) => {
        setCustomModels(prev => {
            const providerModels = prev[provider] || []
            if (providerModels.includes(modelName)) {
                return prev // 已存在，不重复添加
            }
            return {
                ...prev,
                [provider]: [...providerModels, modelName],
            }
        })
    }, [setCustomModels])

    // 获取 Base URL
    const getBaseUrl = useCallback((provider = currentProvider) => {
        return PROVIDER_INFO[provider]?.baseUrl || ''
    }, [currentProvider])

    return {
        // 状态
        currentProvider,
        apiKeys,
        customModels,

        // API Key 相关
        getApiKey,
        saveApiKey,
        clearApiKey,

        // 供应商相关
        switchProvider,
        getBaseUrl,

        // 模型相关
        getModels,
        addCustomModel,
    }
}
