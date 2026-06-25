function toNumber(value) {
    const number = Number(value)
    return Number.isFinite(number) ? number : 0
}

export function getReasoningTokens(usage = {}) {
    return toNumber(
        usage.reasoning_tokens
        ?? usage.reasoning_content_tokens
        ?? usage.thoughtsTokenCount
        ?? usage.thoughtTokenCount
        ?? usage.completion_tokens_details?.reasoning_tokens
        ?? usage.completion_tokens_details?.reasoning_content_tokens
        ?? usage.output_tokens_details?.reasoning_tokens
        ?? usage.output_tokens_details?.reasoning_content_tokens
    )
}

export function getPromptTokens(usage = {}) {
    return toNumber(
        usage.prompt_tokens
        ?? usage.input_tokens
        ?? usage.promptTokenCount
    )
}

export function getCompletionTokens(usage = {}) {
    return toNumber(
        usage.completion_tokens
        ?? usage.output_tokens
        ?? usage.candidatesTokenCount
    )
}

export function getTotalTokens(usage = {}) {
    const promptTokens = getPromptTokens(usage)
    const completionTokens = getCompletionTokens(usage)

    return toNumber(
        usage.total_tokens
        ?? usage.totalTokenCount
    ) || promptTokens + completionTokens
}

export function getVisibleCompletionTokens(usage = {}) {
    return Math.max(getCompletionTokens(usage) - getReasoningTokens(usage), 0)
}

export function getVisibleTokenSpeed(usage, totalDurationMs) {
    const durationSeconds = toNumber(totalDurationMs) / 1000
    if (!durationSeconds) {
        return 0
    }

    return getVisibleCompletionTokens(usage) / durationSeconds
}

export function formatTokenSpeed(usage, totalDurationMs) {
    return getVisibleTokenSpeed(usage, totalDurationMs).toFixed(1)
}

export function formatTokenSummary(usage = {}) {
    const promptTokens = getPromptTokens(usage)
    const completionTokens = getCompletionTokens(usage)
    const reasoningTokens = getReasoningTokens(usage)
    const totalTokens = getTotalTokens(usage)

    return {
        promptTokens,
        completionTokens,
        reasoningTokens,
        visibleCompletionTokens: Math.max(completionTokens - reasoningTokens, 0),
        totalTokens,
    }
}
