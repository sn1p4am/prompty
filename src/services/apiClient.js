import { PROVIDERS, PROVIDER_INFO, DEFAULT_CONFIG } from '../constants/providers'

/**
 * 处理单个 API 请求（流式输出）
 * @param {Object} params - 请求参数
 * @param {Function} onChunk - 接收数据块的回调
 * @param {Function} onComplete - 完成回调
 * @param {Function} onError - 错误回调
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
}, onChunk, onComplete, onError) {

    try {
        // 构建 messages 数组
        const messages = []
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt })
        }
        if (userPrompt) {
            messages.push({ role: 'user', content: userPrompt })
        }

        if (messages.length === 0) {
            throw new Error('请至少输入 System Prompt 或 User Prompt')
        }

        // 构建请求体
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
            // 火山引擎和阿里百炼需要 stream_options
            ...((provider === PROVIDERS.VOLCENGINE || provider === PROVIDERS.ALIBAILIAN) && streamMode && {
                stream_options: {
                    include_usage: true,
                    chunk_include_usage: false
                }
            })
        }

        // 构建请求头（使用 ASCII 字符避免编码错误）
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://prompt-tester.app',
            'X-Title': 'Prompt Tester'
        }

        // 发起请求
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        })

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
            const content = data.choices?.[0]?.message?.content || ''
            onChunk(content)
            onComplete()
            return
        }

        // 流式模式处理
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

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
                        if (content) {
                            onChunk(content)
                        }
                    } catch (err) {
                        // 忽略解析错误
                    }
                }
            }
        }

        onComplete()

    } catch (error) {
        onError(error)
    }
}
