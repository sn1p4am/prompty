import { useCallback, useRef, useState } from 'react'
import { generateImage } from '../services/imageGenerationClient'

function createJobId() {
    return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function normalizeInteger(value, fallback, min, max) {
    const parsedValue = parseInt(value, 10)
    if (Number.isNaN(parsedValue)) {
        return fallback
    }

    return Math.min(max, Math.max(min, parsedValue))
}

export function useImageGenerationBatch({ onToast } = {}) {
    const [jobs, setJobs] = useState([])
    const [isRunning, setIsRunning] = useState(false)
    const [progress, setProgress] = useState(0)
    const [stats, setStats] = useState({
        total: 0,
        success: 0,
        failed: 0,
        running: 0,
    })
    const abortControllersRef = useRef([])
    const stoppedRef = useRef(false)
    const runIdRef = useRef(0)

    const startBatch = useCallback(async ({
        provider,
        apiKey,
        model,
        settings,
        batchCount = 1,
        concurrency = 1,
        interval = 0,
    }) => {
        if (isRunning) {
            onToast?.('图像生成任务正在运行')
            return
        }

        if (!String(settings.prompt || '').trim()) {
            onToast?.('请填写图像提示词')
            return
        }

        if (!String(apiKey || '').trim()) {
            onToast?.('请填写 API Key')
            return
        }

        if (!String(model || '').trim()) {
            onToast?.('请填写模型 ID')
            return
        }

        const total = normalizeInteger(batchCount, 1, 1, 50)
        const maxConcurrency = normalizeInteger(concurrency, 1, 1, 5)
        const requestInterval = normalizeInteger(interval, 0, 0, 60000)
        const nextJobs = Array.from({ length: total }, (_, index) => ({
            id: createJobId(),
            index,
            provider,
            model,
            status: 'pending',
            images: [],
            seed: null,
            error: null,
            duration: null,
            requestId: null,
            prompt: settings.prompt,
            hasNsfwConcepts: [],
            clientTimings: null,
            completedAt: null,
            timings: null,
        }))

        const runId = runIdRef.current + 1
        runIdRef.current = runId
        stoppedRef.current = false
        abortControllersRef.current = []
        setJobs(nextJobs)
        setProgress(0)
        setStats({ total, success: 0, failed: 0, running: 0 })
        setIsRunning(true)

        let queueIndex = 0
        let completed = 0
        let activeCount = 0

        await new Promise(resolve => {
            const finalizeJob = (jobId, status, patch = {}) => {
                const isCurrentRun = runIdRef.current === runId
                completed += 1
                activeCount -= 1

                if (isCurrentRun) {
                    setJobs(prev => prev.map(job =>
                        job.id === jobId ? { ...job, status, ...patch } : job
                    ))
                    setStats(prev => ({
                        ...prev,
                        running: Math.max(0, prev.running - 1),
                        success: prev.success + (status === 'success' ? 1 : 0),
                        failed: prev.failed + (status === 'failed' ? 1 : 0),
                    }))
                    setProgress(Math.round((completed / total) * 100))
                }

                if (completed >= total || stoppedRef.current || !isCurrentRun) {
                    if (activeCount <= 0) {
                        resolve()
                    }
                    return
                }

                window.setTimeout(runNext, requestInterval)
            }

            const runNext = () => {
                if (runIdRef.current !== runId) {
                    resolve()
                    return
                }

                if (stoppedRef.current) {
                    if (activeCount <= 0) {
                        resolve()
                    }
                    return
                }

                while (activeCount < maxConcurrency && queueIndex < nextJobs.length) {
                    const job = nextJobs[queueIndex]
                    queueIndex += 1
                    activeCount += 1

                    const abortController = new AbortController()
                    abortControllersRef.current.push(abortController)

                    setJobs(prev => prev.map(item =>
                        item.id === job.id ? { ...item, status: 'running' } : item
                    ))
                    setStats(prev => ({ ...prev, running: prev.running + 1 }))

                    generateImage({
                        provider,
                        apiKey,
                        model,
                        settings,
                        signal: abortController.signal,
                    })
                        .then(result => {
                            if (stoppedRef.current) {
                                finalizeJob(job.id, 'failed', { error: '任务已停止' })
                                return
                            }

                            finalizeJob(job.id, 'success', {
                                images: result.images,
                                seed: result.seed,
                                duration: result.duration,
                                requestId: result.requestId,
                                prompt: result.prompt,
                                hasNsfwConcepts: result.hasNsfwConcepts,
                                clientTimings: result.clientTimings,
                                completedAt: result.completedAt,
                                timings: result.timings,
                            })
                        })
                        .catch(error => {
                            const message = error.name === 'AbortError' ? '任务已停止' : error.message
                            finalizeJob(job.id, 'failed', { error: message })
                        })
                }

                if (queueIndex >= nextJobs.length && activeCount <= 0) {
                    resolve()
                }
            }

            runNext()
        })

        if (runIdRef.current === runId) {
            setIsRunning(false)
            abortControllersRef.current = []
        }
    }, [isRunning, onToast])

    const stopBatch = useCallback(() => {
        stoppedRef.current = true
        runIdRef.current += 1
        abortControllersRef.current.forEach(controller => controller.abort())
        abortControllersRef.current = []
        setIsRunning(false)
        setJobs(prev => prev.map(job =>
            job.status === 'pending' || job.status === 'running'
                ? { ...job, status: 'failed', error: '任务已停止' }
                : job
        ))
        setStats(prev => ({
            ...prev,
            running: 0,
            failed: prev.failed + prev.running + jobs.filter(job => job.status === 'pending').length,
        }))
        if (jobs.length > 0) {
            setProgress(100)
        }
        onToast?.('已停止图像生成任务')
    }, [jobs, onToast])

    const clearJobs = useCallback(() => {
        setJobs([])
        setProgress(0)
        setStats({ total: 0, success: 0, failed: 0, running: 0 })
    }, [])

    return {
        jobs,
        isRunning,
        progress,
        stats,
        startBatch,
        stopBatch,
        clearJobs,
    }
}
