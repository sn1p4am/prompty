// API 供应商配置 - 匹配原版 old-index.html
export const PROVIDERS = {
    OPENROUTER: 'openrouter',
    VERTEX: 'vertex',
    VOLCENGINE: 'volcengine',
    ALIBAILIAN: 'alibailian',
    CLOUDSWAY: 'cloudsway',
    AIIONLY: 'aiionly',
    AIONLY: 'aionly',
    MOXIN: 'moxin',
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
    [PROVIDERS.VERTEX]: {
        name: 'Vertex AI',
        baseUrl: 'https://aiplatform.googleapis.com/v1',
        keyStorageKey: 'vertex_api_key',
        getKeyUrl: 'https://console.cloud.google.com/apis/credentials',
        credentialLabel: 'API Key',
        credentialPlaceholder: '输入 Google Cloud API Key',
        credentialHelpText: '仅支持 Vertex AI Express Mode(API key)',
        models: [
            'gemini-3-pro-preview',
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.5-flash-lite'
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
    [PROVIDERS.CLOUDSWAY]: {
        name: 'Cloudsway',
        baseUrl: 'https://genaiapi.cloudsway.net/v1/ai',
        keyStorageKey: 'cloudsway_api_key',
        appIdStorageKey: 'cloudsway_app_id',
        getKeyUrl: 'https://cloudsway.net',
        extraConfigFields: [
            {
                id: 'appId',
                label: 'App ID',
                storageKey: 'cloudsway_app_id',
                placeholder: '输入 App ID',
                required: true,
            }
        ],
        models: [
            'MaaS_Ge_3_flash_preview_20251217'
        ],
    },
    [PROVIDERS.AIIONLY]: {
        name: 'AiIIOnly',
        baseUrl: 'https://api.aiionly.com/v1',
        keyStorageKey: 'aiionly_api_key',
        getKeyUrl: 'https://api.aiionly.com',
        models: [
            'qwen-vl-max'
        ],
    },
    [PROVIDERS.AIONLY]: {
        name: 'AiOnly',
        baseUrl: 'https://api.aionly.com/v1',
        keyStorageKey: 'aionly_api_key',
        getKeyUrl: 'https://api.aionly.com',
        models: [
            'qwen-vl-max'
        ],
    },
    [PROVIDERS.MOXIN]: {
        name: 'Moxin',
        baseUrl: 'https://www.moxin.studio/v1',
        keyStorageKey: 'moxin_api_key',
        getKeyUrl: 'https://www.moxin.studio/',
        models: [],
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
    enableThinking: false, // 深度思考模式（阿里/火山/Vertex 原生支持，AiOnly/AiIIOnly 按兼容协议尝试）
}

export const DEFAULT_VERTEX_OPTIONS = {
    thinkingLevel: '',
    thinkingBudget: '',
    responseMimeType: '',
    responseSchemaJson: '',
}

// LocalStorage 键名
export const STORAGE_KEYS = {
    CUSTOM_MODELS: 'customModels',
    MAX_TOKENS: 'max_tokens',
    DISPLAY_MODE: 'display_mode',
    CURRENT_PROVIDER: 'current_provider',
    LAST_SELECTED_MODEL: 'last_selected_model',
    ENABLE_THINKING: 'enable_thinking',
    MODAL_DEFAULT_VIEW_MODE: 'modal_default_view_mode', // 弹窗默认视图模式
    VERTEX_OPTIONS: 'vertex_options',
}

// 显示模式
export const DISPLAY_MODES = {
    CARD: 'card',
    HTML: 'html',
}
