import { useCallback, useMemo, useRef, useState } from 'react'
import { calculateCacheSummary, normalizeCacheHitSettings, runCacheHitTest } from '../services/cacheHitClient'

export function useCacheHitTest({ onToast } = {}) {
    const [results, setResults] = useState([])
    const [isRunning, setIsRunning] = useState(false)
    const [progress, setProgress] = useState(0)
    const [cacheResource, setCacheResource] = useState('')
    const [error, setError] = useState('')
    const abortControllerRef = useRef(null)

    const summary = useMemo(() => calculateCacheSummary(results), [results])

    const start = useCallback(async (settings) => {
        if (isRunning) {
            onToast?.('缓存命中测试正在运行')
            return
        }

        const abortController = new AbortController()
        abortControllerRef.current = abortController
        setResults([])
        setProgress(0)
        setError('')
        setCacheResource('')
        setIsRunning(true)
        const normalizedSettings = normalizeCacheHitSettings(settings)

        try {
            await runCacheHitTest(
                {
                    ...settings,
                    signal: abortController.signal,
                },
                {
                    onCacheCreated: (resourceName) => {
                        setCacheResource(resourceName)
                    },
                    onRoundStart: (index, dynamicPrompt) => {
                        setResults(prev => [
                            ...prev,
                            {
                                id: `cache_round_${index + 1}`,
                                index,
                                round: index + 1,
                                status: 'running',
                                dynamicPrompt,
                                durationMs: 0,
                            },
                        ])
                    },
                    onRoundComplete: (result) => {
                        setResults(prev => prev.map(item => (
                            item.index === result.index ? result : item
                        )))
                        setProgress(Math.round(((result.index + 1) / normalizedSettings.rounds) * 100))
                    },
                }
            )
            onToast?.('缓存命中测试完成')
        } catch (runError) {
            const message = runError.name === 'AbortError'
                ? '测试已停止'
                : runError.message || '缓存命中测试失败'

            setError(message)
            setResults(prev => prev.map(item => (
                item.status === 'running'
                    ? { ...item, status: 'failed', error: message }
                    : item
            )))
            if (runError.name === 'AbortError') {
                onToast?.('缓存命中测试已停止')
            } else {
                onToast?.(message)
            }
        } finally {
            abortControllerRef.current = null
            setIsRunning(false)
            setCacheResource('')
        }
    }, [isRunning, onToast])

    const stop = useCallback(() => {
        abortControllerRef.current?.abort()
    }, [])

    const clear = useCallback(() => {
        setResults([])
        setProgress(0)
        setError('')
        setCacheResource('')
    }, [])

    return {
        results,
        summary,
        isRunning,
        progress,
        cacheResource,
        error,
        start,
        stop,
        clear,
    }
}
