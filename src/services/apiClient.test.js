import { describe, expect, test } from 'vitest'
import { streamRequest } from './apiClient'
import { PROVIDERS } from '../constants/providers'

describe('streamRequest Claude parameter handling', () => {
  test('does not send both temperature and top_p for Claude-compatible requests', async () => {
    const fetchCalls = []

    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, options })
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'ok',
              },
            },
          ],
        }),
      }
    }

    await streamRequest(
      {
        provider: PROVIDERS.MOXIN,
        apiKey: 'test-key',
        baseUrl: 'https://www.moxin.studio/v1',
        model: 'anthropic/claude-sonnet-4.5',
        systemPrompt: 'You are concise.',
        userPrompt: 'Say OK',
        temperature: 1,
        topP: 1,
        maxTokens: undefined,
        streamMode: false,
        enableThinking: false,
      },
      () => {},
      () => {},
      (error) => {
        throw error
      },
      () => {}
    )

    expect(fetchCalls).toHaveLength(1)

    const body = JSON.parse(fetchCalls[0].options.body)
    expect(body.temperature).toBe(1)
    expect(body.top_p).toBeUndefined()
  })
})
