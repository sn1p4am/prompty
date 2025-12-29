// API 供应商配置
export const PROVIDERS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    GROQ: 'groq',
    DEEPSEEK: 'deepseek',
    OPENROUTER: 'openrouter',
}

// API 供应商信息
export const PROVIDER_INFO = {
    [PROVIDERS.OPENAI]: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-3.5-turbo',
            'o1-preview',
            'o1-mini',
        ],
    },
    [PROVIDERS.ANTHROPIC]: {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        models: [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
        ],
    },
    [PROVIDERS.GOOGLE]: {
        name: 'Google',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        models: [
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
            'gemini-2.0-flash-thinking-exp-1219',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
        ],
    },
    [PROVIDERS.GROQ]: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        models: [
            'llama-3.3-70b-versatile',
            'llama-3.1-70b-versatile',
            'mixtral-8x7b-32768',
        ],
    },
    [PROVIDERS.DEEPSEEK]: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        models: [
            'deepseek-chat',
            'deepseek-reasoner',
        ],
    },
    [PROVIDERS.OPENROUTER]: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: [
            'openai/gpt-4o',
            'anthropic/claude-3.5-sonnet',
            'google/gemini-2.0-flash-exp:free',
        ],
    },
}

// 默认配置
export const DEFAULT_CONFIG = {
    provider: PROVIDERS.OPENROUTER, // 默认使用 OpenRouter
    temperature: 0.7,
    topP: 1,
    maxTokens: '', // 默认不限制
    concurrency: 3,
    interval: 500,
}

// LocalStorage 键名
export const STORAGE_KEYS = {
    API_KEYS: 'api_keys',
    CUSTOM_MODELS: 'custom_models',
    MAX_TOKENS: 'max_tokens',
    DISPLAY_MODE: 'display_mode',
    CURRENT_PROVIDER: 'current_provider',
}

// 显示模式
export const DISPLAY_MODES = {
    CARD: 'card',
    HTML_PREVIEW: 'html-preview',
}
