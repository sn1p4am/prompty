export const IMAGE_GENERATION_PROVIDERS = {
    FAL: 'fal',
}

export const IMAGE_GENERATION_PROVIDER_INFO = {
    [IMAGE_GENERATION_PROVIDERS.FAL]: {
        name: 'fal.ai',
        baseUrl: 'https://fal.run',
        keyLabel: 'FAL_KEY',
        keyStorageKey: 'fal_image_generation_api_key',
        defaultModel: 'fal-ai/flux-1/schnell',
        models: [
            'fal-ai/flux-1/schnell',
        ],
    },
}

export const IMAGE_GENERATION_SETTINGS_VERSION = 2

export const FAL_IMAGE_SIZE_PRESETS = [
    { value: 'square_hd', label: 'square_hd - 1024x1024', width: 1024, height: 1024 },
    { value: 'square', label: 'square - 512x512', width: 512, height: 512 },
    { value: 'portrait_4_3', label: 'portrait_4_3 - 768x1024', width: 768, height: 1024 },
    { value: 'portrait_16_9', label: 'portrait_16_9 - 576x1024', width: 576, height: 1024 },
    { value: 'landscape_4_3', label: 'landscape_4_3 - 1024x768', width: 1024, height: 768 },
    { value: 'landscape_16_9', label: 'landscape_16_9 - 1024x576', width: 1024, height: 576 },
]

export const DEFAULT_IMAGE_GENERATION_SETTINGS = {
    settingsVersion: IMAGE_GENERATION_SETTINGS_VERSION,
    provider: IMAGE_GENERATION_PROVIDERS.FAL,
    model: IMAGE_GENERATION_PROVIDER_INFO[IMAGE_GENERATION_PROVIDERS.FAL].defaultModel,
    prompt: '',
    batchCount: 1,
    concurrency: 1,
    interval: 400,
    numInferenceSteps: 4,
    imageSizePreset: 'landscape_4_3',
    customWidth: 1024,
    customHeight: 768,
    seed: '',
    guidanceScale: 3.5,
    syncMode: false,
    numImages: 1,
    enableSafetyChecker: true,
    outputFormat: 'jpeg',
    acceleration: 'regular',
}

export const IMAGE_GENERATION_STORAGE_KEYS = {
    SETTINGS: 'image_generation_settings',
    API_KEYS: 'image_generation_api_keys',
}
