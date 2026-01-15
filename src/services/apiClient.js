import { PROVIDERS, PROVIDER_INFO, DEFAULT_CONFIG } from '../constants/providers'

/**
 * 构建火山方舟专用的请求体格式
 * 火山方舟使用 input 而不是 messages，格式完全不同
 */
function buildVolcengineRequestBody({ model, systemPrompt, userPrompt, streamMode, temperature, topP, maxTokens, enableThinking }) {
    // 火山方舟的 input 格式
    const input = []

    // 合并 system 和 user prompt（火山方舟不支持 system role）
    let combinedText = ''
    if (systemPrompt) {
        combinedText += systemPrompt + '\n\n'
    }
    if (userPrompt) {
        combinedText += userPrompt
    }

    if (combinedText) {
        input.push({
            role: 'user',
            content: [
                {
                    type: 'input_text',
                    text: combinedText
                }
            ]
        })
    }

    const requestBody = {
        model,
        stream: streamMode,
        input,
        // 火山方舟的 thinking 参数格式
        thinking: {
            type: enableThinking ? 'enabled' : 'disabled'
        }
    }

    // 可选参数
    if (maxTokens) {
        requestBody.max_tokens = parseInt(maxTokens)
    }
    if (temperature !== undefined) {
        requestBody.temperature = temperature
    }
    if (topP !== undefined) {
        requestBody.top_p = topP
    }

    return requestBody
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
}, onChunk, onComplete, onError, onMetadata) {

    try {
        // 验证输入
        if (!systemPrompt && !userPrompt) {
            throw new Error('请至少输入 System Prompt 或 User Prompt')
        }

        // 根据不同 provider 构建请求体
        let requestBody
        let endpoint = '/chat/completions' // 默认端点

        if (provider === PROVIDERS.VOLCENGINE) {
            // 火山方舟使用特殊格式
            requestBody = buildVolcengineRequestBody({
                model, systemPrompt, userPrompt, streamMode,
                temperature, topP, maxTokens, enableThinking
            })
            endpoint = '/responses' // 火山方舟专用端点
        } else {
            // OpenRouter 和阿里百炼使用标准 OpenAI 格式
            const messages = []
            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt })
            }
            if (userPrompt) {
                messages.push({ role: 'user', content: userPrompt })
            }

            requestBody = {
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
                // 阿里百炼的 thinking 参数
                ...(provider === PROVIDERS.ALIBAILIAN && {
                    enable_thinking: enableThinking
                }),
                // 阿里百炼需要 stream_options
                ...(provider === PROVIDERS.ALIBAILIAN && streamMode && {
                    stream_options: {
                        include_usage: true,
                        chunk_include_usage: false
                    }
                })
            }
        }

        // 构建请求头
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        }

        // 只为 OpenRouter 添加自定义请求头
        if (provider === PROVIDERS.OPENROUTER) {
            headers['HTTP-Referer'] = 'https://prompt-tester.app'
            headers['X-Title'] = 'Prompt Tester'
        }

        // 记录请求开始时间（用于计算首字延迟）
        const requestStartTime = Date.now()

        // 发起请求（使用动态端点）
        const response = await fetch(`${baseUrl}${endpoint}`, {
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

            // 根据不同 provider 解析内容
            let content = ''
            if (provider === PROVIDERS.VOLCENGINE) {
                // 火山方舟的响应格式
                content = data.output?.choices?.[0]?.message?.content ||
                         data.choices?.[0]?.message?.content || ''
            } else {
                // OpenRouter 和阿里百炼使用标准 OpenAI 格式
                content = data.choices?.[0]?.message?.content || ''
            }

            onChunk(content)
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

                        // 根据不同 provider 解析内容
                        let content = null

                        if (provider === PROVIDERS.VOLCENGINE) {
                            // 火山方舟的响应格式：output.choices[0].message.content
                            content = json.output?.choices?.[0]?.message?.content ||
                                     json.choices?.[0]?.message?.content ||
                                     json.choices?.[0]?.delta?.content
                        } else {
                            // OpenRouter 和阿里百炼使用标准 OpenAI 格式
                            content = json.choices?.[0]?.delta?.content
                        }

                        // Track first token latency (from request start, not response start)
                        if (content && !firstTokenReceived) {
                            firstTokenReceived = true
                            firstTokenLatency = Date.now() - requestStartTime
                        }

                        if (content) {
                            onChunk(content)
                        }

                        // Capture generation ID from first chunk (for later /generation call)
                        if (provider === PROVIDERS.OPENROUTER && !generationId && json.id) {
                            generationId = json.id
                        }

                        // Extract OpenRouter specific metadata (usually in the last chunk with usage)
                        if (provider === PROVIDERS.OPENROUTER) {
                            if (json.usage) {
                                openRouterMeta = {
                                    ...openRouterMeta,
                                    usage: json.usage,
                                }
                            }
                        }
                    } catch (err) {
                        // 忽略解析错误
                    }
                }
            }
        }

        // Pass initial metadata, then try to fetch real provider info asynchronously
        if (onMetadata && provider === PROVIDERS.OPENROUTER) {
            const totalDuration = Date.now() - requestStartTime

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
        }

        onComplete()

    } catch (error) {
        onError(error)
    }
}
