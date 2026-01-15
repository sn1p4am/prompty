import { useState, useCallback, useRef } from 'react'
import { streamRequest } from '../services/apiClient'

/**
 * 生成唯一 ID
 */
function generateId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 自定义 Hook：批量测试引擎
 */
export function useBatchTest({ apiConfig, onToast }) {
    const [results, setResults] = useState([])
    const [stats, setStats] = useState({
        total: 0,
        success: 0,
        failed: 0,
        running: 0,
    })
    const [isRunning, setIsRunning] = useState(false)
    const [progress, setProgress] = useState(0)
    const abortRef = useRef(false)

    // 开始批量测试
    const startBatchTest = useCallback(async ({
        systemPrompt,
        userPrompt,
        model,
        batchSize = 5,
        temperature = 1,
        topP = 1,
        maxTokens,
        concurrency = 3,
        interval = 500,
        streamMode = true,
        enableThinking = false,
    }) => {
        // 验证
        if (!systemPrompt && !userPrompt) {
            onToast?.('请至少输入 System Prompt 或 User Prompt')
            return
        }

        if (!model) {
            onToast?.('请选择一个模型')
            return
        }

        const apiKey = apiConfig.getApiKey()
        if (!apiKey) {
            onToast?.('请先配置 API Key')
            return
        }

        // 重置状态
        abortRef.current = false
        setIsRunning(true)
        setProgress(0)
        setStats({ total: batchSize, success: 0, failed: 0, running: 0 })

        // 生成请求队列
        const requests = []
        for (let i = 0; i < batchSize; i++) {
            requests.push({
                id: generateId(),
                model,
                systemPrompt,
                userPrompt,
                temperature,
                topP,
                maxTokens,
                streamMode,
                enableThinking,
                content: '',
                status: 'pending',
                error: null,
                index: i,
                // OpenRouter specific metadata
                metadata: null,
                provider: apiConfig.currentProvider,
            })
        }

        setResults(requests)

        // 并发控制
        let queueIndex = 0
        let activeCount = 0
        let completed = 0

        const processNext = async () => {
            if (abortRef.current || queueIndex >= requests.length) return

            while (activeCount < concurrency && queueIndex < requests.length && !abortRef.current) {
                const request = requests[queueIndex++]
                activeCount++

                // 更新状态为 running
                setResults(prev => prev.map(r =>
                    r.id === request.id ? { ...r, status: 'running' } : r
                ))
                setStats(prev => ({ ...prev, running: prev.running + 1 }))

                // 处理请求
                streamRequest(
                    {
                        provider: apiConfig.currentProvider,
                        apiKey: apiConfig.getApiKey(),
                        baseUrl: apiConfig.getBaseUrl(),
                        model: request.model,
                        systemPrompt: request.systemPrompt,
                        userPrompt: request.userPrompt,
                        temperature: request.temperature,
                        topP: request.topP,
                        maxTokens: request.maxTokens,
                        streamMode: request.streamMode,
                        enableThinking: request.enableThinking,
                    },
                    // onChunk
                    (chunk) => {
                        if (abortRef.current) return
                        setResults(prev => prev.map(r =>
                            r.id === request.id
                                ? { ...r, content: r.content + chunk }
                                : r
                        ))
                    },
                    // onComplete
                    () => {
                        if (abortRef.current) return
                        setResults(prev => prev.map(r =>
                            r.id === request.id ? { ...r, status: 'success' } : r
                        ))
                        setStats(prev => ({
                            ...prev,
                            success: prev.success + 1,
                            running: prev.running - 1,
                        }))
                        activeCount--
                        completed++
                        setProgress(Math.round((completed / batchSize) * 100))

                        // 继续下一个
                        if (interval > 0) {
                            setTimeout(processNext, interval)
                        } else {
                            processNext()
                        }

                        // 检查是否全部完成
                        if (completed >= batchSize) {
                            setIsRunning(false)
                        }
                    },
                    // onError
                    (error) => {
                        if (abortRef.current) return
                        setResults(prev => prev.map(r =>
                            r.id === request.id
                                ? { ...r, status: 'failed', error: error.message }
                                : r
                        ))
                        setStats(prev => ({
                            ...prev,
                            failed: prev.failed + 1,
                            running: prev.running - 1,
                        }))
                        activeCount--
                        completed++
                        setProgress(Math.round((completed / batchSize) * 100))

                        // 继续下一个
                        if (interval > 0) {
                            setTimeout(processNext, interval)
                        } else {
                            processNext()
                        }

                        // 检查是否全部完成
                        if (completed >= batchSize) {
                            setIsRunning(false)
                        }
                    },
                    // onMetadata (for OpenRouter)
                    (metadata) => {
                        if (abortRef.current) return
                        setResults(prev => prev.map(r =>
                            r.id === request.id
                                ? { ...r, metadata }
                                : r
                        ))
                    }
                )

                // 间隔启动
                if (interval > 0 && activeCount < concurrency) {
                    await new Promise(resolve => setTimeout(resolve, interval))
                }
            }
        }

        // 启动处理
        processNext()
    }, [apiConfig, onToast])

    // 停止所有请求
    const stopAllRequests = useCallback(() => {
        abortRef.current = true
        setIsRunning(false)
        onToast?.('已停止所有请求')
    }, [onToast])

    // 清除结果
    const clearResults = useCallback(() => {
        setResults([])
        setStats({ total: 0, success: 0, failed: 0, running: 0 })
        setProgress(0)
    }, [])

    return {
        results,
        stats,
        isRunning,
        progress,
        startBatchTest,
        stopAllRequests,
        clearResults,
    }
}
