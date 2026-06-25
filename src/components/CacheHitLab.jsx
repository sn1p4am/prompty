import { createElement, useMemo } from 'react'
import {
    BookOpen,
    Calculator,
    Clipboard,
    DatabaseZap,
    Gauge,
    KeyRound,
    Loader2,
    Play,
    RefreshCw,
    ServerCog,
    ShieldAlert,
    Square,
    Timer,
} from 'lucide-react'
import {
    CACHE_API_FORMATS,
    CACHE_API_FORMAT_INFO,
    CACHE_CASE_SIZES,
    CACHE_MODES,
    CACHE_PRESET_CASES,
    DEFAULT_CACHE_HIT_SETTINGS,
    buildCacheCasePrompt,
    isGeminiCacheApiFormat,
} from '../constants/cacheHit'
import { useCacheHitTest } from '../hooks/useCacheHitTest'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { normalizeCacheBaseUrl } from '../services/cacheHitClient'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Textarea } from './ui/textarea'

const STORAGE_KEY = 'cache_hit_lab_settings'

function formatPercent(value) {
    if (!Number.isFinite(value)) {
        return '0.0%'
    }

    return `${(value * 100).toFixed(1)}%`
}

function formatNumber(value) {
    return Math.round(value || 0).toLocaleString()
}

function formatDuration(value) {
    if (!value) {
        return '--'
    }

    return `${Math.round(value)} ms`
}

function getDefaultsForFormat(apiFormat) {
    const info = CACHE_API_FORMAT_INFO[apiFormat] || CACHE_API_FORMAT_INFO[CACHE_API_FORMATS.OPENAI]

    return {
        baseUrl: info.defaultBaseUrl,
        model: info.defaultModel,
        cacheMode: info.supportedModes[0],
        streamMode: false,
    }
}

function isClaudeLikeCacheApiFormat(apiFormat) {
    return apiFormat === CACHE_API_FORMATS.CLAUDE
        || apiFormat === CACHE_API_FORMATS.WANGSU_ANTHROPIC
}

function mergeSettings(settings) {
    return {
        ...DEFAULT_CACHE_HIT_SETTINGS,
        ...(settings || {}),
    }
}

function getResultHitRate(result) {
    const inputTokens = result.usage?.inputTokens || 0
    return inputTokens > 0 ? (result.usage?.cachedReadTokens || 0) / inputTokens : 0
}

function StatusBadge({ status }) {
    const statusText = {
        running: 'RUNNING',
        success: 'OK',
        failed: 'FAILED',
    }[status] || 'PENDING'

    return (
        <span className={`inline-flex min-w-[72px] justify-center border px-2 py-1 text-[10px] ${
            status === 'success'
                ? 'border-primary text-primary'
                : status === 'failed'
                    ? 'border-destructive text-destructive'
                    : 'border-secondary text-secondary animate-pulse'
        }`}>
            {statusText}
        </span>
    )
}

function MetricPanel({ icon: MetricIcon, label, value, detail }) {
    return (
        <div className="border border-border bg-black p-4 min-h-[116px]">
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted uppercase tracking-widest">{label}</span>
                {createElement(MetricIcon, { className: 'w-4 h-4 text-primary' })}
            </div>
            <div className="mt-3 text-3xl font-black text-primary leading-none">{value}</div>
            <div className="mt-3 text-xs text-muted leading-relaxed">{detail}</div>
        </div>
    )
}

function ProviderGuide({ apiFormat, cacheMode }) {
    const info = CACHE_API_FORMAT_INFO[apiFormat]
    const modeLabel = cacheMode === CACHE_MODES.EXPLICIT ? '显式缓存' : '自动缓存'
    const explicitGeminiNotice = apiFormat === CACHE_API_FORMATS.GEMINI && cacheMode === CACHE_MODES.EXPLICIT

    const providerFormula = {
        [CACHE_API_FORMATS.OPENAI]: 'cached_tokens / prompt_tokens (兼容 cached_read_tokens)',
        [CACHE_API_FORMATS.CLAUDE]: 'cache_read_input_tokens / (input_tokens + cache_creation_input_tokens + cache_read_input_tokens)',
        [CACHE_API_FORMATS.GEMINI]: 'cachedContentTokenCount / promptTokenCount',
        [CACHE_API_FORMATS.WANGSU_GEMINI]: 'cachedContentTokenCount / promptTokenCount',
        [CACHE_API_FORMATS.WANGSU_ANTHROPIC]: 'cache_read_input_tokens / (input_tokens + cache_creation_input_tokens + cache_read_input_tokens)',
    }[apiFormat]

    return (
        <section className="border border-border bg-black">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-dashed border-border p-4">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold uppercase tracking-widest text-primary">
                        <Calculator className="w-5 h-5" />
                        缓存计算方法
                    </h2>
                    <p className="mt-2 text-xs text-muted leading-relaxed">
                        当前格式：{info.name} / {modeLabel}。主指标统一按缓存读取 tokens 占总输入 tokens 的比例计算；第一轮常用于预热，所以同时展示预热后命中率。
                    </p>
                </div>
                <a
                    href={info.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 border border-primary px-3 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-black"
                >
                    <BookOpen className="w-3 h-3" />
                    官方文档
                </a>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
                <div className="bg-black p-4">
                    <div className="text-[10px] text-muted uppercase tracking-widest">Provider Field</div>
                    <div className="mt-2 text-sm text-primary break-all">{info.usagePath}</div>
                </div>
                <div className="bg-black p-4">
                    <div className="text-[10px] text-muted uppercase tracking-widest">Formula</div>
                    <div className="mt-2 text-sm text-primary break-all">{providerFormula}</div>
                </div>
                <div className="bg-black p-4">
                    <div className="text-[10px] text-muted uppercase tracking-widest">Notes</div>
                    <div className="mt-2 text-xs text-muted leading-relaxed">{info.note}</div>
                    {explicitGeminiNotice && (
                        <div className="mt-3 border border-dashed border-primary/60 bg-primary/5 p-3 text-xs text-foreground/90 leading-relaxed">
                            显式缓存请求与 Google GenAI SDK 对齐：先发 <span className="font-mono text-primary">POST /cachedContents</span>，body 使用 <span className="font-mono text-primary">model: "models/..."</span>、<span className="font-mono text-primary">contents</span> 和 <span className="font-mono text-primary">ttl</span>；随后在 <span className="font-mono text-primary">generateContent</span> 中引用返回的缓存名。
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

function RawUsageBlock({ result }) {
    const debugPayload = {
        responseHeaders: result.debug?.responseHeaders || {},
        cacheCreate: result.debug?.cacheCreate || undefined,
    }
    const hasRawUsage = Boolean(result.usage?.rawUsage)
    const hasDebugHeaders = Object.keys(debugPayload.responseHeaders).length > 0
        || Object.keys(debugPayload.cacheCreate?.responseHeaders || {}).length > 0

    if (!hasRawUsage && !hasDebugHeaders) {
        return null
    }

    return (
        <details className="mt-3 border border-dashed border-border">
            <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-widest text-secondary">
                Raw Usage / Debug Headers
            </summary>
            <pre className="max-h-56 overflow-auto border-t border-dashed border-border p-3 text-[11px] text-muted">
                {JSON.stringify({
                    rawUsage: result.usage?.rawUsage,
                    debug: debugPayload,
                }, null, 2)}
            </pre>
        </details>
    )
}

function buildSupportPayload(results) {
    return results.map(result => ({
        round: result.round,
        status: result.status,
        error: result.error,
        usage: result.usage?.rawUsage,
        debug: {
            responseHeaders: result.debug?.responseHeaders || {},
            cacheCreate: result.debug?.cacheCreate || undefined,
        },
    }))
}

function ResultsTable({ results }) {
    if (results.length === 0) {
        return (
            <div className="border border-dashed border-border p-10 text-center text-sm text-muted">
                等待测试结果。建议先使用预置案例跑 4 轮串行请求。
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {results.map(result => (
                <div key={result.id} className="border border-border bg-black p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 text-xs">
                        <div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">Round</div>
                            <div className="mt-1 text-primary">#{result.round}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">Status</div>
                            <div className="mt-1"><StatusBadge status={result.status} /></div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">Input</div>
                            <div className="mt-1 text-primary">{formatNumber(result.usage?.inputTokens)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">Cache Read</div>
                            <div className="mt-1 text-primary">{formatNumber(result.usage?.cachedReadTokens)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">Cache Write</div>
                            <div className="mt-1 text-primary">{formatNumber(result.usage?.cacheCreationTokens)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">Hit Rate</div>
                            <div className="mt-1 text-primary">{formatPercent(getResultHitRate(result))}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">Output</div>
                            <div className="mt-1 text-primary">{formatNumber(result.usage?.outputTokens)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">Latency</div>
                            <div className="mt-1 text-primary">{formatDuration(result.durationMs)}</div>
                        </div>
                    </div>

                    <div className="mt-4 border-t border-dashed border-border pt-3 text-xs text-muted leading-relaxed">
                        <span className="text-secondary">Prompt:</span> {result.dynamicPrompt}
                    </div>

                    {result.error && (
                        <div className="mt-3 border border-destructive p-3 text-xs text-destructive">
                            {result.error}
                        </div>
                    )}

                    <RawUsageBlock result={result} />
                </div>
            ))}
        </div>
    )
}

export function CacheHitLab({ isOpen, onClose, onToast }) {
    const [storedSettings, setStoredSettings] = useLocalStorage(STORAGE_KEY, DEFAULT_CACHE_HIT_SETTINGS)
    const settings = useMemo(() => mergeSettings(storedSettings), [storedSettings])
    const cacheTest = useCacheHitTest({ onToast })
    const providerInfo = CACHE_API_FORMAT_INFO[settings.apiFormat]
    const supportedModes = providerInfo.supportedModes
    const normalizedBaseUrl = useMemo(
        () => normalizeCacheBaseUrl(settings.apiFormat, settings.baseUrl),
        [settings.apiFormat, settings.baseUrl]
    )

    if (!isOpen) {
        return null
    }

    const setField = (field, value) => {
        setStoredSettings(current => ({
            ...mergeSettings(current),
            [field]: value,
        }))
    }

    const handleFormatChange = (apiFormat) => {
        const defaults = getDefaultsForFormat(apiFormat)
        setStoredSettings(current => {
            const merged = mergeSettings(current)
            const defaultBaseUrls = Object.values(CACHE_API_FORMAT_INFO).map(info => info.defaultBaseUrl)
            const defaultModels = Object.values(CACHE_API_FORMAT_INFO).map(info => info.defaultModel)

            return {
                ...merged,
                apiFormat,
                cacheMode: defaults.cacheMode,
                baseUrl: !merged.baseUrl || defaultBaseUrls.includes(merged.baseUrl)
                    ? defaults.baseUrl
                    : merged.baseUrl,
                model: !merged.model || defaultModels.includes(merged.model)
                    ? defaults.model
                    : merged.model,
                streamMode: defaults.streamMode,
            }
        })
    }

    const handleApplyPreset = () => {
        const preset = buildCacheCasePrompt(settings.presetCaseId, settings.caseSize)
        setStoredSettings(current => ({
            ...mergeSettings(current),
            staticPrefix: preset.staticPrefix,
            dynamicPromptsText: preset.dynamicPrompts.join('\n'),
        }))
        onToast?.('预置案例已载入')
    }

    const handleStart = () => {
        cacheTest.start({
            ...settings,
            baseUrl: normalizedBaseUrl,
        })
    }

    const handleCopySupportPayload = async () => {
        const payload = buildSupportPayload(cacheTest.results)
        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
            onToast?.('调试信息已复制')
        } catch {
            onToast?.('复制失败，请展开 Raw Usage / Debug Headers 手动复制')
        }
    }

    const canStart = Boolean(settings.apiKey && settings.model && normalizedBaseUrl && settings.staticPrefix) && !cacheTest.isRunning

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-2 text-2xl font-black uppercase tracking-widest text-primary">
                        <DatabaseZap className="w-6 h-6" />
                        缓存命中测试
                    </h2>
                    <p className="mt-2 text-xs text-secondary uppercase tracking-[0.16em]">
                        // OpenAI / Claude / Gemini Usage Meter
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={onClose}
                >
                    返回文本测试
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <section className="xl:col-span-1 border border-border bg-black">
                    <div className="border-b border-dashed border-border p-4">
                        <h3 className="flex items-center gap-2 text-lg font-bold uppercase tracking-widest text-primary">
                            <ServerCog className="w-5 h-5" />
                            Provider
                        </h3>
                    </div>

                    <div className="space-y-5 p-4">
                        <div>
                            <Label>API 格式</Label>
                            <Select
                                value={settings.apiFormat}
                                onChange={(event) => handleFormatChange(event.target.value)}
                                disabled={cacheTest.isRunning}
                            >
                                {Object.entries(CACHE_API_FORMAT_INFO).map(([value, info]) => (
                                    <option key={value} value={value}>{info.name}</option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <Label>缓存模式</Label>
                            <Select
                                value={settings.cacheMode}
                                onChange={(event) => setField('cacheMode', event.target.value)}
                                disabled={cacheTest.isRunning || supportedModes.length === 1}
                            >
                                {supportedModes.includes(CACHE_MODES.AUTO) && <option value={CACHE_MODES.AUTO}>自动缓存</option>}
                                {supportedModes.includes(CACHE_MODES.EXPLICIT) && <option value={CACHE_MODES.EXPLICIT}>显式缓存</option>}
                            </Select>
                        </div>

                        {isGeminiCacheApiFormat(settings.apiFormat) && (
                            <div>
                                <Label>响应模式</Label>
                                <Select
                                    value={settings.streamMode ? 'true' : 'false'}
                                    onChange={(event) => setField('streamMode', event.target.value === 'true')}
                                    disabled={cacheTest.isRunning}
                                >
                                    <option value="false">非流式 generateContent</option>
                                    <option value="true">流式 streamGenerateContent</option>
                                </Select>
                                <div className="mt-2 text-[11px] text-muted leading-relaxed">
                                    Wangsu/Gemini 会按所选模式请求，并从最终响应解析 usageMetadata。
                                </div>
                            </div>
                        )}

                        <div>
                            <Label>Base URL</Label>
                            <Input
                                value={settings.baseUrl}
                                onChange={(event) => setField('baseUrl', event.target.value)}
                                placeholder={providerInfo.defaultBaseUrl}
                                disabled={cacheTest.isRunning}
                            />
                            <div className="mt-2 text-[11px] text-muted break-all">
                                请求地址会归一化为：{normalizedBaseUrl || '--'}
                            </div>
                        </div>

                        <div>
                            <Label>API Key</Label>
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-3 w-4 h-4 text-muted" />
                                <Input
                                    type="password"
                                    value={settings.apiKey}
                                    onChange={(event) => setField('apiKey', event.target.value)}
                                    placeholder="输入访问令牌"
                                    disabled={cacheTest.isRunning}
                                    className="pr-10"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Model ID</Label>
                            <Input
                                value={settings.model}
                                onChange={(event) => setField('model', event.target.value)}
                                placeholder={providerInfo.defaultModel}
                                disabled={cacheTest.isRunning}
                            />
                        </div>

                        {isClaudeLikeCacheApiFormat(settings.apiFormat) && (
                            <div>
                                <Label>Claude metadata.user_id</Label>
                                <Input
                                    value={settings.claudeUserId || ''}
                                    onChange={(event) => setField('claudeUserId', event.target.value)}
                                    placeholder="opaque-user-hash"
                                    disabled={cacheTest.isRunning}
                                />
                                <div className="mt-2 text-[11px] text-muted leading-relaxed">
                                    官方说明该字段用于请求关联用户与滥用检测，不应包含姓名、邮箱或手机号；它不属于 Claude prompt cache 命中保证，可用于验证代理/网关是否按用户做请求亲和。
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>轮数</Label>
                                <Input
                                    type="number"
                                    min="2"
                                    max="12"
                                    value={settings.rounds}
                                    onChange={(event) => setField('rounds', event.target.value)}
                                    disabled={cacheTest.isRunning}
                                />
                            </div>
                            <div>
                                <Label>间隔 ms</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="30000"
                                    value={settings.interval}
                                    onChange={(event) => setField('interval', event.target.value)}
                                    disabled={cacheTest.isRunning}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Max Tokens</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={settings.maxTokens}
                                    onChange={(event) => setField('maxTokens', event.target.value)}
                                    disabled={cacheTest.isRunning}
                                />
                            </div>
                            <div>
                                <Label>Temperature</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={settings.temperature}
                                    onChange={(event) => setField('temperature', event.target.value)}
                                    disabled={cacheTest.isRunning}
                                />
                            </div>
                        </div>

                        <div className="border border-dashed border-border bg-primary/5 p-3 text-[11px] text-muted leading-relaxed">
                            <ShieldAlert className="mb-2 w-4 h-4 text-primary" />
                            API Key 会发送到你填写的 Base URL；如果使用代理，请确认它可信且会原样返回 usage 字段。
                        </div>

                        <div className="space-y-3 pt-2">
                            <Button
                                size="lg"
                                className="w-full h-14 border-2 border-primary"
                                onClick={handleStart}
                                disabled={!canStart}
                            >
                                {cacheTest.isRunning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        执行中
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        开始测试
                                    </>
                                )}
                            </Button>

                            {cacheTest.isRunning && (
                                <Button
                                    variant="destructive"
                                    size="lg"
                                    className="w-full h-12"
                                    onClick={cacheTest.stop}
                                >
                                    <Square className="w-4 h-4 mr-2" />
                                    停止
                                </Button>
                            )}

                            {!cacheTest.isRunning && cacheTest.results.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={cacheTest.clear}
                                >
                                    <RefreshCw className="w-3 h-3 mr-2" />
                                    清空结果
                                </Button>
                            )}

                            {!cacheTest.isRunning && cacheTest.results.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleCopySupportPayload}
                                >
                                    <Clipboard className="w-3 h-3 mr-2" />
                                    复制调试信息
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <div className="xl:col-span-3 space-y-6">
                    <section className="border border-border bg-black">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
                            <div className="bg-black p-4">
                                <Label>预置案例</Label>
                                <Select
                                    value={settings.presetCaseId}
                                    onChange={(event) => setField('presetCaseId', event.target.value)}
                                    disabled={cacheTest.isRunning}
                                >
                                    {CACHE_PRESET_CASES.map(preset => (
                                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="bg-black p-4">
                                <Label>案例体量</Label>
                                <Select
                                    value={settings.caseSize}
                                    onChange={(event) => setField('caseSize', event.target.value)}
                                    disabled={cacheTest.isRunning}
                                >
                                    {CACHE_CASE_SIZES.map(size => (
                                        <option key={size.id} value={size.id}>{size.label} - {size.description}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="bg-black p-4 flex items-end">
                                <Button
                                    variant="outline"
                                    className="w-full h-10 text-xs"
                                    onClick={handleApplyPreset}
                                    disabled={cacheTest.isRunning}
                                >
                                    载入案例
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-px bg-border">
                            <div className="bg-black p-4">
                                <Label>静态前缀</Label>
                                <Textarea
                                    className="min-h-[300px]"
                                    value={settings.staticPrefix}
                                    onChange={(event) => setField('staticPrefix', event.target.value)}
                                    disabled={cacheTest.isRunning}
                                />
                                <div className="mt-2 text-[11px] text-muted">
                                    固定内容约 {formatNumber(settings.staticPrefix.length)} 字符。缓存命中要求前缀保持字节级稳定。
                                </div>
                            </div>
                            <div className="bg-black p-4">
                                <Label>动态问题列表</Label>
                                <Textarea
                                    className="min-h-[300px]"
                                    value={settings.dynamicPromptsText}
                                    onChange={(event) => setField('dynamicPromptsText', event.target.value)}
                                    disabled={cacheTest.isRunning}
                                />
                                <div className="mt-2 text-[11px] text-muted">
                                    每行一个问题；测试轮次会按顺序循环取用。
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <MetricPanel
                            icon={Gauge}
                            label="总体命中率"
                            value={formatPercent(cacheTest.summary.hitRate)}
                            detail={`${formatNumber(cacheTest.summary.cachedReadTokens)} / ${formatNumber(cacheTest.summary.inputTokens)} input tokens`}
                        />
                        <MetricPanel
                            icon={Timer}
                            label="预热后命中率"
                            value={formatPercent(cacheTest.summary.warmHitRate)}
                            detail={`去掉第 1 轮：${formatNumber(cacheTest.summary.warmCachedReadTokens)} / ${formatNumber(cacheTest.summary.warmInputTokens)}`}
                        />
                        <MetricPanel
                            icon={DatabaseZap}
                            label="缓存写入"
                            value={formatNumber(cacheTest.summary.cacheCreationTokens)}
                            detail="Claude 显式缓存第一轮通常会在这里出现写入 tokens"
                        />
                        <MetricPanel
                            icon={Timer}
                            label="平均耗时"
                            value={formatDuration(cacheTest.summary.averageDuration)}
                            detail={`${cacheTest.summary.successfulRequests} 成功 / ${cacheTest.summary.failedRequests} 失败`}
                        />
                    </div>

                    {cacheTest.isRunning && (
                        <div className="font-mono text-xs text-primary">
                            <div className="flex justify-between mb-1">
                                <span>缓存测试进度</span>
                                <span>{Math.round(cacheTest.progress)}%</span>
                            </div>
                            <div className="h-4 w-full border border-primary p-0.5">
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${cacheTest.progress}%` }}
                                />
                            </div>
                            {cacheTest.cacheResource && (
                                <div className="mt-2 text-[11px] text-muted break-all">
                                    Gemini cachedContent: {cacheTest.cacheResource}
                                </div>
                            )}
                        </div>
                    )}

                    {cacheTest.error && (
                        <div className="border border-destructive p-3 text-xs text-destructive">
                            {cacheTest.error}
                        </div>
                    )}

                    {cacheTest.cacheNotice && (
                        <div className="border border-secondary bg-secondary/10 p-3 text-xs text-secondary leading-relaxed">
                            {cacheTest.cacheNotice}
                        </div>
                    )}

                    <ProviderGuide apiFormat={settings.apiFormat} cacheMode={settings.cacheMode} />

                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-bold uppercase tracking-widest text-secondary">
                            <DatabaseZap className="w-5 h-5" />
                            Round Results
                        </h3>
                        <ResultsTable results={cacheTest.results} />
                    </section>
                </div>
            </div>
        </div>
    )
}
