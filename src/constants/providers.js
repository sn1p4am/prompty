// API 供应商配置 - 匹配原版 old-index.html
export const PROVIDERS = {
    OPENROUTER: 'openrouter',
    VOLCENGINE: 'volcengine',
    ALIBAILIAN: 'alibailian',
}

// API 供应商信息
export const PROVIDER_INFO = {
    [PROVIDERS.OPENROUTER]: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        keyStorageKey: 'openrouter_api_key',
        getKeyUrl: 'https://openrouter.ai/keys',
        models: [
            'google/gemini-3-flash-preview',
            'google/gemini-3-pro-preview',
            'anthropic/claude-sonnet-4.5'
        ],
    },
    [PROVIDERS.VOLCENGINE]: {
        name: '火山引擎',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        keyStorageKey: 'volcengine_api_key',
        getKeyUrl: 'https://console.volcengine.com/ark',
        models: [
            'deepseek-r1-250528'
        ],
    },
    [PROVIDERS.ALIBAILIAN]: {
        name: '阿里百炼',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        keyStorageKey: 'alibailian_api_key',
        getKeyUrl: 'https://bailian.console.aliyun.com',
        models: [
            'deepseek-r1-0528'
        ],
    },
}

// 默认配置
export const DEFAULT_CONFIG = {
    provider: PROVIDERS.OPENROUTER,
    temperature: 1, // 原版默认值
    topP: 1,
    maxTokens: '',
    batchSize: 5,
    concurrency: 3,
    interval: 500,
    streamMode: true,
    enableThinking: false, // 深度思考模式（仅阿里百炼和火山方舟支持）
}

// LocalStorage 键名
export const STORAGE_KEYS = {
    CUSTOM_MODELS: 'customModels',
    MAX_TOKENS: 'max_tokens',
    DISPLAY_MODE: 'display_mode',
    CURRENT_PROVIDER: 'current_provider',
    LAST_SELECTED_MODEL: 'last_selected_model',
    ENABLE_THINKING: 'enable_thinking',
}

// 显示模式
export const DISPLAY_MODES = {
    CARD: 'card',
    HTML: 'html',
}
