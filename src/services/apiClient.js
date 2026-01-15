import { PROVIDERS, PROVIDER_INFO, DEFAULT_CONFIG } from '../constants/providers'

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

        const requestBody = {
            model,
            messages,
            stream: streamMode,
            temperature,
            top_p: topP,
            // 可选的 max_tokens
            ...(maxTokens && { max_tokens: parseInt(maxTokens) }),
            // OpenRouter 需要 usage accounting
            ...(provider === PROVIDERS.OPENROUTER && {
                usage: { include: true }
            }),
            // 火山方舟的 thinking 参数
            ...(provider === PROVIDERS.VOLCENGINE && {
                thinking: { type: enableThinking ? 'enabled' : 'disabled' }
            }),
            // 阿里百炼的 enable_thinking 参数
            ...(provider === PROVIDERS.ALIBAILIAN && {
                enable_thinking: enableThinking
            }),
            // 火山引擎和阿里百炼需要 stream_options（流式模式下）
            ...((provider === PROVIDERS.VOLCENGINE || provider === PROVIDERS.ALIBAILIAN) && streamMode && {
                stream_options: {
                    include_usage: true,
                    chunk_include_usage: false
                }
            })
        }

        // 构建请求头
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://prompt-tester.app',
            'X-Title': 'Prompt Tester'
        }

        // 记录请求开始时间（用于计算首字延迟）
        const requestStartTime = Date.now()

        // 所有 provider 统一使用 /chat/completions 端点
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        })

        // 从响应头提取 OpenRouter provider 信息
        let headerProvider = null
        if (provider === PROVIDERS.OPENROUTER) {
            headerProvider = response.headers.get('x-openrouter-provider')
        }

        if (!response.ok) {
            const errorText = await response.text()
            let errorMessage = `HTTP ${response.status}`

            try {
                const errorData = JSON.parse(errorText)
                if (errorData.error?.message) {
                    errorMessage = errorData.error.message
                }
                // 提供用户友好的错误提示
                if (response.status === 404) {
                    errorMessage = `模型 "${model}" 不存在或不可用`
                } else if (response.status === 401) {
                    errorMessage = 'API Key 无效或已过期'
                } else if (response.status === 402) {
                    errorMessage = '账户余额不足'
                } else if (response.status === 429) {
                    errorMessage = '请求频率过高，请降低并发数'
                }
            } catch (e) {
                errorMessage = errorText || response.statusText
            }

            throw new Error(errorMessage)
        }

        // 非流式模式
        if (!streamMode) {
            const data = await response.json()

            // 提取内容和思维链
            const content = data.choices?.[0]?.message?.content || ''
            const reasoningContent = data.choices?.[0]?.message?.reasoning_content || ''

            // 合并内容：如果有思维链，包装在 <think> 标签中
            let mergedContent = ''
            if (reasoningContent) {
                mergedContent += `<think>${reasoningContent}</think>`
            }
            if (content) {
                mergedContent += content
            }

            onChunk(mergedContent)
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

                        // 合并内容：如果有思维链，包装在 <think> 标签中
                        let mergedContent = ''
                        if (reasoningContent) {
                            mergedContent += `<think>${reasoningContent}</think>`
                        }
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
                    } catch (err) {
                        // 忽略解析错误
                    }
                }
            }
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
                        } catch (e) {
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
