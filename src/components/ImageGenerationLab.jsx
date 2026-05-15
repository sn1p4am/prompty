import { useMemo, useState } from 'react'
import {
    Download,
    ExternalLink,
    Image,
    Images,
    Key,
    Loader2,
    Maximize2,
    Play,
    Trash2,
    X,
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useImageGenerationBatch } from '../hooks/useImageGenerationBatch'
import {
    DEFAULT_IMAGE_GENERATION_SETTINGS,
    FAL_IMAGE_SIZE_PRESETS,
    IMAGE_GENERATION_SETTINGS_VERSION,
    IMAGE_GENERATION_PROVIDER_INFO,
    IMAGE_GENERATION_PROVIDERS,
    IMAGE_GENERATION_STORAGE_KEYS,
    LEGACY_OPENAI_IMAGE_PROVIDER,
    TOGETHER_ASPECT_RATIO_PRESETS,
} from '../constants/imageGeneration'

const NUMBER_INPUT_CLASS = "h-9 text-xs font-mono"
const FIELD_LABEL_CLASS = "text-[11px] text-muted-foreground"

function mergeSettings(settings) {
    const normalizedProvider = settings?.provider === LEGACY_OPENAI_IMAGE_PROVIDER
        ? IMAGE_GENERATION_PROVIDERS.DEVART
        : settings?.provider
    const mergedSettings = {
        ...DEFAULT_IMAGE_GENERATION_SETTINGS,
        ...(settings || {}),
        provider: normalizedProvider || DEFAULT_IMAGE_GENERATION_SETTINGS.provider,
    }
    const providerInfo = IMAGE_GENERATION_PROVIDER_INFO[mergedSettings.provider]

    if (providerInfo?.modelLocked) {
        mergedSettings.model = providerInfo.defaultModel
    }

    if (!settings?.settingsVersion || settings.settingsVersion < IMAGE_GENERATION_SETTINGS_VERSION) {
        return {
            ...mergedSettings,
            settingsVersion: IMAGE_GENERATION_SETTINGS_VERSION,
            batchCount: DEFAULT_IMAGE_GENERATION_SETTINGS.batchCount,
        }
    }

    return mergedSettings
}

function toInt(value, fallback = 1) {
    const parsedValue = parseInt(value, 10)
    return Number.isNaN(parsedValue) ? fallback : parsedValue
}

function formatMs(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '-'
    }

    const numericValue = Number(value)
    if (numericValue > 0 && numericValue < 1) {
        return '<1ms'
    }

    if (numericValue >= 1000) {
        return `${(numericValue / 1000).toFixed(2)}s`
    }

    return `${Math.round(numericValue)}ms`
}

function formatTimingValue(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '-'
    }

    const numericValue = Number(value)
    return `${numericValue.toFixed(2)}s`
}

function formatServerTimingLabel(key) {
    const labels = {
        inference: '推理',
        queue: '排队',
        upload: '上传',
        download: '下载',
        total: '服务端',
    }

    return labels[key] || key
}

function getNow() {
    return globalThis.performance?.now ? globalThis.performance.now() : Date.now()
}

function formatCompletedAt(value) {
    if (!value) {
        return '-'
    }

    return new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(new Date(value))
}

function getImageSizeLabel(value) {
    const preset = FAL_IMAGE_SIZE_PRESETS.find(item => item.value === value)
    return preset?.label || value
}

function getOpenAIImageSizeLabel(value) {
    return value
}

function getProviderParameterTitle(provider) {
    const providerConfig = IMAGE_GENERATION_PROVIDER_INFO[provider]?.openaiCompatible
    if (providerConfig?.parameterTitle) {
        return providerConfig.parameterTitle
    }

    if (provider === IMAGE_GENERATION_PROVIDERS.TOGETHER) {
        return 'TOGETHER.PARAMETERS'
    }

    return 'FAL.PARAMETERS'
}

function getProviderImageCount(settings) {
    if (IMAGE_GENERATION_PROVIDER_INFO[settings.provider]?.openaiCompatible) {
        return settings.openaiNumImages
    }

    if (settings.provider === IMAGE_GENERATION_PROVIDERS.TOGETHER) {
        return settings.togetherNumImages
    }

    return settings.numImages
}

function getEstimatedImageCount(settings) {
    return {
        batchCount: Math.max(1, toInt(settings.batchCount, 1)),
        numImages: Math.max(1, toInt(getProviderImageCount(settings), 1)),
    }
}

function updateField(settings, field, value) {
    return {
        ...settings,
        [field]: value,
    }
}

function getOpenAICompatibleConfig(provider) {
    return IMAGE_GENERATION_PROVIDER_INFO[provider]?.openaiCompatible || null
}

function getOpenAICompatibleSizeLabel(provider, value) {
    const preset = getOpenAICompatibleConfig(provider)?.sizePresets?.find(item => item.value === value)
    return preset?.label || getOpenAIImageSizeLabel(value)
}

function ImageStatusBadge({ status }) {
    if (status === 'running') return <Badge variant="secondary" className="animate-pulse">生成中</Badge>
    if (status === 'success') return <Badge variant="success">完成</Badge>
    if (status === 'failed') return <Badge variant="destructive">失败</Badge>
    return <Badge variant="outline">等待</Badge>
}

function TrackedImage({ src, alt, className, loading, onLoad }) {
    const [loadStartTime] = useState(() => getNow())

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading={loading}
            onLoad={() => onLoad?.(src, Math.max(0.5, getNow() - loadStartTime))}
        />
    )
}

function ImageTimingDetails({ job, imageLoadDuration }) {
    const serverTimings = job.timings && Object.keys(job.timings).length > 0
        ? Object.entries(job.timings)
        : []
    const inferenceTiming = job.timings?.inference
    const primaryTimings = [
        { label: '总耗时', value: formatMs(job.duration) },
        { label: '请求耗时', value: formatMs(job.clientTimings?.response) },
        { label: '接收结果', value: formatMs(job.clientTimings?.download) },
        { label: '推理', value: formatTimingValue(inferenceTiming) },
    ]
    const secondaryTimings = serverTimings.filter(([key]) => key !== 'inference')

    return (
        <div className="border border-border bg-primary/5 p-2 text-[11px] text-primary/80 space-y-2">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-1">
                <span className="font-bold text-primary uppercase tracking-widest">耗时</span>
                <span className="text-primary/80">完成 {formatCompletedAt(job.completedAt)}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {primaryTimings.map(item => (
                    <div key={item.label} className="min-w-0">
                        <div className="text-primary/80">{item.label}</div>
                        <div className="text-primary font-bold truncate">{item.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-primary/80">
                <div className="flex justify-between gap-2">
                    <span>解析结果</span>
                    <span>{formatMs(job.clientTimings?.parse)}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>图片加载</span>
                    <span>{formatMs(imageLoadDuration)}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>请求ID</span>
                    <span className="truncate" title={job.requestId || ''}>{job.requestId || '-'}</span>
                </div>
            </div>

            {secondaryTimings.length > 0 && (
                <div className="border-t border-border pt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-primary/80">
                    {secondaryTimings.map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-2">
                            <span className="truncate" title={key}>{formatServerTimingLabel(key)}</span>
                            <span>{formatTimingValue(value)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ImageZoomModal({ image, onClose, onToast, imageLoadDuration, onImageLoad }) {
    if (!image) {
        return null
    }

    return (
        <div
            className="fixed inset-0 z-[10020] bg-black/95 backdrop-blur-sm p-4 lg:p-8 flex flex-col"
            onClick={onClose}
        >
            <div
                className="flex items-center justify-between gap-3 border border-primary bg-primary/10 p-3"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="text-primary font-bold uppercase tracking-widest text-sm">
                    IMAGE #{String(image.job.index + 1).padStart(2, '0')}.{image.imageIndex + 1}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                            navigator.clipboard.writeText(image.url)
                            onToast?.('图像 URL 已复制')
                        }}
                    >
                        URL
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(image.url, '_blank', 'noopener,noreferrer')}
                    >
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            <div
                className="flex-1 min-h-0 border-x border-primary bg-black flex items-center justify-center p-3"
                onClick={(event) => event.stopPropagation()}
            >
                <TrackedImage
                    src={image.url}
                    alt={`Generated enlarged preview ${image.job.index + 1}-${image.imageIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                    onLoad={onImageLoad}
                />
            </div>
            <div
                className="border border-primary bg-primary/5 p-3"
                onClick={(event) => event.stopPropagation()}
            >
                <ImageTimingDetails job={image.job} imageLoadDuration={imageLoadDuration} />
            </div>
        </div>
    )
}

function ImagePreviewGrid({ jobs, onToast, onZoom, imageLoadDurations, onImageLoad }) {
    const images = useMemo(() => jobs.flatMap(job =>
        job.images.map((image, imageIndex) => ({
            ...image,
            job,
            imageIndex,
        }))
    ), [jobs])

    if (!jobs.length) {
        return (
            <div className="min-h-[360px] border border-dashed border-border flex items-center justify-center text-primary/80">
                <Images className="w-10 h-10" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {images.map(image => (
                    <div
                        key={`${image.job.id}_${image.id}`}
                        className="border border-border bg-black min-h-[300px] flex flex-col"
                    >
                        <button
                            type="button"
                            className="block bg-black border-b border-border aspect-[4/3] overflow-hidden relative group/preview"
                            onClick={() => onZoom(image)}
                            title="点击放大预览"
                        >
                            <TrackedImage
                                src={image.url}
                                alt={`Generated preview ${image.job.index + 1}-${image.imageIndex + 1}`}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                onLoad={onImageLoad}
                            />
                            <span className="absolute right-2 top-2 h-8 w-8 border border-primary bg-black/80 text-primary hidden group-hover/preview:flex items-center justify-center">
                                <Maximize2 className="w-4 h-4" />
                            </span>
                        </button>

                        <div className="p-3 space-y-3 text-xs">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-primary font-bold">
                                    #{String(image.job.index + 1).padStart(2, '0')}.{image.imageIndex + 1}
                                </span>
                                <span className="text-primary/80 truncate">
                                    {image.contentType || image.job.model}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-primary/80">
                                <span>Seed: {image.job.seed ?? '-'}</span>
                                <span className="text-right">
                                    {image.width && image.height ? `${image.width}x${image.height}` : '-'}
                                </span>
                            </div>
                            <ImageTimingDetails
                                job={image.job}
                                imageLoadDuration={imageLoadDurations[image.url]}
                            />
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => {
                                        navigator.clipboard.writeText(image.url)
                                        onToast?.('图像 URL 已复制')
                                    }}
                                >
                                    URL
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => window.open(image.url, '_blank', 'noopener,noreferrer')}
                                >
                                    <ExternalLink className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => {
                                        const link = document.createElement('a')
                                        link.href = image.url
                                        link.download = image.fileName || `prompty-image-${image.job.index + 1}-${image.imageIndex + 1}`
                                        link.click()
                                    }}
                                >
                                    <Download className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {jobs.some(job => job.status !== 'success') && (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {jobs.filter(job => job.status !== 'success').map(job => (
                        <div key={job.id} className="border border-dashed border-border min-h-[180px] p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-primary font-bold">
                                    #{String(job.index + 1).padStart(2, '0')}
                                </span>
                                <ImageStatusBadge status={job.status} />
                            </div>
                            <div className="text-xs text-primary/80 break-words">
                                {job.error || (job.status === 'running' ? 'GENERATING_IMAGE_STREAM' : 'QUEUED_FOR_GENERATION')}
                            </div>
                            {job.status === 'running' && (
                                <div className="h-2 border border-primary p-0.5">
                                    <div className="h-full w-2/3 bg-primary animate-pulse" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export function ImageGenerationLab({ isOpen, onClose, onToast }) {
    const [settings, setSettings] = useLocalStorage(
        IMAGE_GENERATION_STORAGE_KEYS.SETTINGS,
        DEFAULT_IMAGE_GENERATION_SETTINGS
    )
    const [apiKeys, setApiKeys] = useLocalStorage(IMAGE_GENERATION_STORAGE_KEYS.API_KEYS, {})
    const normalizedSettings = mergeSettings(settings)
    const batch = useImageGenerationBatch({ onToast })
    const providerInfo = IMAGE_GENERATION_PROVIDER_INFO[normalizedSettings.provider]
    const openAICompatibleConfig = getOpenAICompatibleConfig(normalizedSettings.provider)
    const isOpenAICompatibleProvider = Boolean(openAICompatibleConfig)
    const isModelLocked = Boolean(providerInfo?.modelLocked)
    const [draftApiKey, setDraftApiKey] = useState('')
    const [zoomImage, setZoomImage] = useState(null)
    const [imageLoadDurations, setImageLoadDurations] = useState({})
    const estimatedCount = getEstimatedImageCount(normalizedSettings)
    const estimatedTotalImages = estimatedCount.batchCount * estimatedCount.numImages
    const savedApiKey = apiKeys?.[normalizedSettings.provider]
        || (normalizedSettings.provider === IMAGE_GENERATION_PROVIDERS.DEVART
            ? apiKeys?.[LEGACY_OPENAI_IMAGE_PROVIDER]
            : '')
        || ''
    const hasApiKey = Boolean(savedApiKey)

    const setField = (field, value) => {
        setSettings(prev => updateField(mergeSettings(prev), field, value))
    }

    const handleProviderChange = (provider) => {
        const nextProviderInfo = IMAGE_GENERATION_PROVIDER_INFO[provider]
        const nextOpenAIConfig = nextProviderInfo?.openaiCompatible
        setSettings(prev => ({
            ...mergeSettings(prev),
            settingsVersion: IMAGE_GENERATION_SETTINGS_VERSION,
            provider,
            model: nextProviderInfo?.defaultModel || '',
            ...(nextOpenAIConfig && {
                openaiSizePreset: nextOpenAIConfig.defaultSize || 'auto',
                openaiQuality: nextOpenAIConfig.defaultQuality || 'auto',
                openaiOutputFormat: nextOpenAIConfig.outputFormats?.[0] || 'png',
                openaiBackground: nextOpenAIConfig.backgroundOptions?.[0] || 'auto',
            }),
        }))
        setDraftApiKey('')
    }

    const handleSaveApiKey = () => {
        const normalizedKey = draftApiKey.trim()

        if (!normalizedKey) {
            onToast?.('请先填写图像生成 API Key')
            return
        }

        if (!providerInfo?.keyStorageKey) {
            onToast?.('当前供应商暂不支持保存密钥')
            return
        }

        setApiKeys(prev => ({
            ...(prev || {}),
            [normalizedSettings.provider]: normalizedKey,
        }))
        setDraftApiKey('')
        onToast?.('图像生成 API Key 已保存')
    }

    const handleClearApiKey = () => {
        if (!providerInfo?.keyStorageKey) {
            return
        }

        setApiKeys(prev => {
            const nextApiKeys = { ...(prev || {}) }
            delete nextApiKeys[normalizedSettings.provider]
            if (normalizedSettings.provider === IMAGE_GENERATION_PROVIDERS.DEVART) {
                delete nextApiKeys[LEGACY_OPENAI_IMAGE_PROVIDER]
            }
            return nextApiKeys
        })
        setDraftApiKey('')
        onToast?.('图像生成 API Key 已撤销')
    }

    const handleStart = () => {
        setImageLoadDurations({})
        batch.startBatch({
            provider: normalizedSettings.provider,
            apiKey: savedApiKey,
            model: normalizedSettings.model,
            settings: normalizedSettings,
            batchCount: normalizedSettings.batchCount,
            concurrency: normalizedSettings.concurrency,
            interval: normalizedSettings.interval,
        })
    }

    const handleImageLoad = (url, duration) => {
        if (!url || imageLoadDurations[url] !== undefined) {
            return
        }

        setImageLoadDurations(prev => ({
            ...prev,
            [url]: duration,
        }))
    }

    return (
        <div className={isOpen ? "space-y-6" : "hidden"}>
            <div className="border border-primary bg-black shadow-glow flex flex-col">
                <div className="flex items-center justify-between gap-4 border-b border-primary bg-primary/10 p-3">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest">
                        <Image className="w-4 h-4" />
                        <span>{`>> IMAGE_GENERATION_TEST`}</span>
                    </div>
                    {onClose && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="h-8 text-xs"
                        >
                            返回文本测试
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr] flex-1">
                    <aside className="border-b xl:border-b-0 xl:border-r border-border p-4 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                            <div>
                                <Label className={FIELD_LABEL_CLASS}>供应商</Label>
                                <Select
                                    value={normalizedSettings.provider}
                                    onChange={(event) => handleProviderChange(event.target.value)}
                                    disabled={batch.isRunning}
                                >
                                    {Object.entries(IMAGE_GENERATION_PROVIDER_INFO).map(([provider, info]) => (
                                        <option key={provider} value={provider}>
                                            {info.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <Label className={`${FIELD_LABEL_CLASS} flex items-center justify-between`}>
                                    <span>API Key</span>
                                    <span className={hasApiKey ? "text-primary" : "text-destructive"}>
                                        {hasApiKey ? '已保存' : '未保存'}
                                    </span>
                                </Label>
                                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                    <Input
                                        type="password"
                                        value={draftApiKey}
                                        placeholder={hasApiKey ? '****************' : `输入 ${providerInfo?.keyLabel || 'API Key'}`}
                                        onChange={(event) => setDraftApiKey(event.target.value)}
                                        onKeyDown={(event) => event.key === 'Enter' && handleSaveApiKey()}
                                        disabled={batch.isRunning || hasApiKey}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-10"
                                        onClick={handleSaveApiKey}
                                        disabled={batch.isRunning || hasApiKey}
                                    >
                                        保存
                                    </Button>
                                    {hasApiKey && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-10"
                                            onClick={handleClearApiKey}
                                            disabled={batch.isRunning}
                                        >
                                            撤销
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className={FIELD_LABEL_CLASS}>模型 ID</Label>
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    value={normalizedSettings.model}
                                    placeholder={providerInfo?.defaultModel}
                                    onChange={(event) => setField('model', event.target.value)}
                                    disabled={batch.isRunning || isModelLocked}
                                />
                                {providerInfo?.models?.length > 0 && !isModelLocked && (
                                    <Select
                                        value={providerInfo.models.includes(normalizedSettings.model) ? normalizedSettings.model : ''}
                                        onChange={(event) => event.target.value && setField('model', event.target.value)}
                                        disabled={batch.isRunning}
                                        className="h-9 text-xs"
                                    >
                                        <option value="">选择内置模型</option>
                                        {providerInfo.models.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </Select>
                                )}
                                {isModelLocked && (
                                    <div className="text-[11px] text-primary/80">
                                        当前渠道固定测试 {providerInfo.defaultModel}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label className={FIELD_LABEL_CLASS}>提示词</Label>
                            <Textarea
                                value={normalizedSettings.prompt}
                                onChange={(event) => setField('prompt', event.target.value)}
                                disabled={batch.isRunning}
                                className="min-h-[180px] leading-relaxed"
                                placeholder="A cinematic product photo of a translucent mechanical keyboard on a wet neon street, crisp reflections, shallow depth of field"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className={FIELD_LABEL_CLASS}>生成批次</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={normalizedSettings.batchCount}
                                    onChange={(event) => setField('batchCount', event.target.value)}
                                    disabled={batch.isRunning}
                                    className={NUMBER_INPUT_CLASS}
                                />
                            </div>
                            <div>
                                <Label className={FIELD_LABEL_CLASS}>并发</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={normalizedSettings.concurrency}
                                    onChange={(event) => setField('concurrency', event.target.value)}
                                    disabled={batch.isRunning}
                                    className={NUMBER_INPUT_CLASS}
                                />
                            </div>
                            <div>
                                <Label className={FIELD_LABEL_CLASS}>间隔 ms</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={normalizedSettings.interval}
                                    onChange={(event) => setField('interval', event.target.value)}
                                    disabled={batch.isRunning}
                                    className={NUMBER_INPUT_CLASS}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                size="lg"
                                className="h-12"
                                onClick={handleStart}
                                disabled={batch.isRunning}
                            >
                                {batch.isRunning ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" /> 生成
                                    </>
                                )}
                            </Button>
                            {batch.isRunning ? (
                                <Button
                                    variant="destructive"
                                    size="lg"
                                    className="h-12"
                                    onClick={batch.stopBatch}
                                >
                                    <X className="w-4 h-4 mr-2" /> 停止
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-12"
                                    onClick={batch.clearJobs}
                                    disabled={!batch.jobs.length}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> 清空
                                </Button>
                            )}
                        </div>

                        <div className="border border-border p-3 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-primary/80">TOTAL</span>
                                <span>{batch.stats.total}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-primary/80">预计总张数</span>
                                <span>{estimatedCount.batchCount} 批 x {estimatedCount.numImages} 张 = {estimatedTotalImages}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-primary/80">SUCCESS / FAILED / RUNNING</span>
                                <span>{batch.stats.success} / {batch.stats.failed} / {batch.stats.running}</span>
                            </div>
                            <div className="h-3 border border-primary p-0.5">
                                <div className="h-full bg-primary transition-all" style={{ width: `${batch.progress}%` }} />
                            </div>
                            <div className="text-right text-primary/80">{batch.progress}%</div>
                        </div>
                    </aside>

                    <main className="p-4 space-y-5">
                        <section className="border border-border">
                            <div className="border-b border-dashed border-border p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 font-bold text-secondary uppercase tracking-widest text-sm">
                                    <Key className="w-4 h-4" />
                                    {getProviderParameterTitle(normalizedSettings.provider)}
                                </div>
                                <Badge variant="outline">{normalizedSettings.model || providerInfo?.defaultModel}</Badge>
                            </div>

                            {normalizedSettings.provider === IMAGE_GENERATION_PROVIDERS.FAL && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 p-4">
                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>图像尺寸</Label>
                                        <Select
                                            value={normalizedSettings.imageSizePreset}
                                            onChange={(event) => setField('imageSizePreset', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            {FAL_IMAGE_SIZE_PRESETS.map(size => (
                                                <option key={size.value} value={size.value}>{size.label}</option>
                                            ))}
                                            <option value="custom">custom - 自定义尺寸</option>
                                        </Select>
                                        <div className="mt-1 text-[11px] text-primary/80">
                                            {normalizedSettings.imageSizePreset === 'custom'
                                                ? `${normalizedSettings.customWidth}x${normalizedSettings.customHeight}`
                                                : getImageSizeLabel(normalizedSettings.imageSizePreset)}
                                        </div>
                                    </div>

                                    {normalizedSettings.imageSizePreset === 'custom' && (
                                        <>
                                            <div>
                                                <Label className={FIELD_LABEL_CLASS}>宽度</Label>
                                                <Input
                                                    type="number"
                                                    min="64"
                                                    max="4096"
                                                    value={normalizedSettings.customWidth}
                                                    onChange={(event) => setField('customWidth', event.target.value)}
                                                    disabled={batch.isRunning}
                                                    className={NUMBER_INPUT_CLASS}
                                                />
                                            </div>
                                            <div>
                                                <Label className={FIELD_LABEL_CLASS}>高度</Label>
                                                <Input
                                                    type="number"
                                                    min="64"
                                                    max="4096"
                                                    value={normalizedSettings.customHeight}
                                                    onChange={(event) => setField('customHeight', event.target.value)}
                                                    disabled={batch.isRunning}
                                                    className={NUMBER_INPUT_CLASS}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>推理步数</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={normalizedSettings.numInferenceSteps}
                                            onChange={(event) => setField('numInferenceSteps', event.target.value)}
                                            disabled={batch.isRunning}
                                            className={NUMBER_INPUT_CLASS}
                                        />
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Guidance</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="20"
                                            step="0.1"
                                            value={normalizedSettings.guidanceScale}
                                            onChange={(event) => setField('guidanceScale', event.target.value)}
                                            disabled={batch.isRunning}
                                            className={NUMBER_INPUT_CLASS}
                                        />
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Seed</Label>
                                        <Input
                                            type="number"
                                            value={normalizedSettings.seed}
                                            placeholder="random"
                                            onChange={(event) => setField('seed', event.target.value)}
                                            disabled={batch.isRunning}
                                            className={NUMBER_INPUT_CLASS}
                                        />
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>每批张数</Label>
                                        <Select
                                            value={normalizedSettings.numImages}
                                            onChange={(event) => setField('numImages', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            {[1, 2, 3, 4].map(value => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>格式</Label>
                                        <Select
                                            value={normalizedSettings.outputFormat}
                                            onChange={(event) => setField('outputFormat', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="jpeg">jpeg</option>
                                            <option value="png">png</option>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>加速</Label>
                                        <Select
                                            value={normalizedSettings.acceleration}
                                            onChange={(event) => setField('acceleration', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="none">none</option>
                                            <option value="regular">regular</option>
                                            <option value="high">high</option>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>安全检查</Label>
                                        <Select
                                            value={normalizedSettings.enableSafetyChecker ? 'true' : 'false'}
                                            onChange={(event) => setField('enableSafetyChecker', event.target.value === 'true')}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="true">enabled</option>
                                            <option value="false">disabled</option>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Sync Mode</Label>
                                        <Select
                                            value={normalizedSettings.syncMode ? 'true' : 'false'}
                                            onChange={(event) => setField('syncMode', event.target.value === 'true')}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="false">false</option>
                                            <option value="true">true</option>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {normalizedSettings.provider === IMAGE_GENERATION_PROVIDERS.TOGETHER && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 p-4">
                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>尺寸模式</Label>
                                        <Select
                                            value={normalizedSettings.togetherSizeMode}
                                            onChange={(event) => setField('togetherSizeMode', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="default">model default</option>
                                            <option value="aspect_ratio">aspect_ratio</option>
                                            <option value="dimensions">width / height</option>
                                        </Select>
                                    </div>

                                    {normalizedSettings.togetherSizeMode === 'aspect_ratio' && (
                                        <div>
                                            <Label className={FIELD_LABEL_CLASS}>Aspect Ratio</Label>
                                            <Select
                                                value={normalizedSettings.togetherAspectRatio}
                                                onChange={(event) => setField('togetherAspectRatio', event.target.value)}
                                                disabled={batch.isRunning}
                                            >
                                                {TOGETHER_ASPECT_RATIO_PRESETS.map(size => (
                                                    <option key={size.value} value={size.value}>{size.label}</option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}

                                    {normalizedSettings.togetherSizeMode === 'dimensions' && (
                                        <>
                                            <div>
                                                <Label className={FIELD_LABEL_CLASS}>宽度</Label>
                                                <Input
                                                    type="number"
                                                    min="64"
                                                    max="4096"
                                                    step="8"
                                                    value={normalizedSettings.togetherWidth}
                                                    onChange={(event) => setField('togetherWidth', event.target.value)}
                                                    disabled={batch.isRunning}
                                                    className={NUMBER_INPUT_CLASS}
                                                />
                                            </div>
                                            <div>
                                                <Label className={FIELD_LABEL_CLASS}>高度</Label>
                                                <Input
                                                    type="number"
                                                    min="64"
                                                    max="4096"
                                                    step="8"
                                                    value={normalizedSettings.togetherHeight}
                                                    onChange={(event) => setField('togetherHeight', event.target.value)}
                                                    disabled={batch.isRunning}
                                                    className={NUMBER_INPUT_CLASS}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Steps</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={normalizedSettings.togetherSteps}
                                            onChange={(event) => setField('togetherSteps', event.target.value)}
                                            disabled={batch.isRunning}
                                            className={NUMBER_INPUT_CLASS}
                                        />
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Guidance</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            step="0.1"
                                            value={normalizedSettings.togetherGuidanceScale}
                                            onChange={(event) => setField('togetherGuidanceScale', event.target.value)}
                                            disabled={batch.isRunning}
                                            className={NUMBER_INPUT_CLASS}
                                        />
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Seed</Label>
                                        <Input
                                            type="number"
                                            value={normalizedSettings.togetherSeed}
                                            placeholder="random"
                                            onChange={(event) => setField('togetherSeed', event.target.value)}
                                            disabled={batch.isRunning}
                                            className={NUMBER_INPUT_CLASS}
                                        />
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>每批张数</Label>
                                        <Select
                                            value={normalizedSettings.togetherNumImages}
                                            onChange={(event) => setField('togetherNumImages', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            {[1, 2, 3, 4].map(value => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Response</Label>
                                        <Select
                                            value={normalizedSettings.togetherResponseFormat}
                                            onChange={(event) => setField('togetherResponseFormat', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="url">url</option>
                                            <option value="base64">base64</option>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>格式</Label>
                                        <Select
                                            value={normalizedSettings.togetherOutputFormat}
                                            onChange={(event) => setField('togetherOutputFormat', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="jpeg">jpeg</option>
                                            <option value="png">png</option>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>安全检查</Label>
                                        <Select
                                            value={normalizedSettings.togetherDisableSafetyChecker ? 'disabled' : 'enabled'}
                                            onChange={(event) => setField('togetherDisableSafetyChecker', event.target.value === 'disabled')}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="enabled">enabled</option>
                                            <option value="disabled">disabled</option>
                                        </Select>
                                    </div>

                                    <div className="sm:col-span-2 lg:col-span-4">
                                        <Label className={FIELD_LABEL_CLASS}>Negative Prompt</Label>
                                        <Textarea
                                            value={normalizedSettings.togetherNegativePrompt}
                                            onChange={(event) => setField('togetherNegativePrompt', event.target.value)}
                                            disabled={batch.isRunning}
                                            className="min-h-[88px] leading-relaxed"
                                            placeholder="blurry, low quality, distorted, watermark"
                                        />
                                    </div>
                                </div>
                            )}

                            {isOpenAICompatibleProvider && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 p-4">
                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>图像尺寸</Label>
                                        <Select
                                            value={normalizedSettings.openaiSizePreset}
                                            onChange={(event) => setField('openaiSizePreset', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            {openAICompatibleConfig.sizePresets.map(size => (
                                                <option key={size.value} value={size.value}>{size.label}</option>
                                            ))}
                                            {openAICompatibleConfig.allowCustomSize && (
                                                <option value="custom">custom - WIDTHxHEIGHT</option>
                                            )}
                                        </Select>
                                        <div className="mt-1 text-[11px] text-primary/80">
                                            {normalizedSettings.openaiSizePreset === 'custom'
                                                ? `${normalizedSettings.openaiCustomWidth}x${normalizedSettings.openaiCustomHeight}`
                                                : getOpenAICompatibleSizeLabel(normalizedSettings.provider, normalizedSettings.openaiSizePreset)}
                                        </div>
                                    </div>

                                    {openAICompatibleConfig.allowCustomSize && normalizedSettings.openaiSizePreset === 'custom' && (
                                        <>
                                            <div>
                                                <Label className={FIELD_LABEL_CLASS}>宽度</Label>
                                                <Input
                                                    type="number"
                                                    min="16"
                                                    max="3840"
                                                    step="16"
                                                    value={normalizedSettings.openaiCustomWidth}
                                                    onChange={(event) => setField('openaiCustomWidth', event.target.value)}
                                                    disabled={batch.isRunning}
                                                    className={NUMBER_INPUT_CLASS}
                                                />
                                            </div>
                                            <div>
                                                <Label className={FIELD_LABEL_CLASS}>高度</Label>
                                                <Input
                                                    type="number"
                                                    min="16"
                                                    max="3840"
                                                    step="16"
                                                    value={normalizedSettings.openaiCustomHeight}
                                                    onChange={(event) => setField('openaiCustomHeight', event.target.value)}
                                                    disabled={batch.isRunning}
                                                    className={NUMBER_INPUT_CLASS}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Quality</Label>
                                        <Select
                                            value={normalizedSettings.openaiQuality}
                                            onChange={(event) => setField('openaiQuality', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            {openAICompatibleConfig.qualityOptions.map(value => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>每批张数</Label>
                                        <Select
                                            value={normalizedSettings.openaiNumImages}
                                            onChange={(event) => setField('openaiNumImages', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            {Array.from({ length: openAICompatibleConfig.maxImages || 10 }, (_, index) => index + 1).map(value => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>格式</Label>
                                        <Select
                                            value={normalizedSettings.openaiOutputFormat}
                                            onChange={(event) => setField('openaiOutputFormat', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            {openAICompatibleConfig.outputFormats.map(value => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    {openAICompatibleConfig.supportsOutputCompression !== false && (normalizedSettings.openaiOutputFormat === 'jpeg' || normalizedSettings.openaiOutputFormat === 'webp') && (
                                        <div>
                                            <Label className={FIELD_LABEL_CLASS}>压缩 0-100</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={normalizedSettings.openaiOutputCompression}
                                                onChange={(event) => setField('openaiOutputCompression', event.target.value)}
                                                disabled={batch.isRunning}
                                                className={NUMBER_INPUT_CLASS}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>背景</Label>
                                        <Select
                                            value={normalizedSettings.openaiBackground}
                                            onChange={(event) => setField('openaiBackground', event.target.value)}
                                            disabled={batch.isRunning}
                                        >
                                            {openAICompatibleConfig.backgroundOptions.map(value => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    {openAICompatibleConfig.supportsModeration !== false && (
                                        <div>
                                            <Label className={FIELD_LABEL_CLASS}>Moderation</Label>
                                            <Select
                                                value={normalizedSettings.openaiModeration}
                                                onChange={(event) => setField('openaiModeration', event.target.value)}
                                                disabled={batch.isRunning}
                                            >
                                                {openAICompatibleConfig.moderationOptions.map(value => (
                                                    <option key={value} value={value}>{value}</option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}

                                    <div>
                                        <Label className={FIELD_LABEL_CLASS}>Streaming</Label>
                                        <Select
                                            value={normalizedSettings.openaiStream ? 'true' : 'false'}
                                            onChange={(event) => setField('openaiStream', event.target.value === 'true')}
                                            disabled={batch.isRunning}
                                        >
                                            <option value="false">false</option>
                                            <option value="true">true</option>
                                        </Select>
                                    </div>

                                    {openAICompatibleConfig.supportsPartialImages !== false && normalizedSettings.openaiStream && (
                                        <div>
                                            <Label className={FIELD_LABEL_CLASS}>Partial Images</Label>
                                            <Select
                                                value={normalizedSettings.openaiPartialImages}
                                                onChange={(event) => setField('openaiPartialImages', event.target.value)}
                                                disabled={batch.isRunning}
                                            >
                                                {[0, 1, 2, 3].map(value => (
                                                    <option key={value} value={value}>{value}</option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}

                                    {openAICompatibleConfig.supportsUser !== false && (
                                        <div className="sm:col-span-2 lg:col-span-4">
                                            <Label className={FIELD_LABEL_CLASS}>User ID</Label>
                                            <Input
                                                type="text"
                                                value={normalizedSettings.openaiUser}
                                                placeholder="optional end-user id"
                                                onChange={(event) => setField('openaiUser', event.target.value)}
                                                disabled={batch.isRunning}
                                                className={NUMBER_INPUT_CLASS}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-widest text-secondary">
                                    <Images className="w-5 h-5" />
                                    PREVIEW_BUFFER
                                </h2>
                                <Badge variant="outline">
                                    {batch.jobs.reduce((count, job) => count + job.images.length, 0)} IMG
                                </Badge>
                            </div>
                            <ImagePreviewGrid
                                jobs={batch.jobs}
                                onToast={onToast}
                                onZoom={setZoomImage}
                                imageLoadDurations={imageLoadDurations}
                                onImageLoad={handleImageLoad}
                            />
                        </section>
                    </main>
                </div>
            </div>
            <div onClick={(event) => event.stopPropagation()}>
                <ImageZoomModal
                    image={zoomImage}
                    onClose={() => setZoomImage(null)}
                    onToast={onToast}
                    imageLoadDuration={zoomImage ? imageLoadDurations[zoomImage.url] : undefined}
                    onImageLoad={handleImageLoad}
                />
            </div>
        </div>
    )
}
