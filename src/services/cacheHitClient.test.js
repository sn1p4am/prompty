import { describe, expect, test, vi } from 'vitest'
import { CACHE_API_FORMATS, CACHE_MODES } from '../constants/cacheHit'
import {
  calculateCacheSummary,
  normalizeCacheBaseUrl,
  runCacheHitTest,
} from './cacheHitClient'

function jsonResponse(body, ok = true, status = 200, headers = {}) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    headers: new Headers(headers),
    text: async () => JSON.stringify(body),
  }
}

function sseResponse(events, ok = true, status = 200, headers = {}) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    headers: new Headers(headers),
    text: async () => `${events.map(event => `data: ${JSON.stringify(event)}`).join('\n\n')}\n\ndata: [DONE]\n\n`,
  }
}

describe('normalizeCacheBaseUrl', () => {
  test('normalizes provider defaults and custom paths', () => {
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.OPENAI, 'api.openai.com')).toBe('https://api.openai.com/v1')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.OPENAI, 'https://proxy.test/v1/chat/completions')).toBe('https://proxy.test/v1')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.CLAUDE, 'https://proxy.test/anthropic')).toBe('https://proxy.test/anthropic/v1')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.CLAUDE, 'https://proxy.test/anthropic/v1/messages')).toBe('https://proxy.test/anthropic/v1')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.WANGSU_ANTHROPIC, 'https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic')).toBe('https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic/v1')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.WANGSU_ANTHROPIC, 'https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic/v1/messages')).toBe('https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic/v1')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.GEMINI, 'https://proxy.test/google/v1beta')).toBe('https://proxy.test/google/v1beta')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.GEMINI, 'https://proxy.test/google/v1beta/cachedContents')).toBe('https://proxy.test/google/v1beta')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.GEMINI, 'https://proxy.test/google/v1beta/models/google/gemini-3-flash-preview:generateContent')).toBe('https://proxy.test/google/v1beta')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.GEMINI, 'https://proxy.test/google/v1beta/models/google/gemini-3-flash-preview:streamGenerateContent')).toBe('https://proxy.test/google/v1beta')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.GEMINI, 'https://api.ofox.ai/gemini')).toBe('https://api.ofox.ai/gemini/v1beta')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.WANGSU_GEMINI, 'https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini')).toBe('https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.WANGSU_GEMINI, 'https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta/models/gemini.gemini-3-flash-preview:streamGenerateContent')).toBe('https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.OPENAI, '/api/openai')).toBe('/api/openai')
    expect(normalizeCacheBaseUrl(CACHE_API_FORMATS.OPENAI, '/api/openai/chat/completions')).toBe('/api/openai')
  })
})

describe('calculateCacheSummary', () => {
  test('calculates total and warm hit rates', () => {
    const summary = calculateCacheSummary([
      {
        status: 'success',
        durationMs: 100,
        usage: { inputTokens: 1000, cachedReadTokens: 0, cacheCreationTokens: 1000, outputTokens: 20 },
      },
      {
        status: 'success',
        durationMs: 60,
        usage: { inputTokens: 1000, cachedReadTokens: 800, cacheCreationTokens: 0, outputTokens: 20 },
      },
      {
        status: 'failed',
        durationMs: 0,
      },
    ])

    expect(summary.hitRate).toBe(0.4)
    expect(summary.warmHitRate).toBe(0.8)
    expect(summary.cacheCreationTokens).toBe(1000)
    expect(summary.successfulRequests).toBe(2)
    expect(summary.failedRequests).toBe(1)
  })
})

describe('runCacheHitTest provider usage parsing', () => {
  test('reads OpenAI cached_tokens from prompt token details', async () => {
    const fetchMock = vi.fn(async () => sseResponse([
      { choices: [{ delta: { content: 'ok' } }] },
      {
        choices: [],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 12,
          total_tokens: 1212,
          prompt_tokens_details: {
            cached_read_tokens: 1024,
          },
        },
      },
    ]))
    globalThis.fetch = fetchMock

    const { results, summary } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.OPENAI,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1',
      staticPrefix: 'static '.repeat(300),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 32,
      temperature: 0,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.stream).toBe(true)
    expect(body.stream_options).toEqual({ include_usage: true })
    expect(results[0].content).toBe('ok')
    expect(results[0].usage.cachedReadTokens).toBe(1024)
    expect(summary.hitRate).toBeCloseTo(1024 / 1200)
  })

  test('falls back to non-stream OpenAI usage when streaming usage is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sseResponse([{ choices: [{ delta: { content: 'ok' } }] }]))
      .mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { content: 'fallback ok' } }],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 12,
          total_tokens: 1212,
          prompt_tokens_details: {
            cached_tokens: 1024,
          },
        },
      }))
      .mockResolvedValueOnce(sseResponse([{ choices: [{ delta: { content: 'ok' } }] }]))
      .mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { content: 'fallback ok' } }],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 12,
          total_tokens: 1212,
          prompt_tokens_details: {
            cached_tokens: 1024,
          },
        },
      }))
    globalThis.fetch = fetchMock

    const { results } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.OPENAI,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1',
      staticPrefix: 'static '.repeat(300),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 32,
      temperature: 0,
    })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(results[0].content).toBe('fallback ok')
    expect(results[0].usage.cachedReadTokens).toBe(1024)
  })

  test('reads non-stream OpenAI cached_tokens from prompt token details', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 12,
        total_tokens: 1212,
        prompt_tokens_details: {
          cached_tokens: 1024,
        },
      },
    }))
    globalThis.fetch = fetchMock

    const { results, summary } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.OPENAI,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1',
      staticPrefix: 'static '.repeat(300),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 32,
      temperature: 0,
    })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(results[0].usage.cachedReadTokens).toBe(1024)
    expect(summary.hitRate).toBeCloseTo(1024 / 1200)
  })

  test('reads OpenAI-compatible Responses-style cached tokens', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {
        input_tokens: 1200,
        output_tokens: 12,
        total_tokens: 1212,
        input_tokens_details: {
          cached_tokens: 960,
        },
      },
    }))
    globalThis.fetch = fetchMock

    const { results, summary } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.OPENAI,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.5',
      staticPrefix: 'static '.repeat(300),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 32,
      temperature: 0,
    })

    expect(results[0].usage.inputTokens).toBe(1200)
    expect(results[0].usage.cachedReadTokens).toBe(960)
    expect(results[0].usage.outputTokens).toBe(12)
    expect(summary.hitRate).toBeCloseTo(960 / 1200)
  })

  test('reads Claude cache read and creation tokens', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: {
        input_tokens: 120,
        cache_creation_input_tokens: 900,
        cache_read_input_tokens: 0,
        output_tokens: 20,
      },
    }))
    globalThis.fetch = fetchMock

    const { results } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.CLAUDE,
      cacheMode: CACHE_MODES.EXPLICIT,
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-sonnet-4-5',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 1,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
      claudeUserId: 'anon-user-hash',
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.system[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(requestBody.metadata).toEqual({ user_id: 'anon-user-hash' })
    expect(results[0].usage.inputTokens).toBe(1020)
    expect(results[0].usage.cacheCreationTokens).toBe(900)
  })

  test('sends Claude top-level cache_control for automatic mode', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: {
        input_tokens: 120,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 900,
        output_tokens: 20,
      },
    }))
    globalThis.fetch = fetchMock

    await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.CLAUDE,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-sonnet-4-5',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.cache_control).toEqual({ type: 'ephemeral' })
    expect(requestBody.system[0].cache_control).toBeUndefined()
  })

  test('runs Wangsu Anthropic cache rounds through native messages', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      content: [{ type: 'text', text: 'ok' }],
      usage: {
        input_tokens: 120,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 900,
        output_tokens: 20,
      },
    }, true, 200, {
      'x-ws-request-id': 'req-wangsu-anthropic-round',
    }))
    globalThis.fetch = fetchMock

    const { results, summary } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.WANGSU_ANTHROPIC,
      cacheMode: CACHE_MODES.EXPLICIT,
      apiKey: 'test-key',
      baseUrl: 'https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic',
      model: 'anthropic.claude-sonnet-4-6',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
      claudeUserId: 'anon-user-hash',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic/v1/messages')
    expect(fetchMock.mock.calls[0][1].headers['X-Api-Key']).toBe('test-key')
    expect(fetchMock.mock.calls[0][1].headers['x-api-key']).toBeUndefined()
    expect(fetchMock.mock.calls[0][1].headers['anthropic-version']).toBe('2023-06-01')

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.model).toBe('anthropic.claude-sonnet-4-6')
    expect(requestBody.system[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(requestBody.metadata).toEqual({ user_id: 'anon-user-hash' })
    expect(results[0].usage.inputTokens).toBe(1020)
    expect(results[0].usage.cachedReadTokens).toBe(900)
    expect(results[0].debug.responseHeaders['x-ws-request-id']).toBe('req-wangsu-anthropic-round')
    expect(summary.hitRate).toBeCloseTo(900 / 1020)
  })

  test('uses x-goog-api-key auth for custom Gemini native proxies', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      usageMetadata: {
        promptTokenCount: 1400,
        cachedContentTokenCount: 1000,
        candidatesTokenCount: 16,
        totalTokenCount: 1416,
      },
    }, true, 200, {
      'x-request-id': 'req-gemini-round',
      'x-cloud-trace-context': 'trace-id/123;o=1',
    }))
    globalThis.fetch = fetchMock

    const { results } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.GEMINI,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://api.ofox.ai/gemini',
      model: 'google/gemini-3-flash-preview',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ofox.ai/gemini/v1beta/models/google/gemini-3-flash-preview:generateContent')
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
    expect(results[0].usage.cachedReadTokens).toBe(1000)
    expect(results[0].debug.responseHeaders['x-request-id']).toBe('req-gemini-round')
    expect(results[0].debug.responseHeaders['x-cloud-trace-context']).toBe('trace-id/123;o=1')
  })

  test('runs Wangsu Gemini cache rounds through non-stream generateContent', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      usageMetadata: {
        promptTokenCount: 1400,
        cachedContentTokenCount: 1000,
        candidatesTokenCount: 16,
        totalTokenCount: 1416,
      },
    }, true, 200, {
      'x-ws-request-id': 'req-wangsu-round',
    }))
    globalThis.fetch = fetchMock

    const { results } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.WANGSU_GEMINI,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini',
      model: 'gemini.gemini-3-flash-preview',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
      streamMode: false,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta/models/gemini.gemini-3-flash-preview:generateContent')
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).cachedContent).toBeUndefined()
    expect(results[0].usage.cachedReadTokens).toBe(1000)
    expect(results[0].debug.responseHeaders['x-ws-request-id']).toBe('req-wangsu-round')
  })

  test('runs Wangsu Gemini cache rounds through streamGenerateContent when enabled', async () => {
    const fetchMock = vi.fn(async () => sseResponse([
      { candidates: [{ content: { parts: [{ text: 'ok' }] } }] },
      {
        candidates: [],
        usageMetadata: {
          promptTokenCount: 1400,
          cachedContentTokenCount: 1000,
          candidatesTokenCount: 16,
          totalTokenCount: 1416,
        },
      },
    ]))
    globalThis.fetch = fetchMock

    const { results, summary } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.WANGSU_GEMINI,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta',
      model: 'gemini.gemini-3-flash-preview',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
      streamMode: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta/models/gemini.gemini-3-flash-preview:streamGenerateContent')
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key')
    expect(results[0].content).toBe('ok')
    expect(results[0].usage.cachedReadTokens).toBe(1000)
    expect(summary.hitRate).toBeCloseTo(1000 / 1400)
  })

  test('falls back to Bearer auth when a Gemini native proxy rejects API key auth', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        error: {
          message: 'You need to provide your API key in an Authorization header using Bearer auth.',
        },
      }, false, 401))
      .mockResolvedValueOnce(jsonResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        usageMetadata: {
          promptTokenCount: 1400,
          cachedContentTokenCount: 1000,
          candidatesTokenCount: 16,
          totalTokenCount: 1416,
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        candidates: [{ content: { parts: [{ text: 'ok again' }] } }],
        usageMetadata: {
          promptTokenCount: 1400,
          cachedContentTokenCount: 1000,
          candidatesTokenCount: 16,
          totalTokenCount: 1416,
        },
      }))
    globalThis.fetch = fetchMock

    const { results } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.GEMINI,
      cacheMode: CACHE_MODES.AUTO,
      apiKey: 'test-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-flash',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key')
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer test-key')
    expect(results[0].usage.cachedReadTokens).toBe(1000)
  })

  test('creates and deletes Gemini explicit cachedContents', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ name: 'cachedContents/cache-123' }))
      .mockResolvedValueOnce(jsonResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        usageMetadata: {
          promptTokenCount: 1400,
          cachedContentTokenCount: 1000,
          candidatesTokenCount: 16,
          totalTokenCount: 1416,
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        candidates: [{ content: { parts: [{ text: 'ok again' }] } }],
        usageMetadata: {
          promptTokenCount: 1400,
          cachedContentTokenCount: 1000,
          candidatesTokenCount: 16,
          totalTokenCount: 1416,
        },
      }))
      .mockResolvedValueOnce(jsonResponse({}))
    globalThis.fetch = fetchMock

    const { results } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.GEMINI,
      cacheMode: CACHE_MODES.EXPLICIT,
      apiKey: 'test-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-flash',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
    })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/cachedContents')
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('models/gemini-2.5-flash')
    expect(fetchMock.mock.calls[1][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent')
    expect(fetchMock.mock.calls[1][1].headers['x-goog-api-key']).toBe('test-key')
    expect(fetchMock.mock.calls[3][0]).toBe('https://generativelanguage.googleapis.com/v1beta/cachedContents/cache-123')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).cachedContent).toBe('cachedContents/cache-123')
    expect(results[0].usage.cachedReadTokens).toBe(1000)
  })

  test('falls back to Gemini implicit caching when cachedContents is unsupported', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        error: {
          message: 'Unsupported Gemini API endpoint. Please refer to https://docs.ofox.ai/api for available endpoints.',
        },
      }, false, 404, {
        'x-request-id': 'req-cache-create',
        'x-cloud-trace-context': 'cache-trace/456;o=1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        usageMetadata: {
          promptTokenCount: 1400,
          cachedContentTokenCount: 0,
          candidatesTokenCount: 16,
          totalTokenCount: 1416,
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        candidates: [{ content: { parts: [{ text: 'ok again' }] } }],
        usageMetadata: {
          promptTokenCount: 1400,
          cachedContentTokenCount: 1000,
          candidatesTokenCount: 16,
          totalTokenCount: 1416,
        },
      }))
    globalThis.fetch = fetchMock
    const onCacheFallback = vi.fn()

    const { results, summary } = await runCacheHitTest({
      apiFormat: CACHE_API_FORMATS.GEMINI,
      cacheMode: CACHE_MODES.EXPLICIT,
      apiKey: 'test-key',
      baseUrl: 'https://api.ofox.ai/gemini',
      model: 'google/gemini-3-flash-preview',
      staticPrefix: 'static '.repeat(800),
      dynamicPromptsText: 'question',
      rounds: 2,
      interval: 0,
      maxTokens: 64,
      temperature: 0,
    }, {
      onCacheFallback,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ofox.ai/gemini/v1beta/cachedContents')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('models/google/gemini-3-flash-preview')
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.ofox.ai/gemini/v1beta/models/google/gemini-3-flash-preview:generateContent')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).cachedContent).toBeUndefined()
    expect(onCacheFallback).toHaveBeenCalledWith('当前 Gemini Base URL 的 cachedContents 创建请求返回 unsupported，已自动降级为 generateContent 隐式缓存测试。')
    expect(results[0].debug.cacheCreate.httpStatus).toBe(404)
    expect(results[0].debug.cacheCreate.responseHeaders['x-request-id']).toBe('req-cache-create')
    expect(results[0].debug.cacheCreate.responseHeaders['x-cloud-trace-context']).toBe('cache-trace/456;o=1')
    expect(results[1].usage.cachedReadTokens).toBe(1000)
    expect(summary.warmHitRate).toBeCloseTo(1000 / 1400)
  })
})
