import {
    CACHE_API_FORMATS,
    CACHE_API_FORMAT_INFO,
    CACHE_MODES,
    isGeminiCacheApiFormat,
} from '../constants/cacheHit'

const DEFAULT_GEMINI_CACHE_TTL = '3600s'
const GEMINI_AUTH_MODES = {
    API_KEY_HEADER: 'apiKeyHeader',
    QUERY_KEY: 'queryKey',
    BEARER: 'bearer',
}

function isClaudeCacheApiFormat(apiFormat) {
    return apiFormat === CACHE_API_FORMATS.CLAUDE
        || apiFormat === CACHE_API_FORMATS.WANGSU_ANTHROPIC
}

function trimTrailingSlash(value = '') {
    return String(value).trim().replace(/\/+$/, '')
}

function cleanKnownEndpointPath(pathname = '') {
    return trimTrailingSlash(pathname)
        .replace(/\/chat\/completions$/i, '')
        .replace(/\/responses$/i, '')
        .replace(/\/messages$/i, '')
        .replace(/\/cachedContents$/i, '')
        .replace(/\/models\/.+:(streamGenerateContent|generateContent)$/i, '')
}

export function normalizeCacheBaseUrl(apiFormat, baseUrl) {
    const fallback = CACHE_API_FORMAT_INFO[apiFormat]?.defaultBaseUrl || ''
    const rawValue = String(baseUrl || fallback).trim()

    if (!rawValue) {
        return ''
    }

    if (rawValue.startsWith('/')) {
        return cleanKnownEndpointPath(rawValue)
    }

    const withProtocol = /^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`
    const url = new URL(withProtocol)
    url.search = ''
    url.hash = ''

    let pathname = cleanKnownEndpointPath(url.pathname)

    if (apiFormat === CACHE_API_FORMATS.OPENAI && !/(^|\/)v\d+$/i.test(pathname)) {
        pathname = `${pathname}/v1`
    }

    if (isClaudeCacheApiFormat(apiFormat) && !/(^|\/)v\d+$/i.test(pathname)) {
        pathname = `${pathname}/v1`
    }

    if (isGeminiCacheApiFormat(apiFormat) && !/(^|\/)v\d+(beta|alpha)?$/i.test(pathname)) {
        pathname = `${pathname}/v1beta`
    }

    url.pathname = pathname || '/'
    return trimTrailingSlash(url.toString())
}

function appendPath(baseUrl, path) {
    const normalizedBase = trimTrailingSlash(baseUrl)
    return `${normalizedBase}${path}`
}

function appendQueryParam(url, key, value) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
}

function isOfficialGeminiBaseUrl(baseUrl) {
    try {
        const parsedUrl = new URL(baseUrl)
        return parsedUrl.hostname === 'generativelanguage.googleapis.com'
    } catch {
        return false
    }
}

function getGeminiAuthModeOrder(baseUrl) {
    return isOfficialGeminiBaseUrl(baseUrl)
        ? [GEMINI_AUTH_MODES.API_KEY_HEADER, GEMINI_AUTH_MODES.QUERY_KEY, GEMINI_AUTH_MODES.BEARER]
        : [GEMINI_AUTH_MODES.API_KEY_HEADER, GEMINI_AUTH_MODES.BEARER, GEMINI_AUTH_MODES.QUERY_KEY]
}

function buildGeminiRequest(baseUrl, path, apiKey, authMode) {
    const baseRequestUrl = appendPath(baseUrl, path)
    const headers = {
        'Content-Type': 'application/json',
    }

    if (authMode === GEMINI_AUTH_MODES.API_KEY_HEADER) {
        headers['x-goog-api-key'] = apiKey
    }

    if (authMode === GEMINI_AUTH_MODES.BEARER) {
        headers.Authorization = `Bearer ${apiKey}`
    }

    return {
        url: authMode === GEMINI_AUTH_MODES.QUERY_KEY
            ? appendQueryParam(baseRequestUrl, 'key', apiKey)
            : baseRequestUrl,
        headers,
    }
}

function shouldRetryGeminiAuth(response, parsedError, responseText) {
    if (response.status !== 401 && response.status !== 403) {
        return false
    }

    const message = String(
        parsedError?.error?.message
        || parsedError?.message
        || parsedError?.error
        || responseText
        || response.statusText
        || ''
    ).toLowerCase()

    return message.includes('api key')
        || message.includes('authorization')
        || message.includes('bearer')
        || message.includes('auth')
        || response.status === 401
}

function getGeminiAuthRetryModes(baseUrl, failedAuthMode, parsedError, responseText) {
    const message = String(
        parsedError?.error?.message
        || parsedError?.message
        || parsedError?.error
        || responseText
        || ''
    ).toLowerCase()

    if (failedAuthMode === GEMINI_AUTH_MODES.API_KEY_HEADER && message.includes('bearer')) {
        return [GEMINI_AUTH_MODES.BEARER]
    }

    return getGeminiAuthModeOrder(baseUrl).filter(authMode => authMode !== failedAuthMode)
}

function normalizeGeminiModelId(model = '') {
    return String(model)
        .trim()
        .replace(/^models\//, '')
}

function buildProviderError(providerName, response, responseText, parsedError) {
    const message = parsedError?.error?.message || parsedError?.message || parsedError?.error || responseText || response.statusText
    const error = new Error(`${providerName} 请求失败：HTTP ${response.status} ${message}`)
    error.status = response.status
    error.providerName = providerName
    error.payload = parsedError
    error.responseHeaders = collectResponseHeaders(response)
    return error
}

function isUnsupportedGeminiCachedContentsError(error) {
    const message = String(error?.message || '').toLowerCase()

    return error?.status === 404
        && message.includes('cachedcontents')
        && (
            message.includes('unsupported')
            || message.includes('not found')
            || message.includes('available endpoints')
        )
}

function sleep(ms, signal) {
    if (!ms) {
        return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            signal?.removeEventListener?.('abort', handleAbort)
            resolve()
        }, ms)

        function handleAbort() {
            clearTimeout(timeoutId)
            reject(new DOMException('Aborted', 'AbortError'))
        }

        if (signal) {
            if (signal.aborted) {
                handleAbort()
                return
            }
            signal.addEventListener('abort', handleAbort, { once: true })
        }
    })
}

function safeNumber(value) {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : 0
}

function safeParseErrorPayload(text) {
    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function collectResponseHeaders(response) {
    const headers = {}

    try {
        response?.headers?.forEach?.((value, key) => {
            headers[key] = value
        })
    } catch {
        return {}
    }

    return headers
}

async function parseJsonResponse(response, providerName) {
    const responseText = await response.text()
    const parsed = safeParseErrorPayload(responseText)
    const responseHeaders = collectResponseHeaders(response)

    if (!response.ok) {
        throw buildProviderError(providerName, response, responseText, parsed)
    }

    if (!parsed) {
        throw new Error(`${providerName} 返回内容不是合法 JSON`)
    }

    return {
        data: parsed,
        responseHeaders,
    }
}

function parseDynamicPrompts(text) {
    const prompts = String(text || '')
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean)

    return prompts.length > 0 ? prompts : ['请基于上述固定上下文给出一条简短总结。']
}

function clampInteger(value, fallback, min, max) {
    const parsed = parseInt(value, 10)
    if (!Number.isFinite(parsed)) {
        return fallback
    }

    return Math.min(max, Math.max(min, parsed))
}

function normalizeMaxTokens(value) {
    const parsed = parseInt(value, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function buildRoundPrompt(staticPrefix, dynamicPrompt, roundIndex) {
    return [
        staticPrefix,
        '\n\n--- Dynamic request ---',
        `Round: ${roundIndex + 1}`,
        dynamicPrompt,
    ].join('\n')
}

function normalizeOpenAiUsage(usage = {}) {
    const inputTokens = safeNumber(usage.prompt_tokens ?? usage.input_tokens)
    const cachedReadTokens = safeNumber(
        usage.prompt_tokens_details?.cached_tokens
        ?? usage.prompt_tokens_details?.cached_read_tokens
        ?? usage.input_tokens_details?.cached_tokens
        ?? usage.input_tokens_details?.cached_read_tokens
    )
    const outputTokens = safeNumber(usage.completion_tokens ?? usage.output_tokens)

    return {
        inputTokens,
        cachedReadTokens,
        cacheCreationTokens: 0,
        outputTokens,
        totalTokens: safeNumber(usage.total_tokens) || inputTokens + outputTokens,
        rawUsage: usage,
    }
}

function normalizeClaudeUsage(usage = {}) {
    const inputTokens = safeNumber(usage.input_tokens)
    const cachedReadTokens = safeNumber(usage.cache_read_input_tokens)
    const cacheCreationTokens = safeNumber(usage.cache_creation_input_tokens)
    const outputTokens = safeNumber(usage.output_tokens)
    const totalInputTokens = inputTokens + cachedReadTokens + cacheCreationTokens

    return {
        inputTokens: totalInputTokens,
        billableInputTokens: inputTokens,
        cachedReadTokens,
        cacheCreationTokens,
        outputTokens,
        totalTokens: totalInputTokens + outputTokens,
        rawUsage: usage,
    }
}

function normalizeGeminiUsage(usageMetadata = {}) {
    const promptTokens = safeNumber(usageMetadata.promptTokenCount)
    const cachedReadTokens = safeNumber(usageMetadata.cachedContentTokenCount)
    const outputTokens = safeNumber(usageMetadata.candidatesTokenCount)

    return {
        inputTokens: promptTokens,
        cachedReadTokens,
        cacheCreationTokens: 0,
        outputTokens,
        totalTokens: safeNumber(usageMetadata.totalTokenCount) || promptTokens + outputTokens,
        rawUsage: usageMetadata,
    }
}

export function calculateCacheSummary(results) {
    const successfulResults = results.filter(result => result.status === 'success')

    const totals = successfulResults.reduce((acc, result) => {
        acc.inputTokens += result.usage?.inputTokens || 0
        acc.cachedReadTokens += result.usage?.cachedReadTokens || 0
        acc.cacheCreationTokens += result.usage?.cacheCreationTokens || 0
        acc.outputTokens += result.usage?.outputTokens || 0
        acc.totalDuration += result.durationMs || 0
        return acc
    }, {
        inputTokens: 0,
        cachedReadTokens: 0,
        cacheCreationTokens: 0,
        outputTokens: 0,
        totalDuration: 0,
    })

    const warmResults = successfulResults.slice(1)
    const warmTotals = warmResults.reduce((acc, result) => {
        acc.inputTokens += result.usage?.inputTokens || 0
        acc.cachedReadTokens += result.usage?.cachedReadTokens || 0
        return acc
    }, {
        inputTokens: 0,
        cachedReadTokens: 0,
    })

    return {
        ...totals,
        totalRequests: results.length,
        successfulRequests: successfulResults.length,
        failedRequests: results.length - successfulResults.length,
        hitRate: totals.inputTokens > 0 ? totals.cachedReadTokens / totals.inputTokens : 0,
        warmHitRate: warmTotals.inputTokens > 0 ? warmTotals.cachedReadTokens / warmTotals.inputTokens : 0,
        warmInputTokens: warmTotals.inputTokens,
        warmCachedReadTokens: warmTotals.cachedReadTokens,
        averageDuration: successfulResults.length > 0 ? totals.totalDuration / successfulResults.length : 0,
    }
}

function buildOpenAiRequest({ model, staticPrefix, dynamicPrompt, roundIndex, maxTokens, temperature }) {
    return {
        model,
        messages: [
            {
                role: 'system',
                content: staticPrefix,
            },
            {
                role: 'user',
                content: buildRoundPrompt('', dynamicPrompt, roundIndex).trim(),
            },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: false,
    }
}

function buildOpenAiStreamingRequest(params) {
    return {
        ...buildOpenAiRequest(params),
        stream: true,
        stream_options: {
            include_usage: true,
        },
    }
}

function parseServerSentEvents(text) {
    const events = []

    for (const block of String(text || '').split(/\n\n+/)) {
        const dataLines = block
            .split('\n')
            .filter(line => line.trim().startsWith('data:'))

        for (const line of dataLines) {
            const data = line.replace(/^data:\s*/, '').trim()

            if (!data || data === '[DONE]') {
                continue
            }

            const parsed = safeParseErrorPayload(data)
            if (parsed) {
                events.push(parsed)
            }
        }
    }

    return events
}

function extractOpenAiStreamingResult(responseText) {
    const events = parseServerSentEvents(responseText)
    const content = []
    let usage = null

    for (const event of events) {
        const deltaContent = event.choices?.[0]?.delta?.content
        if (deltaContent) {
            content.push(deltaContent)
        }

        if (event.usage) {
            usage = event.usage
        }
    }

    return {
        content: content.join(''),
        usage,
        rawResponse: {
            events,
            usage,
        },
    }
}

function extractGeminiContent(data) {
    return data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('\n') || ''
}

function extractGeminiStreamingResult(responseText) {
    const events = parseServerSentEvents(responseText)
    const content = []
    let usageMetadata = null

    for (const event of events) {
        const eventContent = extractGeminiContent(event)
        if (eventContent) {
            content.push(eventContent)
        }

        if (event.usageMetadata) {
            usageMetadata = event.usageMetadata
        }
    }

    return {
        content: content.join(''),
        usageMetadata,
        rawResponse: {
            events,
            usageMetadata,
        },
    }
}

function buildClaudeRequest({ model, staticPrefix, dynamicPrompt, roundIndex, maxTokens, temperature, cacheMode, claudeUserId }) {
    const normalizedUserId = String(claudeUserId || '').trim()
    const systemBlock = {
        type: 'text',
        text: staticPrefix,
        ...(cacheMode === CACHE_MODES.EXPLICIT && {
            cache_control: { type: 'ephemeral' },
        }),
    }

    return {
        model,
        ...(normalizedUserId && {
            metadata: {
                user_id: normalizedUserId,
            },
        }),
        ...(cacheMode === CACHE_MODES.AUTO && {
            cache_control: { type: 'ephemeral' },
        }),
        system: [systemBlock],
        messages: [
            {
                role: 'user',
                content: buildRoundPrompt('', dynamicPrompt, roundIndex).trim(),
            },
        ],
        temperature,
        max_tokens: maxTokens || 128,
    }
}

function buildGeminiContents(dynamicPrompt, roundIndex) {
    return [
        {
            role: 'user',
            parts: [
                {
                    text: buildRoundPrompt('', dynamicPrompt, roundIndex).trim(),
                },
            ],
        },
    ]
}

function buildGeminiGenerateRequest({ staticPrefix, dynamicPrompt, roundIndex, maxTokens, temperature, cachedContentName }) {
    return {
        contents: buildGeminiContents(dynamicPrompt, roundIndex),
        ...(cachedContentName
            ? { cachedContent: cachedContentName }
            : {
                systemInstruction: {
                    parts: [
                        {
                            text: staticPrefix,
                        },
                    ],
                },
            }),
        generationConfig: {
            temperature,
            ...(maxTokens && { maxOutputTokens: maxTokens }),
        },
    }
}

async function fetchGeminiJson({
    apiKey,
    baseUrl,
    path,
    body,
    method = 'POST',
    signal,
    providerName = 'Gemini',
}) {
    let authModes = getGeminiAuthModeOrder(baseUrl)
    const attemptedAuthModes = new Set()
    let lastError = null

    while (authModes.length > 0) {
        const authMode = authModes.shift()
        if (attemptedAuthModes.has(authMode)) {
            continue
        }
        attemptedAuthModes.add(authMode)
        const request = buildGeminiRequest(baseUrl, path, apiKey, authMode)
        const response = await fetch(request.url, {
            method,
            headers: request.headers,
            ...(body && { body: JSON.stringify(body) }),
            signal,
        })
        const responseText = await response.text()
        const parsed = safeParseErrorPayload(responseText)
        const responseHeaders = collectResponseHeaders(response)

        if (response.ok) {
            if (!parsed) {
                throw new Error(`${providerName} 返回内容不是合法 JSON`)
            }

            return {
                data: parsed,
                authMode,
                responseHeaders,
            }
        }

        lastError = buildProviderError(providerName, response, responseText, parsed)

        if (!shouldRetryGeminiAuth(response, parsed, responseText)) {
            throw lastError
        }

        authModes = getGeminiAuthRetryModes(baseUrl, authMode, parsed, responseText)
    }

    throw lastError || new Error(`${providerName} 请求失败`)
}

async function fetchGeminiStreamText({
    apiKey,
    baseUrl,
    path,
    body,
    signal,
    providerName = 'Gemini',
}) {
    let authModes = getGeminiAuthModeOrder(baseUrl)
    const attemptedAuthModes = new Set()
    let lastError = null

    while (authModes.length > 0) {
        const authMode = authModes.shift()
        if (attemptedAuthModes.has(authMode)) {
            continue
        }
        attemptedAuthModes.add(authMode)
        const request = buildGeminiRequest(baseUrl, path, apiKey, authMode)
        const response = await fetch(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify(body),
            signal,
        })
        const responseText = await response.text()
        const parsed = safeParseErrorPayload(responseText)
        const responseHeaders = collectResponseHeaders(response)

        if (response.ok) {
            return {
                text: responseText,
                authMode,
                responseHeaders,
            }
        }

        lastError = buildProviderError(providerName, response, responseText, parsed)

        if (!shouldRetryGeminiAuth(response, parsed, responseText)) {
            throw lastError
        }

        authModes = getGeminiAuthRetryModes(baseUrl, authMode, parsed, responseText)
    }

    throw lastError || new Error(`${providerName} 请求失败`)
}

async function createGeminiCachedContent({
    apiKey,
    baseUrl,
    model,
    staticPrefix,
    signal,
}) {
    const { data, responseHeaders } = await fetchGeminiJson({
        apiKey,
        baseUrl,
        path: '/cachedContents',
        body: {
            model: `models/${normalizeGeminiModelId(model)}`,
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: staticPrefix,
                        },
                    ],
                },
            ],
            ttl: DEFAULT_GEMINI_CACHE_TTL,
        },
        signal,
        providerName: 'Gemini cachedContents',
    })

    return {
        name: data.name,
        responseHeaders,
    }
}

async function deleteGeminiCachedContent({ apiKey, baseUrl, cachedContentName, signal }) {
    if (!cachedContentName) {
        return
    }

    try {
        await fetchGeminiJson({
            apiKey,
            baseUrl,
            path: `/${cachedContentName}`,
            method: 'DELETE',
            signal,
        })
    } catch {
        // Best effort cleanup; the cache also expires by TTL.
    }
}

async function runOpenAiRound(params) {
    const {
        apiKey,
        baseUrl,
        signal,
    } = params
    const requestUrl = appendPath(baseUrl, '/chat/completions')
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    }
    const streamingResponse = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildOpenAiStreamingRequest(params)),
        signal,
    })
    const streamingText = await streamingResponse.text()
    const streamingResponseHeaders = collectResponseHeaders(streamingResponse)

    if (streamingResponse.ok) {
        const streamingResult = extractOpenAiStreamingResult(streamingText)
        if (streamingResult.usage) {
            return {
                content: streamingResult.content,
                usage: normalizeOpenAiUsage(streamingResult.usage),
                rawResponse: streamingResult.rawResponse,
                responseHeaders: streamingResponseHeaders,
            }
        }
    }

    if (!streamingResponse.ok) {
        const errorPayload = safeParseErrorPayload(streamingText)
        const errorMessage = errorPayload?.error?.message || errorPayload?.message || streamingText || streamingResponse.statusText

        if (streamingResponse.status !== 400 && streamingResponse.status !== 422) {
            throw new Error(`OpenAI 请求失败：HTTP ${streamingResponse.status} ${errorMessage}`)
        }
    }

    const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildOpenAiRequest(params)),
        signal,
    })
    const { data, responseHeaders } = await parseJsonResponse(response, 'OpenAI')

    return {
        content: data.choices?.[0]?.message?.content || '',
        usage: normalizeOpenAiUsage(data.usage),
        rawResponse: data,
        responseHeaders,
    }
}

async function runClaudeRound(params) {
    const {
        apiKey,
        apiFormat,
        baseUrl,
        signal,
    } = params
    const response = await fetch(appendPath(baseUrl, '/messages'), {
        method: 'POST',
        headers: {
            [apiFormat === CACHE_API_FORMATS.WANGSU_ANTHROPIC ? 'X-Api-Key' : 'x-api-key']: apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify(buildClaudeRequest(params)),
        signal,
    })
    const { data, responseHeaders } = await parseJsonResponse(response, 'Claude')

    return {
        content: data.content?.map(block => block.text || '').join('\n') || '',
        usage: normalizeClaudeUsage(data.usage),
        rawResponse: data,
        responseHeaders,
    }
}

async function runGeminiRound(params) {
    const {
        apiKey,
        baseUrl,
        model,
        signal,
    } = params
    const normalizedModel = normalizeGeminiModelId(model)

    if (params.streamMode) {
        const { text, authMode, responseHeaders } = await fetchGeminiStreamText({
            apiKey,
            baseUrl,
            path: `/models/${normalizedModel}:streamGenerateContent`,
            body: buildGeminiGenerateRequest(params),
            signal,
            providerName: 'Gemini stream',
        })
        const streamingResult = extractGeminiStreamingResult(text)

        return {
            content: streamingResult.content,
            usage: normalizeGeminiUsage(streamingResult.usageMetadata),
            rawResponse: {
                ...streamingResult.rawResponse,
                authMode,
            },
            responseHeaders,
        }
    }

    const { data, authMode, responseHeaders } = await fetchGeminiJson({
        apiKey,
        baseUrl,
        path: `/models/${normalizedModel}:generateContent`,
        body: buildGeminiGenerateRequest(params),
        signal,
        providerName: 'Gemini',
    })

    return {
        content: extractGeminiContent(data),
        usage: normalizeGeminiUsage(data.usageMetadata),
        rawResponse: {
            ...data,
            authMode,
        },
        responseHeaders,
    }
}

export function normalizeCacheHitSettings(settings) {
    const apiFormat = settings.apiFormat || CACHE_API_FORMATS.OPENAI
    const supportedModes = CACHE_API_FORMAT_INFO[apiFormat]?.supportedModes || [CACHE_MODES.AUTO]
    const cacheMode = supportedModes.includes(settings.cacheMode) ? settings.cacheMode : supportedModes[0]
    const maxTokens = normalizeMaxTokens(settings.maxTokens) || 128

    return {
        ...settings,
        apiFormat,
        cacheMode,
        baseUrl: normalizeCacheBaseUrl(apiFormat, settings.baseUrl),
        model: String(settings.model || '').trim(),
        apiKey: String(settings.apiKey || '').trim(),
        staticPrefix: String(settings.staticPrefix || '').trim(),
        dynamicPrompts: parseDynamicPrompts(settings.dynamicPromptsText),
        rounds: clampInteger(settings.rounds, 4, 2, 12),
        interval: clampInteger(settings.interval, 1200, 0, 30000),
        maxTokens,
        temperature: Number.isFinite(Number(settings.temperature)) ? Number(settings.temperature) : 0,
        claudeUserId: String(settings.claudeUserId || '').trim(),
        streamMode: Boolean(settings.streamMode),
    }
}

export async function runCacheHitTest(settings, callbacks = {}) {
    const normalizedSettings = normalizeCacheHitSettings(settings)
    const {
        apiFormat,
        cacheMode,
        apiKey,
        baseUrl,
        model,
        staticPrefix,
        dynamicPrompts,
        rounds,
        interval,
        signal,
    } = normalizedSettings

    if (!apiKey) {
        throw new Error('请填写 API Key')
    }

    if (!baseUrl) {
        throw new Error('请填写 Base URL')
    }

    if (!model) {
        throw new Error('请填写 Model ID')
    }

    if (!staticPrefix) {
        throw new Error('请填写静态前缀')
    }

    let cachedContentName = null
    let cacheCreateDebug = null
    let effectiveCacheMode = cacheMode

    if (apiFormat === CACHE_API_FORMATS.GEMINI && cacheMode === CACHE_MODES.EXPLICIT) {
        try {
            const cachedContent = await createGeminiCachedContent({
                apiKey,
                baseUrl,
                model,
                staticPrefix,
                signal,
            })
            cachedContentName = cachedContent.name
            cacheCreateDebug = {
                type: 'Gemini cachedContents create',
                status: 'success',
                resourceName: cachedContentName,
                responseHeaders: cachedContent.responseHeaders,
            }
            callbacks.onCacheCreated?.(cachedContentName)
        } catch (error) {
            if (!isUnsupportedGeminiCachedContentsError(error)) {
                throw error
            }

            cacheCreateDebug = {
                type: 'Gemini cachedContents create',
                status: 'failed',
                httpStatus: error.status,
                message: error.message,
                responseHeaders: error.responseHeaders || {},
            }
            effectiveCacheMode = CACHE_MODES.AUTO
            callbacks.onCacheFallback?.('当前 Gemini Base URL 的 cachedContents 创建请求返回 unsupported，已自动降级为 generateContent 隐式缓存测试。')
        }
    }

    const results = []

    try {
        for (let index = 0; index < rounds; index++) {
            if (signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError')
            }

            const dynamicPrompt = dynamicPrompts[index % dynamicPrompts.length]
            callbacks.onRoundStart?.(index, dynamicPrompt)
            const startedAt = Date.now()

            const roundParams = {
                ...normalizedSettings,
                cacheMode: effectiveCacheMode,
                staticPrefix,
                dynamicPrompt,
                roundIndex: index,
                cachedContentName,
                signal,
            }

            const runRound = {
                [CACHE_API_FORMATS.OPENAI]: runOpenAiRound,
                [CACHE_API_FORMATS.CLAUDE]: runClaudeRound,
                [CACHE_API_FORMATS.GEMINI]: runGeminiRound,
                [CACHE_API_FORMATS.WANGSU_GEMINI]: runGeminiRound,
                [CACHE_API_FORMATS.WANGSU_ANTHROPIC]: runClaudeRound,
            }[apiFormat]

            const roundResult = await runRound(roundParams)
            const result = {
                id: `cache_round_${index + 1}`,
                index,
                round: index + 1,
                status: 'success',
                dynamicPrompt,
                durationMs: Date.now() - startedAt,
                ...roundResult,
                debug: {
                    cacheCreate: index === 0 ? cacheCreateDebug : null,
                    responseHeaders: roundResult.responseHeaders || {},
                },
            }

            results.push(result)
            callbacks.onRoundComplete?.(result, calculateCacheSummary(results))

            if (index < rounds - 1 && interval > 0) {
                await sleep(interval, signal)
            }
        }
    } finally {
        if (cachedContentName) {
            await deleteGeminiCachedContent({
                apiKey,
                baseUrl,
                cachedContentName,
                signal,
            })
        }
    }

    return {
        results,
        summary: calculateCacheSummary(results),
    }
}
