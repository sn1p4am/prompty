import { useState, useCallback, useRef } from 'react'
import { streamRequest } from '../services/apiClient'
import { generateId } from '../utils/htmlExtractor'

/**
 * 自定义 Hook：批量测试引擎
 */
export function useBatchTest({ apiConfig, onToast }) {
    const [results, setResults] = useState([])
    const [stats, setStats] = useState({
        success: 0,
        failed: 0,
        running: 0,
    })
    const [isRunning, setIsRunning] = useState(false)
    const abortControllersRef = useRef([])

    // 开始批量测试
    const startBatchTest = useCallback(async ({
        prompt,
        models,
        temperature,
        topP,
        maxTokens,
        concurrency = 3,
        interval = 500,
    }) => {
        if (!prompt || !models || models.length === 0) {
            onToast('请输入提示词并选择至少一个模型')
            return
        }

        const apiKey = apiConfig.getApiKey()
        if (!apiKey) {
            onToast('请先配置 API Key')
            return
        }

        // 重置状态
        setResults([])
        setStats({ success: 0, failed: 0, running: 0 })
        setIsRunning(true)
        abortControllersRef.current = []

        // 创建请求列表
        const requests = models.map(model => ({
            id: generateId(),
            model,
            prompt,
            temperature,
            topP,
            maxTokens,
            content: '',
            status: 'pending', // pending | running | success | failed
            error: null,
        }))

        setResults(requests)

        // 并发控制队列
        const queue = [...requests]
        let activeCount = 0

        const processNext = async () => {
            if (queue.length === 0) {
                if (activeCount === 0) {
                    setIsRunning(false)
                }
                return
            }

            const request = queue.shift()
            activeCount++

            // 更新状态为 running
            setResults(prev => prev.map(r =>
                r.id === request.id ? { ...r, status: 'running' } : r
            ))
            setStats(prev => ({ ...prev, running: prev.running + 1 }))

            try {
                await streamRequest(
                    {
                        provider: apiConfig.currentProvider,
                        apiKey: apiConfig.getApiKey(),
                        baseUrl: apiConfig.getBaseUrl(),
                        model: request.model,
                        prompt: request.prompt,
                        temperature: request.temperature,
                        topP: request.topP,
                        maxTokens: request.maxTokens,
                    },
                    // onChunk
                    (chunk) => {
                        setResults(prev => prev.map(r =>
                            r.id === request.id
                                ? { ...r, content: r.content + chunk }
                                : r
                        ))
                    },
                    // onComplete
                    () => {
                        setResults(prev => prev.map(r =>
                            r.id === request.id ? { ...r, status: 'success' } : r
                        ))
                        setStats(prev => ({
                            success: prev.success + 1,
                            failed: prev.failed,
                            running: prev.running - 1,
                        }))
                        activeCount--
                        setTimeout(processNext, interval)
                    },
                    // onError
                    (error) => {
                        setResults(prev => prev.map(r =>
                            r.id === request.id
                                ? { ...r, status: 'failed', error: error.message }
                                : r
                        ))
                        setStats(prev => ({
                            success: prev.success,
                            failed: prev.failed + 1,
                            running: prev.running - 1,
                        }))
                        activeCount--
                        setTimeout(processNext, interval)
                    }
                )
            } catch (err) {
                console.error('请求失败:', err)
                activeCount--
                setTimeout(processNext, interval)
            }
        }

        // 启动并发请求
        for (let i = 0; i < Math.min(concurrency, requests.length); i++) {
            processNext()
        }
    }, [apiConfig, onToast])

    // 停止所有请求
    const stopAllRequests = useCallback(() => {
        abortControllersRef.current.forEach(controller => {
            try {
                controller.abort()
            } catch (err) {
                console.error('取消请求失败:', err)
            }
        })
        abortControllersRef.current = []
        setIsRunning(false)
        onToast('已停止所有请求')
    }, [onToast])

    // 清除结果
    const clearResults = useCallback(() => {
        setResults([])
        setStats({ success: 0, failed: 0, running: 0 })
    }, [])

    return {
        results,
        stats,
        isRunning,
        startBatchTest,
        stopAllRequests,
        clearResults,
    }
}
