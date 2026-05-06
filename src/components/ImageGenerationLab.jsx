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
} from '../constants/imageGeneration'

const NUMBER_INPUT_CLASS = "h-9 text-xs font-mono"
const FIELD_LABEL_CLASS = "text-[11px] text-muted-foreground"

function mergeSettings(settings) {
    const mergedSettings = {
        ...DEFAULT_IMAGE_GENERATION_SETTINGS,
        ...(settings || {}),
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

function getEstimatedImageCount(settings) {
    return {
        batchCount: Math.max(1, toInt(settings.batchCount, 1)),
        numImages: Math.max(1, toInt(settings.numImages, 1)),
    }
}

function updateField(settings, field, value) {
    return {
        ...settings,
        [field]: value,
    }
}

function ImageStatusBadge({ status }) {
    if (status === 'running') return <Badge variant="secondary" className="animate-pulse">生成中</Badge>
    if (status === 'success') return <Badge variant="success">完成</Badge>
    if (status === 'failed') return <Badge variant="destructive">失败</Badge>
    return <Badge variant="outline">等待</Badge>
}

function ImageTimingDetails({ job }) {
    const serverTimings = job.timings && Object.keys(job.timings).length > 0
        ? Object.entries(job.timings)
        : []

    return (
        <div className="space-y-2 text-[11px] text-primary/70">
            <div className="grid grid-cols-2 gap-2">
                <span>完成: {formatCompletedAt(job.completedAt)}</span>
                <span className="text-right">总耗时: {formatMs(job.duration)}</span>
                <span>响应: {formatMs(job.clientTimings?.response)}</span>
                <span className="text-right">返回: {formatMs(job.clientTimings?.download)}</span>
                <span>解析: {formatMs(job.clientTimings?.parse)}</span>
                <span className="text-right">请求ID: {job.requestId || '-'}</span>
            </div>

            {serverTimings.length > 0 && (
                <div className="border-t border-border pt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                    {serverTimings.map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-2">
                            <span className="truncate" title={key}>{key}</span>
                            <span>{formatTimingValue(value)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ImageZoomModal({ image, onClose, onToast }) {
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
                <img
                    src={image.url}
                    alt={`Generated enlarged preview ${image.job.index + 1}-${image.imageIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                />
            </div>
            <div
                className="border border-primary bg-primary/5 p-3"
                onClick={(event) => event.stopPropagation()}
            >
                <ImageTimingDetails job={image.job} />
            </div>
        </div>
    )
}

function ImagePreviewGrid({ jobs, onToast, onZoom }) {
    const images = useMemo(() => jobs.flatMap(job =>
        job.images.map((image, imageIndex) => ({
            ...image,
            job,
            imageIndex,
        }))
    ), [jobs])

    if (!jobs.length) {
        return (
            <div className="min-h-[360px] border border-dashed border-border flex items-center justify-center text-primary/50">
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
                            <img
                                src={image.url}
                                alt={`Generated preview ${image.job.index + 1}-${image.imageIndex + 1}`}
                                className="w-full h-full object-contain"
                                loading="lazy"
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
                                <span className="text-primary/60 truncate">
                                    {image.contentType || image.job.model}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-primary/70">
                                <span>Seed: {image.job.seed ?? '-'}</span>
                                <span className="text-right">
                                    {image.width && image.height ? `${image.width}x${image.height}` : '-'}
                                </span>
                            </div>
                            <ImageTimingDetails job={image.job} />
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
                            <div className="text-xs text-primary/70 break-words">
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
    const [apiKey, setApiKey] = useState('')
    const [settings, setSettings] = useLocalStorage(
        IMAGE_GENERATION_STORAGE_KEYS.SETTINGS,
        DEFAULT_IMAGE_GENERATION_SETTINGS
    )
    const normalizedSettings = mergeSettings(settings)
    const batch = useImageGenerationBatch({ onToast })
    const providerInfo = IMAGE_GENERATION_PROVIDER_INFO[normalizedSettings.provider]
    const [zoomImage, setZoomImage] = useState(null)
    const estimatedCount = getEstimatedImageCount(normalizedSettings)
    const estimatedTotalImages = estimatedCount.batchCount * estimatedCount.numImages

    if (!isOpen) {
        return null
    }

    const setField = (field, value) => {
        setSettings(prev => updateField(mergeSettings(prev), field, value))
    }

    const handleProviderChange = (provider) => {
        const nextProviderInfo = IMAGE_GENERATION_PROVIDER_INFO[provider]
        setSettings(prev => ({
            ...mergeSettings(prev),
            settingsVersion: IMAGE_GENERATION_SETTINGS_VERSION,
            provider,
            model: nextProviderInfo?.defaultModel || '',
        }))
    }

    const handleStart = () => {
        batch.startBatch({
            provider: normalizedSettings.provider,
            apiKey,
            model: normalizedSettings.model,
            settings: normalizedSettings,
            batchCount: normalizedSettings.batchCount,
            concurrency: normalizedSettings.concurrency,
            interval: normalizedSettings.interval,
        })
    }

    return (
        <div
            className="fixed inset-0 z-[9998] bg-black/90 backdrop-blur-sm p-4 lg:p-6 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="max-w-[1800px] mx-auto min-h-[calc(100vh-3rem)] border border-primary bg-black shadow-glow flex flex-col"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-4 border-b border-primary bg-primary/10 p-3">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest">
                        <Image className="w-4 h-4" />
                        <span>{`>> IMAGE_GENERATION_TEST`}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0 hover:bg-primary hover:text-black"
                    >
                        <X className="w-4 h-4" />
                    </Button>
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
                                <Label className={FIELD_LABEL_CLASS}>API Key</Label>
                                <Input
                                    type="password"
                                    value={apiKey}
                                    placeholder={`输入 ${providerInfo?.keyLabel || 'API Key'}`}
                                    onChange={(event) => setApiKey(event.target.value)}
                                    disabled={batch.isRunning}
                                />
                            </div>
                        </div>

                        <div>
                            <Label className={FIELD_LABEL_CLASS}>模型 ID</Label>
                            <Input
                                type="text"
                                value={normalizedSettings.model}
                                placeholder={providerInfo?.defaultModel}
                                onChange={(event) => setField('model', event.target.value)}
                                disabled={batch.isRunning}
                            />
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
                                <span className="text-primary/70">TOTAL</span>
                                <span>{batch.stats.total}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-primary/70">预计总张数</span>
                                <span>{estimatedCount.batchCount} 批 x {estimatedCount.numImages} 张 = {estimatedTotalImages}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-primary/70">SUCCESS / FAILED / RUNNING</span>
                                <span>{batch.stats.success} / {batch.stats.failed} / {batch.stats.running}</span>
                            </div>
                            <div className="h-3 border border-primary p-0.5">
                                <div className="h-full bg-primary transition-all" style={{ width: `${batch.progress}%` }} />
                            </div>
                            <div className="text-right text-primary/70">{batch.progress}%</div>
                        </div>
                    </aside>

                    <main className="p-4 space-y-5">
                        <section className="border border-border">
                            <div className="border-b border-dashed border-border p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 font-bold text-secondary uppercase tracking-widest text-sm">
                                    <Key className="w-4 h-4" />
                                    FAL.PARAMETERS
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
                                        <div className="mt-1 text-[11px] text-primary/50">
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
                />
            </div>
        </div>
    )
}
