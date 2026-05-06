import { IMAGE_GENERATION_PROVIDERS, IMAGE_GENERATION_PROVIDER_INFO } from '../constants/imageGeneration'

function parseNumber(value, label, { min, max, integer = false } = {}) {
    if (value === '' || value === null || value === undefined) {
        return null
    }

    const parsedValue = integer ? parseInt(value, 10) : Number(value)

    if (Number.isNaN(parsedValue)) {
        throw new Error(`${label} 必须是数字`)
    }

    if (integer && !Number.isInteger(parsedValue)) {
        throw new Error(`${label} 必须是整数`)
    }

    if (min !== undefined && parsedValue < min) {
        throw new Error(`${label} 不能小于 ${min}`)
    }

    if (max !== undefined && parsedValue > max) {
        throw new Error(`${label} 不能大于 ${max}`)
    }

    return parsedValue
}

function normalizeFalModelPath(model) {
    return String(model || '')
        .trim()
        .replace(/^https:\/\/fal\.run\//, '')
        .replace(/^\/+/, '')
}

export function buildFalImageGenerationPayload(settings) {
    const prompt = String(settings.prompt || '').trim()

    if (!prompt) {
        throw new Error('请填写图像提示词')
    }

    const numInferenceSteps = parseNumber(settings.numInferenceSteps, '推理步数', {
        min: 1,
        max: 12,
        integer: true,
    })
    const guidanceScale = parseNumber(settings.guidanceScale, 'Guidance Scale', {
        min: 1,
        max: 20,
    })
    const numImages = parseNumber(settings.numImages, '单次出图数量', {
        min: 1,
        max: 4,
        integer: true,
    })
    const seed = parseNumber(settings.seed, 'Seed', {
        integer: true,
    })

    let imageSize = settings.imageSizePreset || 'landscape_4_3'
    if (imageSize === 'custom') {
        const width = parseNumber(settings.customWidth, '自定义宽度', {
            min: 64,
            max: 4096,
            integer: true,
        })
        const height = parseNumber(settings.customHeight, '自定义高度', {
            min: 64,
            max: 4096,
            integer: true,
        })
        imageSize = { width, height }
    }

    return {
        prompt,
        ...(numInferenceSteps !== null && { num_inference_steps: numInferenceSteps }),
        image_size: imageSize,
        ...(seed !== null && { seed }),
        ...(guidanceScale !== null && { guidance_scale: guidanceScale }),
        sync_mode: Boolean(settings.syncMode),
        ...(numImages !== null && { num_images: numImages }),
        enable_safety_checker: Boolean(settings.enableSafetyChecker),
        output_format: settings.outputFormat || 'jpeg',
        acceleration: settings.acceleration || 'regular',
    }
}

export function normalizeImageGenerationError(response, errorText) {
    let message = `HTTP ${response.status}`

    try {
        const data = JSON.parse(errorText)
        message = data.error?.message || data.detail || data.message || data.error || message

        if (Array.isArray(data.detail)) {
            message = data.detail
                .map(item => item.msg || item.message || JSON.stringify(item))
                .join('; ')
        }
    } catch {
        message = errorText || response.statusText || message
    }

    if (response.status === 401 || response.status === 403) {
        return 'fal.ai API Key 无效或无权访问该模型'
    }

    if (response.status === 429) {
        return '请求频率过高，请降低并发或稍后重试'
    }

    if (response.status === 402) {
        return '账户余额不足'
    }

    return message
}

async function generateFalImage({ apiKey, model, settings, signal }) {
    const modelPath = normalizeFalModelPath(model)
    if (!modelPath) {
        throw new Error('请填写 fal.ai 模型 ID')
    }

    const requestStartTime = Date.now()
    const response = await fetch(`${IMAGE_GENERATION_PROVIDER_INFO[IMAGE_GENERATION_PROVIDERS.FAL].baseUrl}/${modelPath}`, {
        method: 'POST',
        headers: {
            Authorization: `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildFalImageGenerationPayload(settings)),
        signal,
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(normalizeImageGenerationError(response, errorText))
    }

    const data = await response.json()
    const images = Array.isArray(data.images) ? data.images : []

    return {
        provider: IMAGE_GENERATION_PROVIDERS.FAL,
        model: modelPath,
        prompt: data.prompt || settings.prompt,
        seed: data.seed,
        images: images.map((image, index) => ({
            id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
            url: image.url || image.content || '',
            contentType: image.content_type || image.contentType || '',
            width: image.width,
            height: image.height,
            fileName: image.file_name || image.fileName || '',
        })).filter(image => image.url),
        hasNsfwConcepts: data.has_nsfw_concepts || [],
        timings: data.timings || null,
        requestId: data.request_id || data.requestId || null,
        duration: Date.now() - requestStartTime,
        raw: data,
    }
}

export async function generateImage(params) {
    const { provider, apiKey } = params

    if (!apiKey?.trim()) {
        throw new Error('请填写 API Key')
    }

    if (provider === IMAGE_GENERATION_PROVIDERS.FAL) {
        return generateFalImage(params)
    }

    throw new Error('暂未支持该图像生成供应商')
}
