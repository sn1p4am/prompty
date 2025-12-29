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
            'anthropic/claude-sonnet-4-20250514',
            'qwen/qwq-32b-preview',
            'deepseek/deepseek-chat',
            'openai/gpt-4o',
            'google/gemini-2.0-flash-exp:free',
            'meta-llama/llama-3.3-70b-instruct',
            'mistralai/mistral-large'
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
}

// LocalStorage 键名
export const STORAGE_KEYS = {
    CUSTOM_MODELS: 'customModels',
    MAX_TOKENS: 'max_tokens',
    DISPLAY_MODE: 'display_mode',
    CURRENT_PROVIDER: 'current_provider',
    LAST_SELECTED_MODEL: 'last_selected_model',
}

// 显示模式
export const DISPLAY_MODES = {
    CARD: 'card',
    HTML: 'html',
}
