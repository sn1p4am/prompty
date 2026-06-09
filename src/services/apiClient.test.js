import { describe, expect, test, vi } from 'vitest'
import { streamRequest } from './apiClient'
import { PROVIDERS } from '../constants/providers'

function makeStream(chunks) {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  })
}

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

  test('uses the OpenAI-compatible chat completions endpoint for hoxkai', async () => {
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
        provider: PROVIDERS.HOXKAI,
        apiKey: 'test-key',
        baseUrl: 'https://api.hoxkai.top/v1',
        model: 'gemini-3-flash-preview',
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
    expect(fetchCalls[0].url).toBe('https://api.hoxkai.top/v1/chat/completions')
    expect(fetchCalls[0].options.headers.Authorization).toBe('Bearer test-key')
  })

  test('uses the Gemini native generateContent endpoint for wangsu non-stream requests', async () => {
    const fetchCalls = []
    const chunks = []
    const metadataCalls = []
    const onComplete = vi.fn()

    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, options })
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: 'ok' },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 12,
            candidatesTokenCount: 3,
            totalTokenCount: 15,
          },
        }),
      }
    }

    await streamRequest(
      {
        provider: PROVIDERS.WANGSU,
        apiKey: 'test-key',
        baseUrl: 'https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta',
        model: 'gemini.gemini-3-flash-preview',
        systemPrompt: 'You are concise.',
        userPrompt: 'Say OK',
        temperature: 0,
        topP: 1,
        maxTokens: 32,
        streamMode: false,
        enableThinking: false,
      },
      (chunk) => chunks.push(chunk),
      onComplete,
      (error) => {
        throw error
      },
      (metadata) => metadataCalls.push(metadata)
    )

    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0].url).toBe('https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta/models/gemini.gemini-3-flash-preview:generateContent')
    expect(fetchCalls[0].options.headers['x-goog-api-key']).toBe('test-key')
    expect(fetchCalls[0].options.headers.Authorization).toBeUndefined()

    const body = JSON.parse(fetchCalls[0].options.body)
    expect(body.systemInstruction.parts[0].text).toBe('You are concise.')
    expect(body.contents[0].parts[0].text).toBe('Say OK')
    expect(body.generationConfig).toMatchObject({
      temperature: 0,
      topP: 1,
      maxOutputTokens: 32,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    })
    expect(chunks.join('')).toBe('ok')
    expect(metadataCalls[0].provider).toBe(PROVIDERS.WANGSU)
    expect(metadataCalls[0].usage).toEqual({
      prompt_tokens: 12,
      completion_tokens: 3,
      total_tokens: 15,
      reasoning_tokens: undefined,
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('uses the Gemini native streamGenerateContent endpoint for wangsu stream requests', async () => {
    const fetchCalls = []
    const chunks = []
    const metadataCalls = []

    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, options })
      return {
        ok: true,
        body: makeStream([
          'data: {"candidates":[{"content":{"parts":[{"text":"he"}]}}]}\n\n',
          'data: {"candidates":[{"content":{"parts":[{"text":"llo"}]}}],"usageMetadata":{"promptTokenCount":12,"candidatesTokenCount":4,"totalTokenCount":16}}\n\n',
        ]),
      }
    }

    await streamRequest(
      {
        provider: PROVIDERS.WANGSU,
        apiKey: 'test-key',
        baseUrl: 'https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta',
        model: 'gemini.gemini-3-flash-preview',
        systemPrompt: '',
        userPrompt: 'Say hello',
        temperature: 0,
        topP: 1,
        maxTokens: 32,
        streamMode: true,
        enableThinking: true,
      },
      (chunk) => chunks.push(chunk),
      () => {},
      (error) => {
        throw error
      },
      (metadata) => metadataCalls.push(metadata)
    )

    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0].url).toBe('https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta/models/gemini.gemini-3-flash-preview:streamGenerateContent')
    expect(fetchCalls[0].options.headers['x-goog-api-key']).toBe('test-key')

    const body = JSON.parse(fetchCalls[0].options.body)
    expect(body.generationConfig.thinkingConfig).toBeUndefined()
    expect(chunks.join('')).toBe('hello')
    expect(metadataCalls[0].provider).toBe(PROVIDERS.WANGSU)
    expect(metadataCalls[0].usage.total_tokens).toBe(16)
  })

  test('omits optional sampling parameters when they are disabled', async () => {
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
        provider: PROVIDERS.CLOUDSWAY,
        apiKey: 'test-key',
        baseUrl: 'https://genaiapi.cloudsway.net/v1/ai/app-id',
        model: 'opaque-cloudsway-claude-id',
        systemPrompt: 'You are concise.',
        userPrompt: 'Say OK',
        temperature: '',
        topP: '',
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
    expect(body.temperature).toBeUndefined()
    expect(body.top_p).toBeUndefined()
  })
})
