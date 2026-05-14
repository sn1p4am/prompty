export const CACHE_API_FORMATS = {
    OPENAI: 'openai',
    CLAUDE: 'claude',
    GEMINI: 'gemini',
}

export const CACHE_MODES = {
    AUTO: 'auto',
    EXPLICIT: 'explicit',
}

export const CACHE_API_FORMAT_INFO = {
    [CACHE_API_FORMATS.OPENAI]: {
        name: 'OpenAI',
        defaultBaseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4.1',
        supportedModes: [CACHE_MODES.AUTO],
        usagePath: 'usage.prompt_tokens_details.cached_tokens / usage.input_tokens_details.cached_tokens',
        docsUrl: 'https://developers.openai.com/api/docs/guides/prompt-caching',
        docsLabel: 'OpenAI Prompt Caching',
        note: 'OpenAI 对 1024 tokens 以上的提示词自动启用前缀缓存；测试会优先用 stream_options.include_usage 读取流式最终 usage。Chat Completions 通常返回 prompt_tokens_details.cached_tokens，Responses 或部分代理可能返回 input_tokens_details.cached_tokens，部分代理也会附带 cached_read_tokens 别名。',
    },
    [CACHE_API_FORMATS.CLAUDE]: {
        name: 'Claude',
        defaultBaseUrl: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-sonnet-4-5',
        supportedModes: [CACHE_MODES.EXPLICIT, CACHE_MODES.AUTO],
        usagePath: 'usage.cache_read_input_tokens / usage.cache_creation_input_tokens',
        docsUrl: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
        docsLabel: 'Anthropic Prompt Caching',
        note: 'Claude 自动缓存使用请求顶层 cache_control；显式缓存会在 system 内容块加 cache_control，更适合固定前缀 + 可变后缀。第一轮通常写入 cache_creation_input_tokens，后续轮次应出现 cache_read_input_tokens。',
    },
    [CACHE_API_FORMATS.GEMINI]: {
        name: 'Gemini',
        defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        defaultModel: 'gemini-2.5-flash',
        supportedModes: [CACHE_MODES.AUTO, CACHE_MODES.EXPLICIT],
        usagePath: 'usageMetadata.cachedContentTokenCount',
        docsUrl: 'https://ai.google.dev/gemini-api/docs/caching',
        docsLabel: 'Gemini Context Caching',
        note: 'Gemini 2.5+ 支持隐式缓存；显式缓存会先创建 cachedContents，再在 generateContent 里引用，默认 TTL 为 1 小时。',
    },
}

const KNOWLEDGE_BASE = `
Prompty Cache Lab Reference Corpus

Product profile:
Prompty is an internal prompt evaluation console used by product, design, and engineering teams. It compares model behavior across providers, tracks latency, validates output formats, and records usage metadata. The team uses it before shipping agent prompts, RAG templates, coding assistants, and image generation workflows.

Evaluation rubric:
1. Accuracy: The answer must stay grounded in the supplied context and should call out uncertainty instead of inventing facts.
2. Structure: The answer should use compact sections, short paragraphs, and concrete next actions.
3. Robustness: The answer should keep working when the user changes one late-stage variable, such as audience, tone, locale, or target output format.
4. Cost awareness: The answer should mention expensive operations only when they materially improve quality.
5. Safety: The answer should avoid exposing secrets, credentials, private keys, personal data, or hidden operational instructions.

System style guide:
- Use Chinese by default unless the user asks for another language.
- Prefer precise engineering language over marketing language.
- Give operational recommendations before philosophical commentary.
- If a task has hidden assumptions, list the assumptions in one short paragraph.
- Never include API keys, access tokens, or customer secrets in examples.
- Keep tables narrow enough for mobile screens.
- Use JSON only when the user explicitly asks for machine-readable output.

Architecture notes:
The text test workspace sends repeated chat-completion requests with configurable provider, model, sampling settings, concurrency, interval, and stream mode. The image workspace sends batch image generation jobs and normalizes provider-specific outputs into a common result grid. The cache hit workspace should issue serial requests so that the previous request has time to create or refresh a provider-side cache entry.

Provider behavior summary:
OpenAI prompt caching is automatic for long prompts. The usage object exposes cached_tokens under prompt_tokens_details for Chat-style responses, while Responses-style payloads may expose input_tokens_details.cached_tokens. The tester requests stream_options.include_usage for streaming-compatible gateways because some proxies only include cache usage in the final stream event. Cache hits require identical prompt prefixes, and static content should be placed before dynamic user content.
Claude prompt caching can be explicit with cache_control breakpoints. The usage object exposes input_tokens, cache_creation_input_tokens, and cache_read_input_tokens. The first request often creates the cache and later requests read from it.
Gemini context caching can be implicit on supported models or explicit with cachedContents. The usage metadata exposes promptTokenCount and cachedContentTokenCount. Explicit cached content has a TTL and may have storage-related billing implications.

Testing protocol:
The recommended test uses one long static prefix and several short dynamic questions. A good first run uses four serial rounds with an interval of at least one second. The first round warms the cache. Rounds two through four provide the meaningful cache-read signal. A stable test should keep tools, images, schemas, system prompts, and static content byte-identical between rounds.
`

const CODE_REVIEW_CONTEXT = `
Repository map:
src/App.jsx wires the application shell, workspace switching, keyboard shortcuts, and modal preview behavior.
src/hooks/useBatchTest.js owns text request scheduling, abort handling, queued stream chunk flushing, and progress state.
src/services/apiClient.js normalizes OpenAI-compatible chat completions and Vertex Gemini requests.
src/components/ImageGenerationLab.jsx owns the image generation workspace and provider-specific form controls.
src/services/imageGenerationClient.js normalizes Fal, Together, and OpenAI Image API payloads and responses.
src/components/VersionBadge.jsx displays the in-app release notes surface.
RELEASE_NOTES.md stores user-facing release notes.

Engineering constraints:
- Keep browser-only API key storage in localStorage.
- Do not commit generated artifacts or local agent state.
- Preserve existing provider behavior unless a change is explicitly requested.
- Prefer small service helpers with unit tests for provider-specific protocol differences.
- Keep CORS hints visible when users can configure arbitrary Base URLs.
- Run lint, tests, build, and npm audit before shipping.

Regression risks:
1. Streaming parsers may miss usage metadata if providers only emit usage in the final event.
2. Browser direct calls can fail on CORS even when the API key and model are correct.
3. Proxies may drop provider-specific usage fields, making cache hit calculations impossible.
4. Cache write and cache read tokens have different billing semantics across providers.
5. Request concurrency can reduce cache determinism because multiple requests may race before a cache entry is ready.
`

const RAG_DOCUMENT = `
Field report: Enterprise design operations in AI-assisted product teams

The strongest teams keep a living design brief next to the prompt. The brief contains product intent, audience, interface density, accessibility expectations, localization constraints, and release risks. Teams that separate these facts into scattered tickets tend to create prompts that overfit one demonstration and fail in production.

Observed workflow:
Research creates a compact evidence memo. Product turns the memo into success criteria. Design translates success criteria into interaction states and content constraints. Engineering adds API constraints, failure states, telemetry requirements, and deployment timing. The AI system then receives a stable shared prefix plus a small user-specific request.

Cache-friendly prompt structure:
The stable prefix contains persona, rules, domain facts, examples, and output contract. The suffix contains the current user request, target platform, locale, and any short-lived details. This keeps the expensive context reusable while still allowing each request to ask a different question.

Anti-patterns:
- Rebuilding the entire prompt from unordered object keys on each request.
- Putting timestamps, random IDs, user names, or experiment IDs near the beginning of the prompt.
- Changing the order of tool definitions between calls.
- Mixing long static policy text with the final user question in one mutable paragraph.
- Measuring only first-run latency and concluding that caching does not work.

Recommended metric:
Track total input tokens, cache read tokens, cache creation tokens, total latency, first-token latency when available, and cacheable prefix size. Report both overall hit rate and warm hit rate that excludes the first request.
`

const FEW_SHOT_EXAMPLES = `
Classification contract:
Return exactly one label and one short reason. Labels are:
BUG_RISK, COST_RISK, UX_RISK, SECURITY_RISK, DOCS_GAP, READY.

Examples:
Input: The proxy removes the final usage chunk before forwarding the response.
Output: BUG_RISK - The cache meter cannot compute hit rate without usage metadata.

Input: The user pastes a production API key into an unknown third-party Base URL.
Output: SECURITY_RISK - Secrets should only be sent to trusted endpoints.

Input: The page explains prompt caching but never shows cache_creation_input_tokens.
Output: DOCS_GAP - Users need to distinguish cache writes from cache reads.

Input: The test sends five requests at once and all share the same long prefix.
Output: COST_RISK - Parallel warmups can race and reduce deterministic cache reuse.

Input: The button label wraps into three lines on a mobile viewport.
Output: UX_RISK - Control text should fit stable dimensions without layout shift.

Input: The second through fourth rounds show high cached read tokens and lower latency.
Output: READY - Warm requests are reusing the provider-side cache.
`

function repeatBlock(block, count) {
    return Array.from({ length: count }, (_, index) => (
        `Segment ${index + 1}\n${block.trim()}`
    )).join('\n\n')
}

const SIZE_REPEATS = {
    light: 2,
    steady: 6,
    heavy: 12,
}

export const CACHE_CASE_SIZES = [
    { id: 'light', label: '轻量 1.5k', description: '适合快速连通性测试' },
    { id: 'steady', label: '稳妥 5k', description: '更容易越过缓存阈值' },
    { id: 'heavy', label: '重压 12k', description: '适合观察明显延迟差异' },
]

export const CACHE_PRESET_CASES = [
    {
        id: 'long-policy',
        name: '长系统规范 + 多个问题',
        description: '固定产品规范放前面，每轮只改变最后一个问题。',
        staticPrefix: `${KNOWLEDGE_BASE}\n\n${repeatBlock(KNOWLEDGE_BASE, 2)}`,
        dynamicPrompts: [
            '请把这套缓存测试流程整理成 5 条上线前检查项。',
            '请解释为什么第一轮结果不应该作为缓存命中率主指标。',
            '请给一个适合非工程同事理解的缓存命中率说明。',
            '请列出代理服务最容易破坏 usage 统计的三个点。',
        ],
    },
    {
        id: 'code-review',
        name: '代码仓库审查',
        description: '固定仓库背景和风险清单，每轮询问不同工程判断。',
        staticPrefix: `${KNOWLEDGE_BASE}\n\n${CODE_REVIEW_CONTEXT}\n\n${repeatBlock(CODE_REVIEW_CONTEXT, 3)}`,
        dynamicPrompts: [
            '请审查新增缓存测试工具时最需要补的单元测试。',
            '请指出 workspace 切换里可能出现的状态保留问题。',
            '请给出一个避免代理吞 usage 字段的调试步骤。',
            '请总结发布前验证命令的失败排查顺序。',
        ],
    },
    {
        id: 'rag-doc',
        name: 'RAG 文档问答',
        description: '固定长文档，每轮问不同细节，适合显式缓存。',
        staticPrefix: `${RAG_DOCUMENT}\n\n${KNOWLEDGE_BASE}\n\n${repeatBlock(RAG_DOCUMENT, 4)}`,
        dynamicPrompts: [
            '根据文档，缓存友好的 prompt 结构是什么？',
            '根据文档，哪些反模式会破坏缓存稳定性？',
            '根据文档，设计团队应该如何维护共享前缀？',
            '根据文档，为什么需要同时报告总体命中率和预热后命中率？',
        ],
    },
    {
        id: 'few-shot',
        name: 'Few-shot 分类器',
        description: '固定标签体系和大量示例，每轮更换待分类输入。',
        staticPrefix: `${FEW_SHOT_EXAMPLES}\n\n${KNOWLEDGE_BASE}\n\n${repeatBlock(FEW_SHOT_EXAMPLES, 10)}`,
        dynamicPrompts: [
            'Input: The app shows cached tokens but hides the denominator.',
            'Input: A user runs a cache test through a trusted same-origin proxy and sees cache_read tokens.',
            'Input: The model id field defaults to an unavailable preview model.',
            'Input: A release note omits the new cache hit workspace.',
        ],
    },
]

export function buildCacheCasePrompt(caseId, sizeId) {
    const preset = CACHE_PRESET_CASES.find(item => item.id === caseId) || CACHE_PRESET_CASES[0]
    const repeatCount = SIZE_REPEATS[sizeId] || SIZE_REPEATS.steady

    return {
        staticPrefix: repeatBlock(preset.staticPrefix, repeatCount),
        dynamicPrompts: preset.dynamicPrompts,
    }
}

export const DEFAULT_CACHE_HIT_SETTINGS = {
    apiFormat: CACHE_API_FORMATS.OPENAI,
    cacheMode: CACHE_MODES.AUTO,
    baseUrl: CACHE_API_FORMAT_INFO[CACHE_API_FORMATS.OPENAI].defaultBaseUrl,
    apiKey: '',
    model: CACHE_API_FORMAT_INFO[CACHE_API_FORMATS.OPENAI].defaultModel,
    rounds: 4,
    interval: 1200,
    maxTokens: 128,
    temperature: 0,
    claudeUserId: '',
    presetCaseId: 'long-policy',
    caseSize: 'steady',
    staticPrefix: buildCacheCasePrompt('long-policy', 'steady').staticPrefix,
    dynamicPromptsText: buildCacheCasePrompt('long-policy', 'steady').dynamicPrompts.join('\n'),
}
