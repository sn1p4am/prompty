import {
    CACHE_API_FORMATS,
    CACHE_API_FORMAT_INFO,
    CACHE_MODES,
} from '../constants/cacheHit'

const DEFAULT_GEMINI_CACHE_TTL = '3600s'

function trimTrailingSlash(value = '') {
    return String(value).trim().replace(/\/+$/, '')
}

function cleanKnownEndpointPath(pathname = '') {
    return trimTrailingSlash(pathname)
        .replace(/\/chat\/completions$/i, '')
        .replace(/\/responses$/i, '')
        .replace(/\/messages$/i, '')
        .replace(/\/cachedContents$/i, '')
        .replace(/\/models\/[^/]+:generateContent$/i, '')
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

    if (apiFormat === CACHE_API_FORMATS.CLAUDE && !/(^|\/)v\d+$/i.test(pathname)) {
        pathname = `${pathname}/v1`
    }

    if (apiFormat === CACHE_API_FORMATS.GEMINI && !/(^|\/)v\d+(beta|alpha)?$/i.test(pathname)) {
        pathname = `${pathname}/v1beta`
    }

    url.pathname = pathname || '/'
    return trimTrailingSlash(url.toString())
}

function appendPath(baseUrl, path) {
    const normalizedBase = trimTrailingSlash(baseUrl)
    return `${normalizedBase}${path}`
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

async function parseJsonResponse(response, providerName) {
    const responseText = await response.text()
    const parsed = safeParseErrorPayload(responseText)

    if (!response.ok) {
        const message = parsed?.error?.message || parsed?.message || parsed?.error || responseText || response.statusText
        throw new Error(`${providerName} 请求失败：HTTP ${response.status} ${message}`)
    }

    if (!parsed) {
        throw new Error(`${providerName} 返回内容不是合法 JSON`)
    }

    return parsed
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

async function createGeminiCachedContent({
    apiKey,
    baseUrl,
    model,
    staticPrefix,
    signal,
}) {
    const response = await fetch(`${appendPath(baseUrl, '/cachedContents')}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: `models/${model.replace(/^models\//, '')}`,
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
        }),
        signal,
    })

    const data = await parseJsonResponse(response, 'Gemini cachedContents')
    return data.name
}

async function deleteGeminiCachedContent({ apiKey, baseUrl, cachedContentName, signal }) {
    if (!cachedContentName) {
        return
    }

    try {
        await fetch(`${appendPath(baseUrl, `/${cachedContentName}`)}?key=${encodeURIComponent(apiKey)}`, {
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

    if (streamingResponse.ok) {
        const streamingResult = extractOpenAiStreamingResult(streamingText)
        if (streamingResult.usage) {
            return {
                content: streamingResult.content,
                usage: normalizeOpenAiUsage(streamingResult.usage),
                rawResponse: streamingResult.rawResponse,
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
    const data = await parseJsonResponse(response, 'OpenAI')

    return {
        content: data.choices?.[0]?.message?.content || '',
        usage: normalizeOpenAiUsage(data.usage),
        rawResponse: data,
    }
}

async function runClaudeRound(params) {
    const {
        apiKey,
        baseUrl,
        signal,
    } = params
    const response = await fetch(appendPath(baseUrl, '/messages'), {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify(buildClaudeRequest(params)),
        signal,
    })
    const data = await parseJsonResponse(response, 'Claude')

    return {
        content: data.content?.map(block => block.text || '').join('\n') || '',
        usage: normalizeClaudeUsage(data.usage),
        rawResponse: data,
    }
}

async function runGeminiRound(params) {
    const {
        apiKey,
        baseUrl,
        model,
        signal,
    } = params
    const normalizedModel = model.replace(/^models\//, '')
    const response = await fetch(`${appendPath(baseUrl, `/models/${normalizedModel}:generateContent`)}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildGeminiGenerateRequest(params)),
        signal,
    })
    const data = await parseJsonResponse(response, 'Gemini')

    return {
        content: data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') || '',
        usage: normalizeGeminiUsage(data.usageMetadata),
        rawResponse: data,
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

    if (apiFormat === CACHE_API_FORMATS.GEMINI && cacheMode === CACHE_MODES.EXPLICIT) {
        cachedContentName = await createGeminiCachedContent({
            apiKey,
            baseUrl,
            model,
            staticPrefix,
            signal,
        })
        callbacks.onCacheCreated?.(cachedContentName)
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
