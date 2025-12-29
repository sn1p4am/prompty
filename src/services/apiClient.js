import { PROVIDERS } from '../constants/providers'

/**
 * API 请求客户端
 * 支持多种 LLM 供应商的流式请求
 */

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
    prompt,
    temperature = 0.7,
    topP = 1,
    maxTokens = 2048,
}, onChunk, onComplete, onError) {

    try {
        let url, headers, body

        // 根据不同供应商构造请求
        switch (provider) {
            case PROVIDERS.OPENAI:
            case PROVIDERS.GROQ:
            case PROVIDERS.DEEPSEEK:
            case PROVIDERS.OPENROUTER:
                url = `${baseUrl}/chat/completions`
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                }
                body = {
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature,
                    top_p: topP,
                    max_tokens: maxTokens,
                    stream: true,
                }
                break

            case PROVIDERS.ANTHROPIC:
                url = `${baseUrl}/messages`
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                }
                body = {
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature,
                    top_p: topP,
                    max_tokens: maxTokens,
                    stream: true,
                }
                break

            case PROVIDERS.GOOGLE:
                url = `${baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}`
                headers = {
                    'Content-Type': 'application/json',
                }
                body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature,
                        topP,
                        maxOutputTokens: maxTokens,
                    },
                }
                break

            default:
                throw new Error(`不支持的供应商: ${provider}`)
        }

        // 发起请求
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`API 请求失败 (${response.status}): ${errorText}`)
        }

        // 处理流式响应
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
                        const content = extractContent(provider, json)
                        if (content) {
                            onChunk(content)
                        }
                    } catch (err) {
                        console.error('解析流数据失败:', err, line)
                    }
                }
            }
        }

        onComplete()

    } catch (error) {
        onError(error)
    }
}

/**
 * 从响应中提取内容
 */
function extractContent(provider, data) {
    try {
        switch (provider) {
            case PROVIDERS.OPENAI:
            case PROVIDERS.GROQ:
            case PROVIDERS.DEEPSEEK:
            case PROVIDERS.OPENROUTER:
                return data.choices?.[0]?.delta?.content || ''

            case PROVIDERS.ANTHROPIC:
                if (data.type === 'content_block_delta') {
                    return data.delta?.text || ''
                }
                return ''

            case PROVIDERS.GOOGLE:
                return data.candidates?.[0]?.content?.parts?.[0]?.text || ''

            default:
                return ''
        }
    } catch (err) {
        console.error('提取内容失败:', err)
        return ''
    }
}
