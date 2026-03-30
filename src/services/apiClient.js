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
    if (style === 'vertex_google_thinking') {
        return {
            extra_body: {
                google: {
                    thinking_config: enableThinking
                        ? { include_thoughts: true }
                        : { thinking_budget: 0 },
                    thought_tag_marker: 'think',
                }
            }
        }
    }

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

function buildVertexRequestPayload(vertexOptions = {}) {
    const payload = {}
    const responseFormatType = vertexOptions.responseFormat?.type

    if (vertexOptions.reasoningEffort) {
        payload.reasoning_effort = vertexOptions.reasoningEffort
    }

    if (responseFormatType === 'json_schema') {
        payload.response_format = {
            type: 'json_schema',
            json_schema: {
                name: vertexOptions.responseFormat.schemaName,
                schema: vertexOptions.responseFormat.schema,
                strict: vertexOptions.responseFormat.strict,
            }
        }
    } else if (responseFormatType === 'custom_mime') {
        payload.response_format = {
            type: vertexOptions.responseFormat.customMimeType
        }
    } else if (responseFormatType) {
        payload.response_format = {
            type: responseFormatType
        }
    }

    if (vertexOptions.tools?.length) {
        payload.tools = vertexOptions.tools
        payload.parallel_tool_calls = vertexOptions.parallelToolCalls
    }

    if (vertexOptions.toolChoice && (vertexOptions.tools?.length || vertexOptions.webSearchEnabled || vertexOptions.toolChoice !== 'auto')) {
        payload.tool_choice = vertexOptions.toolChoice
    }

    if (vertexOptions.webSearchEnabled) {
        payload.web_search_options = {}
    }

    return payload
}

function getThinkingPayloadVariants(provider, model, enableThinking, vertexOptions) {
    if (provider === PROVIDERS.VOLCENGINE) {
        return [buildThinkingPayload('thinking_object', enableThinking)]
    }

    if (provider === PROVIDERS.ALIBAILIAN) {
        return [buildThinkingPayload('enable_thinking', enableThinking)]
    }

    if (isVertexProvider(provider)) {
        if (vertexOptions?.reasoningEffort) {
            return [{}]
        }
        return [buildThinkingPayload('vertex_google_thinking', enableThinking)]
    }

    // AiOnly / AiIIOnly 没有公开文档说明 thinking 参数格式，
    // 这里按常见兼容协议做有限重试，优先级由模型家族决定。
    if (isAionlyCompatibleProvider(provider) && enableThinking) {
        const orderedStyles = prefersEnableThinking(model)
            ? ['enable_thinking', 'thinking_object']
            : ['thinking_object', 'enable_thinking']

        return orderedStyles.map(style => buildThinkingPayload(style, enableThinking))
    }

    return [{}]
}

function buildRequestBody({
    provider,
    model,
    messages,
    streamMode,
    temperature,
    topP,
    maxTokens,
    vertexOptions,
    thinkingPayload = {},
}) {
    const normalizedMaxTokens = maxTokens ? parseInt(maxTokens) : null
    const vertexPayload = isVertexProvider(provider) ? buildVertexRequestPayload(vertexOptions) : null
    const streamOptions = (
        provider === PROVIDERS.VOLCENGINE || provider === PROVIDERS.ALIBAILIAN
            ? {
                include_usage: true,
                chunk_include_usage: false
            }
            : isVertexProvider(provider)
                ? {
                    include_usage: true
                }
                : null
    )

    return {
        model,
        messages,
        stream: streamMode,
        temperature,
        top_p: topP,
        // Vertex OpenAI 兼容层使用 max_completion_tokens，其它兼容渠道沿用 max_tokens
        ...(normalizedMaxTokens && (
            isVertexProvider(provider)
                ? { max_completion_tokens: normalizedMaxTokens }
                : { max_tokens: normalizedMaxTokens }
        )),
        // OpenRouter 需要 usage accounting
        ...(provider === PROVIDERS.OPENROUTER && {
            usage: { include: true }
        }),
        ...(vertexPayload || {}),
        // 供应商特定的 thinking 参数
        ...thinkingPayload,
        // 火山引擎、阿里百炼和 Vertex 在流式模式下支持 usage 回传
        ...(streamMode && streamOptions && {
            stream_options: streamOptions
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

        // 提供用户友好的错误提示
        if (response.status === 404) {
            errorMessage = `模型 "${model}" 不存在或不可用`
        } else if (response.status === 401) {
            errorMessage = isVertexProvider(provider)
                ? 'Access Token 无效或已过期'
                : 'API Key 无效或已过期'
        } else if (response.status === 402) {
            errorMessage = '账户余额不足'
        } else if (response.status === 429) {
            errorMessage = '请求频率过高，请降低并发数'
        } else if (response.status === 403 && isVertexProvider(provider)) {
            errorMessage = 'Vertex AI 拒绝访问，请确认 Access Token、IAM 权限和 Vertex AI API 已启用'
        } else if (response.status === 400 && isVertexProvider(provider)) {
            errorMessage = errorData.error?.message || 'Vertex AI 请求参数无效，请检查 Project ID、Location、模型 ID 和 Thinking 配置'
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

/**
 * 处理单个 API 请求（流式输出）
 * @param {Object} params - 请求参数
 * @param {Function} onChunk - 接收数据块的回调
 * @param {Function} onComplete - 完成回调
 * @param {Function} onError - 错误回调
 * @param {Function} onMetadata - 接收元数据的回调 (optional, for OpenRouter)
 */
export async function streamRequest({
    provider,
    apiKey,
    baseUrl,
    model,
    systemPrompt,
    userPrompt,
    temperature = 1,
    topP = 1,
    maxTokens,
    streamMode = true,
    enableThinking = false,
    vertexOptions = null,
}, onChunk, onComplete, onError, onMetadata) {

    try {
        // 验证输入
        if (!systemPrompt && !userPrompt) {
            throw new Error('请至少输入 System Prompt 或 User Prompt')
        }

        // 所有 provider 统一使用标准 OpenAI 格式
        const messages = []
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt })
        }
        if (userPrompt) {
            messages.push({ role: 'user', content: userPrompt })
        }

        // 构建请求头
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            // OpenRouter 专用头，其他供应商不发送（避免 CORS 预检失败）
            ...(provider === PROVIDERS.OPENROUTER && {
                'HTTP-Referer': 'https://prompt-tester.app',
                'X-Title': 'Prompt Tester'
            })
        }

        const requestBodyVariants = getThinkingPayloadVariants(provider, model, enableThinking, vertexOptions)
            .map(thinkingPayload => buildRequestBody({
                provider,
                model,
                messages,
                streamMode,
                temperature,
                topP,
                maxTokens,
                vertexOptions,
                thinkingPayload,
            }))

        let response = null
        let lastErrorMessage = null
        let requestStartTime = Date.now()

        for (let index = 0; index < requestBodyVariants.length; index++) {
            const requestBody = requestBodyVariants[index]
            requestStartTime = Date.now()

            // 所有 provider 统一使用 /chat/completions 端点
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

        // 非流式模式
        if (!streamMode) {
            const data = await response.json()

            // 提取内容和思维链
            const content = data.choices?.[0]?.message?.content || ''
            const reasoningContent = data.choices?.[0]?.message?.reasoning_content || ''
            const toolCalls = data.choices?.[0]?.message?.tool_calls || []

            // 合并内容：如果有思维链，包装在 <think> 标签中
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

        // 流式模式处理
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let firstTokenReceived = false
        let firstTokenLatency = null
        let openRouterMeta = null
        let generationId = null
        // 累积 reasoning 内容，避免分词
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

                        // 提取内容和思维链
                        const content = json.choices?.[0]?.delta?.content
                        const reasoningContent = json.choices?.[0]?.delta?.reasoning_content
                        const toolCalls = json.choices?.[0]?.delta?.tool_calls

                        let mergedContent = ''

                        // 累积 reasoning 内容
                        if (reasoningContent) {
                            accumulatedReasoning += reasoningContent
                        }

                        if (toolCalls?.length) {
                            mergeToolCallDelta(accumulatedToolCalls, toolCalls)
                        }

                        // 当开始接收 content 时，先发送完整的 reasoning（如果有）
                        if (content && !reasoningComplete && accumulatedReasoning) {
                            mergedContent += `<think>${accumulatedReasoning}</think>`
                            reasoningComplete = true
                        }

                        // 添加正常内容
                        if (content) {
                            mergedContent += content
                        }

                        // Track first token latency (from request start, not response start)
                        if (mergedContent && !firstTokenReceived) {
                            firstTokenReceived = true
                            firstTokenLatency = Date.now() - requestStartTime
                        }

                        if (mergedContent) {
                            onChunk(mergedContent)
                        }

                        // Capture generation ID from first chunk (for later /generation call)
                        if (provider === PROVIDERS.OPENROUTER && !generationId && json.id) {
                            generationId = json.id
                        }

                        // Extract metadata (usage info) for all providers
                        if (json.usage) {
                            openRouterMeta = {
                                ...openRouterMeta,
                                usage: {
                                    ...json.usage,
                                    // 提取 reasoning_tokens（如果有）
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

        // 如果流结束时还有未发送的 reasoning 内容，发送它
        if (accumulatedReasoning && !reasoningComplete) {
            onChunk(`<think>${accumulatedReasoning}</think>`)
        }

        if (accumulatedToolCalls.length) {
            onChunk(serializeToolCalls(accumulatedToolCalls))
        }

        // Pass metadata for all providers
        if (onMetadata) {
            const totalDuration = Date.now() - requestStartTime

            // For OpenRouter, fetch additional provider info asynchronously
            if (provider === PROVIDERS.OPENROUTER) {
                // First, pass what we have immediately
                onMetadata({
                    firstTokenLatency,
                    totalDuration,
                    provider: null, // Will be updated later
                    ...openRouterMeta,
                })

                // Then, try to fetch real provider info with a delay (async, non-blocking)
                if (generationId) {
                    setTimeout(async () => {
                        try {
                            // Retry up to 5 times with 2s delay between each
                            // Generation records may take a few seconds to be available
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
                                        return // Success, exit the function
                                    }
                                }
                                // Wait 2s before retry (for 404 or missing data)
                                await new Promise(r => setTimeout(r, 2000))
                            }
                        } catch {
                            // Silently fail - generation API is optional enhancement
                        }
                    }, 2000) // Initial 2s delay before first attempt (wait for OpenRouter to process)
                }
            } else {
                // For other providers (Volcengine, Alibailian), pass basic metadata
                onMetadata({
                    firstTokenLatency,
                    totalDuration,
                    provider: provider, // Use the provider name directly
                    ...openRouterMeta,
                })
            }
        }

        onComplete()

    } catch (error) {
        onError(error)
    }
}
