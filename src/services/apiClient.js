import { PROVIDERS } from '../constants/providers'

function isAionlyCompatibleProvider(provider) {
    return provider === PROVIDERS.AIONLY || provider === PROVIDERS.AIIONLY
}

function isVertexProvider(provider) {
    return provider === PROVIDERS.VERTEX
}

function prefersEnableThinking(model = '') {
    const normalizedModel = String(model).toLowerCase()
    return /(^|[/:_-])(qwq|qvq|qwen)([/:_-]|$)/.test(normalizedModel)
}

function buildThinkingPayload(style, enableThinking) {
    if (style === 'thinking_object') {
        return {
            thinking: { type: enableThinking ? 'enabled' : 'disabled' }
        }
    }

    if (style === 'enable_thinking') {
        return {
            enable_thinking: enableThinking
        }
    }

    return {}
}

function getThinkingPayloadVariants(provider, model, enableThinking) {
    if (provider === PROVIDERS.VOLCENGINE) {
        return [buildThinkingPayload('thinking_object', enableThinking)]
    }

    if (provider === PROVIDERS.ALIBAILIAN) {
        return [buildThinkingPayload('enable_thinking', enableThinking)]
    }

    if (isAionlyCompatibleProvider(provider) && enableThinking) {
        const orderedStyles = prefersEnableThinking(model)
            ? ['enable_thinking', 'thinking_object']
            : ['thinking_object', 'enable_thinking']

        return orderedStyles.map(style => buildThinkingPayload(style, enableThinking))
    }

    return [{}]
}

function buildOpenAiCompatibleRequestBody({
    provider,
    model,
    messages,
    streamMode,
    temperature,
    topP,
    maxTokens,
    thinkingPayload = {},
}) {
    const normalizedMaxTokens = maxTokens ? parseInt(maxTokens, 10) : null

    return {
        model,
        messages,
        stream: streamMode,
        temperature,
        top_p: topP,
        ...(normalizedMaxTokens && { max_tokens: normalizedMaxTokens }),
        ...(provider === PROVIDERS.OPENROUTER && {
            usage: { include: true }
        }),
        ...thinkingPayload,
        ...((provider === PROVIDERS.VOLCENGINE || provider === PROVIDERS.ALIBAILIAN) && streamMode && {
            stream_options: {
                include_usage: true,
                chunk_include_usage: false
            }
        })
    }
}

function serializeToolCalls(toolCalls) {
    if (!toolCalls?.length) {
        return ''
    }

    return `<tool_call>${JSON.stringify(toolCalls, null, 2)}</tool_call>`
}

function mergeToolCallDelta(toolCallsState, deltaToolCalls = []) {
    for (const deltaToolCall of deltaToolCalls) {
        const index = deltaToolCall.index ?? 0
        const currentToolCall = toolCallsState[index] || {
            type: deltaToolCall.type || 'function',
            function: {
                name: '',
                arguments: '',
            }
        }

        toolCallsState[index] = {
            ...currentToolCall,
            id: deltaToolCall.id || currentToolCall.id,
            type: deltaToolCall.type || currentToolCall.type,
            function: {
                name: deltaToolCall.function?.name || currentToolCall.function?.name || '',
                arguments: `${currentToolCall.function?.arguments || ''}${deltaToolCall.function?.arguments || ''}`,
            }
        }
    }
}

function normalizeVertexModelPath(model = '') {
    const normalizedModel = String(model).trim()

    if (!normalizedModel) {
        return ''
    }

    if (normalizedModel.startsWith('publishers/')) {
        return normalizedModel
    }

    if (normalizedModel.startsWith('models/')) {
        return `publishers/google/${normalizedModel}`
    }

    return `publishers/google/models/${normalizedModel.replace(/^google\//, '')}`
}

function buildVertexGenerationConfig({
    temperature,
    topP,
    maxTokens,
    enableThinking,
    vertexOptions = {},
}) {
    const config = {}
    const normalizedMaxTokens = maxTokens ? parseInt(maxTokens, 10) : null

    if (typeof temperature === 'number' && !Number.isNaN(temperature)) {
        config.temperature = temperature
    }

    if (typeof topP === 'number' && !Number.isNaN(topP)) {
        config.topP = topP
    }

    if (normalizedMaxTokens) {
        config.maxOutputTokens = normalizedMaxTokens
    }

    if (vertexOptions.responseMimeType) {
        config.responseMimeType = vertexOptions.responseMimeType
    }

    if (vertexOptions.responseSchema) {
        config.responseSchema = vertexOptions.responseSchema
    }

    if (!enableThinking) {
        config.thinkingConfig = {
            thinkingBudget: 0,
        }
        return config
    }

    if (vertexOptions.thinkingLevel || vertexOptions.thinkingBudget !== null) {
        config.thinkingConfig = {
            ...(vertexOptions.thinkingLevel && { thinkingLevel: vertexOptions.thinkingLevel }),
            ...(vertexOptions.thinkingBudget !== null && { thinkingBudget: vertexOptions.thinkingBudget }),
        }
    }

    return config
}

function buildVertexNativeRequestBody({
    systemPrompt,
    userPrompt,
    temperature,
    topP,
    maxTokens,
    enableThinking,
    vertexOptions,
}) {
    const generationConfig = buildVertexGenerationConfig({
        temperature,
        topP,
        maxTokens,
        enableThinking,
        vertexOptions,
    })

    const effectiveUserPrompt = userPrompt || systemPrompt || ''
    const body = {
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: effectiveUserPrompt,
                    }
                ]
            }
        ],
        ...(systemPrompt && userPrompt && {
            systemInstruction: {
                role: 'system',
                parts: [
                    {
                        text: systemPrompt,
                    }
                ]
            }
        }),
        ...(Object.keys(generationConfig).length > 0 && { generationConfig }),
    }

    return body
}

function buildVertexRequestUrl(baseUrl, model, streamMode, apiKey) {
    const modelPath = normalizeVertexModelPath(model)
    const action = streamMode ? 'streamGenerateContent' : 'generateContent'
    const params = new URLSearchParams({
        key: apiKey,
    })

    if (streamMode) {
        params.set('alt', 'sse')
    }

    return `${baseUrl}/${modelPath}:${action}?${params.toString()}`
}

function normalizeVertexUsage(usageMetadata) {
    if (!usageMetadata) {
        return null
    }

    return {
        prompt_tokens: usageMetadata.promptTokenCount || 0,
        completion_tokens: usageMetadata.candidatesTokenCount || 0,
        total_tokens: usageMetadata.totalTokenCount || 0,
        reasoning_tokens: usageMetadata.thoughtsTokenCount || usageMetadata.thoughtTokenCount,
    }
}

function normalizeVertexFunctionCall(functionCall) {
    if (!functionCall) {
        return null
    }

    return {
        type: 'function',
        function: {
            name: functionCall.name || '',
            arguments: functionCall.args ? JSON.stringify(functionCall.args, null, 2) : '{}',
        }
    }
}

function extractVertexResponseContent(data) {
    const parts = data.candidates?.[0]?.content?.parts || []

    let answer = ''
    let thinking = ''
    const toolCalls = []

    for (const part of parts) {
        if (part.functionCall) {
            const normalizedFunctionCall = normalizeVertexFunctionCall(part.functionCall)
            if (normalizedFunctionCall) {
                toolCalls.push(normalizedFunctionCall)
            }
        }

        if (!part.text) {
            continue
        }

        if (part.thought === true) {
            thinking += part.text
            continue
        }

        answer += part.text
    }

    return {
        answer,
        thinking,
        toolCalls,
    }
}

function buildVertexMetadata({
    firstTokenLatency,
    requestStartTime,
    usageMetadata,
}) {
    return {
        firstTokenLatency,
        totalDuration: Date.now() - requestStartTime,
        provider: 'vertex',
        ...(usageMetadata && {
            usage: usageMetadata,
        })
    }
}

function normalizeApiError(response, errorText, model, provider) {
    let errorMessage = `HTTP ${response.status}`

    try {
        const errorData = JSON.parse(errorText)
        if (errorData.error?.message) {
            errorMessage = errorData.error.message
        } else if (errorData.msg) {
            errorMessage = errorData.msg
        } else if (errorData.message) {
            errorMessage = errorData.message
        }

        if (response.status === 404) {
            errorMessage = `模型 "${model}" 不存在或不可用`
        } else if (response.status === 401) {
            errorMessage = 'API Key 无效或已过期'
        } else if (response.status === 402) {
            errorMessage = '账户余额不足'
        } else if (response.status === 429) {
            errorMessage = '请求频率过高，请降低并发数'
        } else if (response.status === 403 && isVertexProvider(provider)) {
            errorMessage = 'Vertex AI API Key 无效、受限，或未开通 Gemini API / Vertex AI Express Mode'
        } else if (response.status === 400 && isVertexProvider(provider)) {
            errorMessage = errorData.error?.message || 'Vertex 原生请求参数无效，请检查模型 ID、Thinking 设置和结构化输出 Schema'
        }
    } catch {
        errorMessage = errorText || response.statusText
    }

    return errorMessage
}

function shouldRetryThinkingVariant(provider, response, variantIndex, variantCount) {
    if (!isAionlyCompatibleProvider(provider)) {
        return false
    }

    if (variantIndex >= variantCount - 1) {
        return false
    }

    return response.status === 400 || response.status === 422
}

async function streamVertexRequest(params, onChunk, onComplete, onError, onMetadata) {
    const {
        apiKey,
        baseUrl,
        model,
        systemPrompt,
        userPrompt,
        temperature,
        topP,
        maxTokens,
        streamMode,
        enableThinking,
        vertexOptions,
    } = params

    try {
        const requestStartTime = Date.now()
        const requestUrl = buildVertexRequestUrl(baseUrl, model, streamMode, apiKey)
        const requestBody = buildVertexNativeRequestBody({
            systemPrompt,
            userPrompt,
            temperature,
            topP,
            maxTokens,
            enableThinking,
            vertexOptions,
        })

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(normalizeApiError(response, errorText, model, PROVIDERS.VERTEX))
        }

        if (!streamMode) {
            const data = await response.json()
            const { answer, thinking, toolCalls } = extractVertexResponseContent(data)

            let mergedContent = ''
            if (thinking) {
                mergedContent += `<think>${thinking}</think>`
            }
            if (answer) {
                mergedContent += answer
            }
            if (toolCalls.length) {
                mergedContent += serializeToolCalls(toolCalls)
            }

            onChunk(mergedContent)

            if (onMetadata) {
                onMetadata(buildVertexMetadata({
                    firstTokenLatency: null,
                    requestStartTime,
                    usageMetadata: normalizeVertexUsage(data.usageMetadata),
                }))
            }

            onComplete()
            return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let firstTokenReceived = false
        let firstTokenLatency = null
        let accumulatedThinking = ''
        let thinkingComplete = false
        const accumulatedToolCalls = []
        let usageMetadata = null

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (!line.trim() || line.startsWith(':')) continue

                if (!line.startsWith('data: ')) continue

                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                    const json = JSON.parse(data)
                    const { answer, thinking, toolCalls } = extractVertexResponseContent(json)

                    let mergedContent = ''

                    if (thinking) {
                        accumulatedThinking += thinking
                    }

                    if (toolCalls.length) {
                        accumulatedToolCalls.push(...toolCalls)
                    }

                    if (answer && !thinkingComplete && accumulatedThinking) {
                        mergedContent += `<think>${accumulatedThinking}</think>`
                        thinkingComplete = true
                    }

                    if (answer) {
                        mergedContent += answer
                    }

                    if (!firstTokenReceived && (mergedContent || thinking || toolCalls.length)) {
                        firstTokenReceived = true
                        firstTokenLatency = Date.now() - requestStartTime
                    }

                    if (mergedContent) {
                        onChunk(mergedContent)
                    }

                    if (json.usageMetadata) {
                        usageMetadata = normalizeVertexUsage(json.usageMetadata)
                    }
                } catch {
                    // 忽略解析错误
                }
            }
        }

        if (accumulatedThinking && !thinkingComplete) {
            onChunk(`<think>${accumulatedThinking}</think>`)
        }

        if (accumulatedToolCalls.length) {
            onChunk(serializeToolCalls(accumulatedToolCalls))
        }

        if (onMetadata) {
            onMetadata(buildVertexMetadata({
                firstTokenLatency,
                requestStartTime,
                usageMetadata,
            }))
        }

        onComplete()
    } catch (error) {
        onError(error)
    }
}

async function streamOpenAiCompatibleRequest(params, onChunk, onComplete, onError, onMetadata) {
    const {
        provider,
        apiKey,
        baseUrl,
        model,
        systemPrompt,
        userPrompt,
        temperature,
        topP,
        maxTokens,
        streamMode,
        enableThinking,
    } = params

    try {
        const messages = []
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt })
        }
        if (userPrompt) {
            messages.push({ role: 'user', content: userPrompt })
        }

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(provider === PROVIDERS.OPENROUTER && {
                'HTTP-Referer': 'https://prompt-tester.app',
                'X-Title': 'Prompt Tester'
            })
        }

        const requestBodyVariants = getThinkingPayloadVariants(provider, model, enableThinking)
            .map(thinkingPayload => buildOpenAiCompatibleRequestBody({
                provider,
                model,
                messages,
                streamMode,
                temperature,
                topP,
                maxTokens,
                thinkingPayload,
            }))

        let response = null
        let lastErrorMessage = null
        let requestStartTime = Date.now()

        for (let index = 0; index < requestBodyVariants.length; index++) {
            const requestBody = requestBodyVariants[index]
            requestStartTime = Date.now()

            response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
            })

            if (response.ok) {
                break
            }

            const errorText = await response.text()
            lastErrorMessage = normalizeApiError(response, errorText, model, provider)

            if (!shouldRetryThinkingVariant(provider, response, index, requestBodyVariants.length)) {
                throw new Error(lastErrorMessage)
            }
        }

        if (!response.ok) {
            throw new Error(lastErrorMessage || `HTTP ${response.status}`)
        }

        if (!streamMode) {
            const data = await response.json()

            const content = data.choices?.[0]?.message?.content || ''
            const reasoningContent = data.choices?.[0]?.message?.reasoning_content || ''
            const toolCalls = data.choices?.[0]?.message?.tool_calls || []

            let mergedContent = ''
            if (reasoningContent) {
                mergedContent += `<think>${reasoningContent}</think>`
            }
            if (content) {
                mergedContent += content
            }
            if (toolCalls.length) {
                mergedContent += serializeToolCalls(toolCalls)
            }

            onChunk(mergedContent)
            if (onMetadata) {
                onMetadata({
                    firstTokenLatency: null,
                    totalDuration: Date.now() - requestStartTime,
                    provider,
                    ...(data.usage && {
                        usage: {
                            ...data.usage,
                            reasoning_tokens: data.usage.completion_tokens_details?.reasoning_tokens
                        }
                    }),
                })
            }
            onComplete()
            return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let firstTokenReceived = false
        let firstTokenLatency = null
        let openRouterMeta = null
        let generationId = null
        let accumulatedReasoning = ''
        let reasoningComplete = false
        const accumulatedToolCalls = []

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (!line.trim() || line.startsWith(':')) continue

                if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') continue

                    try {
                        const json = JSON.parse(data)

                        const content = json.choices?.[0]?.delta?.content
                        const reasoningContent = json.choices?.[0]?.delta?.reasoning_content
                        const toolCalls = json.choices?.[0]?.delta?.tool_calls

                        let mergedContent = ''

                        if (reasoningContent) {
                            accumulatedReasoning += reasoningContent
                        }

                        if (toolCalls?.length) {
                            mergeToolCallDelta(accumulatedToolCalls, toolCalls)
                        }

                        if (content && !reasoningComplete && accumulatedReasoning) {
                            mergedContent += `<think>${accumulatedReasoning}</think>`
                            reasoningComplete = true
                        }

                        if (content) {
                            mergedContent += content
                        }

                        if (mergedContent && !firstTokenReceived) {
                            firstTokenReceived = true
                            firstTokenLatency = Date.now() - requestStartTime
                        }

                        if (mergedContent) {
                            onChunk(mergedContent)
                        }

                        if (provider === PROVIDERS.OPENROUTER && !generationId && json.id) {
                            generationId = json.id
                        }

                        if (json.usage) {
                            openRouterMeta = {
                                ...openRouterMeta,
                                usage: {
                                    ...json.usage,
                                    reasoning_tokens: json.usage.completion_tokens_details?.reasoning_tokens
                                },
                            }
                        }
                    } catch {
                        // 忽略解析错误
                    }
                }
            }
        }

        if (accumulatedReasoning && !reasoningComplete) {
            onChunk(`<think>${accumulatedReasoning}</think>`)
        }

        if (accumulatedToolCalls.length) {
            onChunk(serializeToolCalls(accumulatedToolCalls))
        }

        if (onMetadata) {
            const totalDuration = Date.now() - requestStartTime

            if (provider === PROVIDERS.OPENROUTER) {
                onMetadata({
                    firstTokenLatency,
                    totalDuration,
                    provider: null,
                    ...openRouterMeta,
                })

                if (generationId) {
                    setTimeout(async () => {
                        try {
                            for (let attempt = 0; attempt < 5; attempt++) {
                                const genResponse = await fetch(`${baseUrl}/generation?id=${generationId}`, {
                                    headers: { 'Authorization': `Bearer ${apiKey}` }
                                })
                                if (genResponse.ok) {
                                    const genData = await genResponse.json()
                                    if (genData.data?.provider_name) {
                                        onMetadata({
                                            firstTokenLatency,
                                            totalDuration,
                                            provider: genData.data.provider_name,
                                            nativeTokens: {
                                                prompt: genData.data.native_tokens_prompt,
                                                completion: genData.data.native_tokens_completion,
                                            },
                                            totalCost: genData.data.total_cost,
                                            ...openRouterMeta,
                                        })
                                        return
                                    }
                                }
                                await new Promise(r => setTimeout(r, 2000))
                            }
                        } catch {
                            // 忽略 generation 查询失败
                        }
                    }, 2000)
                }
            } else {
                onMetadata({
                    firstTokenLatency,
                    totalDuration,
                    provider,
                    ...openRouterMeta,
                })
            }
        }

        onComplete()
    } catch (error) {
        onError(error)
    }
}

/**
 * 处理单个 API 请求（流式输出）
 */
export async function streamRequest(params, onChunk, onComplete, onError, onMetadata) {
    const {
        provider,
        systemPrompt,
        userPrompt,
    } = params

    if (!systemPrompt && !userPrompt) {
        onError(new Error('请至少输入 System Prompt 或 User Prompt'))
        return
    }

    if (isVertexProvider(provider)) {
        await streamVertexRequest(params, onChunk, onComplete, onError, onMetadata)
        return
    }

    await streamOpenAiCompatibleRequest(params, onChunk, onComplete, onError, onMetadata)
}
