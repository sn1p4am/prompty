export const IMAGE_GENERATION_PROVIDERS = {
    FAL: 'fal',
}

export const IMAGE_GENERATION_PROVIDER_INFO = {
    [IMAGE_GENERATION_PROVIDERS.FAL]: {
        name: 'fal.ai',
        baseUrl: 'https://fal.run',
        keyLabel: 'FAL_KEY',
        defaultModel: 'fal-ai/flux-1/schnell',
        models: [
            'fal-ai/flux-1/schnell',
        ],
    },
}

export const FAL_IMAGE_SIZE_PRESETS = [
    'square_hd',
    'square',
    'portrait_4_3',
    'portrait_16_9',
    'landscape_4_3',
    'landscape_16_9',
]

export const DEFAULT_IMAGE_GENERATION_SETTINGS = {
    provider: IMAGE_GENERATION_PROVIDERS.FAL,
    model: IMAGE_GENERATION_PROVIDER_INFO[IMAGE_GENERATION_PROVIDERS.FAL].defaultModel,
    prompt: '',
    batchCount: 2,
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
}
