import { useState, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { PROVIDERS, PROVIDER_INFO, STORAGE_KEYS, DEFAULT_CONFIG } from '../constants/providers'

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
        return [...builtInModels, ...userModels]
    }, [currentProvider, customModels])

    // 添加自定义模型
    const addCustomModel = useCallback((provider, modelName) => {
        // 检查是否已存在
        const exists = customModels.some(m => m.provider === provider && m.model === modelName)
        if (exists) return false

        setCustomModels(prev => [...prev, { provider, model: modelName }])
        return true
    }, [customModels, setCustomModels])

    // 获取 Base URL
    const getBaseUrl = useCallback((provider = currentProvider) => {
        return PROVIDER_INFO[provider]?.baseUrl || ''
    }, [currentProvider])

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

        // 供应商相关
        switchProvider,
        getBaseUrl,
        getProviderInfo,

        // 模型相关
        getModels,
        addCustomModel,
    }
}
