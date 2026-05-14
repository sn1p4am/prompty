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

function normalizeTogetherModel(model) {
    return String(model || '').trim()
}

function normalizeOpenAIModel(model) {
    return String(model || '').trim()
}

function buildOpenAINetworkError(error, requestUrl) {
    const origin = globalThis.location?.origin
    const originHint = origin ? `当前页面来源：${origin}。` : ''
    const originalMessage = error?.message || 'Failed to fetch'

    return new Error(
        `OpenAI 图像请求无法从浏览器直连 ${requestUrl}。${originHint}` +
        '如果控制台提示 CORS 或 preflight，说明目标服务没有返回 Access-Control-Allow-Origin；' +
        '请在目标服务开启 CORS，或通过同源后端/边缘代理转发固定 llmapi 请求。' +
        `原始错误：${originalMessage}`
    )
}

function now() {
    return globalThis.performance?.now ? globalThis.performance.now() : Date.now()
}

function roundDuration(duration) {
    return Math.max(0, Math.round(duration))
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

export function buildTogetherImageGenerationPayload(settings, model) {
    const prompt = String(settings.prompt || '').trim()
    const normalizedModel = normalizeTogetherModel(model || settings.model)

    if (!prompt) {
        throw new Error('请填写图像提示词')
    }

    if (!normalizedModel) {
        throw new Error('请填写 Together.ai 模型 ID')
    }

    const steps = parseNumber(settings.togetherSteps, 'Steps', {
        min: 1,
        max: 50,
        integer: true,
    })
    const numImages = parseNumber(settings.togetherNumImages, '单次出图数量', {
        min: 1,
        max: 4,
        integer: true,
    })
    const seed = parseNumber(settings.togetherSeed, 'Seed', {
        integer: true,
    })
    const guidanceScale = parseNumber(settings.togetherGuidanceScale, 'Guidance Scale', {
        min: 0,
        max: 50,
    })
    const negativePrompt = String(settings.togetherNegativePrompt || '').trim()
    const responseFormat = settings.togetherResponseFormat || 'url'
    const outputFormat = settings.togetherOutputFormat || 'jpeg'
    const sizeMode = settings.togetherSizeMode || 'default'

    const payload = {
        model: normalizedModel,
        prompt,
        ...(steps !== null && { steps }),
        ...(numImages !== null && { n: numImages }),
        ...(seed !== null && { seed }),
        ...(guidanceScale !== null && { guidance_scale: guidanceScale }),
        ...(negativePrompt && { negative_prompt: negativePrompt }),
        ...(responseFormat && { response_format: responseFormat }),
        ...(outputFormat && { output_format: outputFormat }),
        ...(settings.togetherDisableSafetyChecker && { disable_safety_checker: true }),
    }

    if (sizeMode === 'aspect_ratio') {
        payload.aspect_ratio = settings.togetherAspectRatio || '1:1'
    }

    if (sizeMode === 'dimensions') {
        payload.width = parseNumber(settings.togetherWidth, '宽度', {
            min: 64,
            max: 4096,
            integer: true,
        })
        payload.height = parseNumber(settings.togetherHeight, '高度', {
            min: 64,
            max: 4096,
            integer: true,
        })
    }

    return payload
}

function assertOpenAISizeConstraints(width, height) {
    if (width % 16 !== 0 || height % 16 !== 0) {
        throw new Error('OpenAI 自定义尺寸的宽高必须是 16 的倍数')
    }

    if (Math.max(width, height) > 3840) {
        throw new Error('OpenAI 自定义尺寸的最长边不能超过 3840px')
    }

    const longEdge = Math.max(width, height)
    const shortEdge = Math.min(width, height)
    if (longEdge / shortEdge > 3) {
        throw new Error('OpenAI 自定义尺寸的长短边比例不能超过 3:1')
    }

    const pixels = width * height
    if (pixels < 655360 || pixels > 8294400) {
        throw new Error('OpenAI 自定义尺寸总像素必须在 655360 到 8294400 之间')
    }
}

export function buildOpenAIImageGenerationPayload(settings, model) {
    const prompt = String(settings.prompt || '').trim()
    const normalizedModel = normalizeOpenAIModel(model || settings.model)

    if (!prompt) {
        throw new Error('请填写图像提示词')
    }

    if (!normalizedModel) {
        throw new Error('请填写 OpenAI 模型 ID')
    }

    const numImages = parseNumber(settings.openaiNumImages, '单次出图数量', {
        min: 1,
        max: 10,
        integer: true,
    })
    const outputCompression = parseNumber(settings.openaiOutputCompression, '输出压缩', {
        min: 0,
        max: 100,
        integer: true,
    })
    const partialImages = parseNumber(settings.openaiPartialImages, 'Partial Images', {
        min: 0,
        max: 3,
        integer: true,
    })

    let size = settings.openaiSizePreset || 'auto'
    if (size === 'custom') {
        const width = parseNumber(settings.openaiCustomWidth, 'OpenAI 自定义宽度', {
            min: 16,
            max: 3840,
            integer: true,
        })
        const height = parseNumber(settings.openaiCustomHeight, 'OpenAI 自定义高度', {
            min: 16,
            max: 3840,
            integer: true,
        })
        assertOpenAISizeConstraints(width, height)
        size = `${width}x${height}`
    }

    const outputFormat = settings.openaiOutputFormat || 'png'
    const stream = Boolean(settings.openaiStream)
    const user = String(settings.openaiUser || '').trim()

    return {
        model: normalizedModel,
        prompt,
        ...(numImages !== null && { n: numImages }),
        quality: settings.openaiQuality || 'auto',
        output_format: outputFormat,
        ...((outputFormat === 'jpeg' || outputFormat === 'webp') && outputCompression !== null && {
            output_compression: outputCompression,
        }),
        stream,
        ...(stream && partialImages !== null && { partial_images: partialImages }),
        size,
        moderation: settings.openaiModeration || 'auto',
        background: settings.openaiBackground || 'auto',
        ...(user && { user }),
    }
}

export function normalizeImageGenerationError(response, errorText, provider = IMAGE_GENERATION_PROVIDERS.FAL) {
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

    const providerName = IMAGE_GENERATION_PROVIDER_INFO[provider]?.name || '图像生成服务'

    if (response.status === 401 || response.status === 403) {
        return `${providerName} API Key 无效或无权访问该模型`
    }

    if (response.status === 429) {
        return '请求频率过高，请降低并发或稍后重试'
    }

    if (response.status === 402) {
        return '账户余额不足'
    }

    return message
}

function parseServerSentEvents(text) {
    return String(text || '')
        .split(/\r?\n\r?\n/)
        .flatMap(block => {
            const data = block
                .split(/\r?\n/)
                .filter(line => line.startsWith('data:'))
                .map(line => line.slice(5).trimStart())
                .join('\n')
                .trim()

            if (!data || data === '[DONE]') {
                return []
            }

            try {
                return [JSON.parse(data)]
            } catch {
                return []
            }
        })
}

function buildImageResult({ data, index, fallbackModel, defaultContentType = '' }) {
    const contentType = data.content_type || data.contentType || data.mime_type || data.mimeType || ''
    const b64Json = data.b64_json || data.b64Json || data.base64 || ''
    const url = data.url || data.content || (b64Json
        ? `data:${contentType || defaultContentType || 'image/png'};base64,${b64Json}`
        : '')

    return {
        id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
        url,
        contentType: contentType || fallbackModel,
        width: data.width,
        height: data.height,
        fileName: data.file_name || data.fileName || '',
    }
}

async function generateFalImage({ apiKey, model, settings, signal }) {
    const modelPath = normalizeFalModelPath(model)
    if (!modelPath) {
        throw new Error('请填写 fal.ai 模型 ID')
    }

    const requestStartTime = now()
    const response = await fetch(`${IMAGE_GENERATION_PROVIDER_INFO[IMAGE_GENERATION_PROVIDERS.FAL].baseUrl}/${modelPath}`, {
        method: 'POST',
        headers: {
            Authorization: `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildFalImageGenerationPayload(settings)),
        signal,
    })
    const responseReceivedTime = now()

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(normalizeImageGenerationError(response, errorText, IMAGE_GENERATION_PROVIDERS.FAL))
    }

    const responseText = await response.text()
    const responseBodyReadTime = now()
    const data = JSON.parse(responseText)
    const responseParsedTime = now()
    const images = Array.isArray(data.images) ? data.images : []
    const completedAt = new Date().toISOString()
    const clientTimings = {
        response: roundDuration(responseReceivedTime - requestStartTime),
        download: roundDuration(responseBodyReadTime - responseReceivedTime),
        parse: roundDuration(responseParsedTime - responseBodyReadTime),
        total: roundDuration(responseParsedTime - requestStartTime),
    }

    return {
        provider: IMAGE_GENERATION_PROVIDERS.FAL,
        model: modelPath,
        prompt: data.prompt || settings.prompt,
        seed: data.seed,
        images: images.map((image, index) => buildImageResult({
            data: image,
            index,
            fallbackModel: modelPath,
            defaultContentType: settings.outputFormat === 'png' ? 'image/png' : 'image/jpeg',
        })).filter(image => image.url),
        hasNsfwConcepts: data.has_nsfw_concepts || [],
        timings: data.timings || null,
        clientTimings,
        completedAt,
        requestId: data.request_id || data.requestId || null,
        duration: clientTimings.total,
        raw: data,
    }
}

async function generateTogetherImage({ apiKey, model, settings, signal }) {
    const normalizedModel = normalizeTogetherModel(model)
    if (!normalizedModel) {
        throw new Error('请填写 Together.ai 模型 ID')
    }

    const requestStartTime = now()
    const response = await fetch(`${IMAGE_GENERATION_PROVIDER_INFO[IMAGE_GENERATION_PROVIDERS.TOGETHER].baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildTogetherImageGenerationPayload(settings, normalizedModel)),
        signal,
    })
    const responseReceivedTime = now()

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(normalizeImageGenerationError(response, errorText, IMAGE_GENERATION_PROVIDERS.TOGETHER))
    }

    const responseText = await response.text()
    const responseBodyReadTime = now()
    const data = JSON.parse(responseText)
    const responseParsedTime = now()
    const images = Array.isArray(data.data) ? data.data : []
    const completedAt = new Date().toISOString()
    const clientTimings = {
        response: roundDuration(responseReceivedTime - requestStartTime),
        download: roundDuration(responseBodyReadTime - responseReceivedTime),
        parse: roundDuration(responseParsedTime - responseBodyReadTime),
        total: roundDuration(responseParsedTime - requestStartTime),
    }

    return {
        provider: IMAGE_GENERATION_PROVIDERS.TOGETHER,
        model: data.model || normalizedModel,
        prompt: settings.prompt,
        seed: data.seed ?? settings.togetherSeed ?? null,
        images: images.map((image, index) => buildImageResult({
            data: image,
            index,
            fallbackModel: data.model || normalizedModel,
            defaultContentType: settings.togetherOutputFormat === 'png' ? 'image/png' : 'image/jpeg',
        })).filter(image => image.url),
        hasNsfwConcepts: data.has_nsfw_concepts || [],
        timings: data.timings || null,
        clientTimings,
        completedAt,
        requestId: data.id || data.request_id || data.requestId || null,
        duration: clientTimings.total,
        raw: data,
    }
}

async function generateOpenAIImage({ apiKey, model, settings, signal }) {
    const normalizedModel = normalizeOpenAIModel(model)
    if (!normalizedModel) {
        throw new Error('请填写 OpenAI 模型 ID')
    }

    const requestStartTime = now()
    const baseUrl = IMAGE_GENERATION_PROVIDER_INFO[IMAGE_GENERATION_PROVIDERS.OPENAI].baseUrl
    const requestUrl = `${baseUrl}/images/generations`
    let response
    try {
        response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildOpenAIImageGenerationPayload(settings, normalizedModel)),
            signal,
        })
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw error
        }

        throw buildOpenAINetworkError(error, requestUrl)
    }
    const responseReceivedTime = now()

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(normalizeImageGenerationError(response, errorText, IMAGE_GENERATION_PROVIDERS.OPENAI))
    }

    const responseText = await response.text()
    const responseBodyReadTime = now()
    const data = settings.openaiStream
        ? { events: parseServerSentEvents(responseText) }
        : JSON.parse(responseText)
    const responseParsedTime = now()
    const completedAt = new Date().toISOString()
    const clientTimings = {
        response: roundDuration(responseReceivedTime - requestStartTime),
        download: roundDuration(responseBodyReadTime - responseReceivedTime),
        parse: roundDuration(responseParsedTime - responseBodyReadTime),
        total: roundDuration(responseParsedTime - requestStartTime),
    }
    const eventImages = settings.openaiStream
        ? data.events.filter(event => event.type === 'image_generation.completed' && event.b64_json)
        : []
    const images = settings.openaiStream ? eventImages : (Array.isArray(data.data) ? data.data : [])
    const completedEvent = eventImages[eventImages.length - 1] || null

    return {
        provider: IMAGE_GENERATION_PROVIDERS.OPENAI,
        model: normalizedModel,
        prompt: settings.prompt,
        seed: null,
        images: images.map((image, index) => buildImageResult({
            data: image,
            index,
            fallbackModel: normalizedModel,
            defaultContentType: `image/${settings.openaiOutputFormat || 'png'}`,
        })).filter(image => image.url),
        hasNsfwConcepts: [],
        timings: null,
        clientTimings,
        completedAt,
        requestId: response.headers?.get?.('x-request-id') || data.id || null,
        duration: clientTimings.total,
        raw: data,
        usage: data.usage || completedEvent?.usage || null,
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

    if (provider === IMAGE_GENERATION_PROVIDERS.TOGETHER) {
        return generateTogetherImage(params)
    }

    if (provider === IMAGE_GENERATION_PROVIDERS.OPENAI) {
        return generateOpenAIImage(params)
    }

    throw new Error('暂未支持该图像生成供应商')
}
