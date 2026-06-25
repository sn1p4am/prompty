import { describe, expect, test } from 'vitest'
import {
  formatTokenSpeed,
  formatTokenSummary,
  getReasoningTokens,
  getVisibleCompletionTokens,
} from './tokenUsage'

describe('token usage helpers', () => {
  test('subtracts OpenAI-compatible reasoning tokens from visible completion speed', () => {
    const usage = {
      prompt_tokens: 10,
      completion_tokens: 2465,
      total_tokens: 2475,
      completion_tokens_details: {
        reasoning_tokens: 837,
      },
    }

    expect(getReasoningTokens(usage)).toBe(837)
    expect(getVisibleCompletionTokens(usage)).toBe(1628)
    expect(formatTokenSpeed(usage, 24200)).toBe('67.3')
    expect(formatTokenSummary(usage)).toEqual({
      promptTokens: 10,
      completionTokens: 2465,
      reasoningTokens: 837,
      visibleCompletionTokens: 1628,
      totalTokens: 2475,
    })
  })

  test('keeps plain completion speed when no reasoning tokens are reported', () => {
    const usage = {
      prompt_tokens: 10,
      completion_tokens: 1342,
      total_tokens: 1352,
    }

    expect(formatTokenSpeed(usage, 21140)).toBe('63.5')
  })

  test('supports native Gemini usage field names', () => {
    const usage = {
      promptTokenCount: 4,
      candidatesTokenCount: 60,
      thoughtsTokenCount: 51,
      totalTokenCount: 115,
    }

    expect(formatTokenSummary(usage)).toEqual({
      promptTokens: 4,
      completionTokens: 60,
      reasoningTokens: 51,
      visibleCompletionTokens: 9,
      totalTokens: 115,
    })
  })

  test('does not allow reasoning tokens to make visible output negative', () => {
    expect(getVisibleCompletionTokens({
      completion_tokens: 10,
      reasoning_tokens: 20,
    })).toBe(0)
  })
})
