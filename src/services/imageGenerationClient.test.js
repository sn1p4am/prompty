import { describe, expect, test, vi } from 'vitest'
import { IMAGE_GENERATION_PROVIDERS } from '../constants/imageGeneration'
import {
  buildFalImageGenerationPayload,
  buildOpenAIImageGenerationPayload,
  buildTogetherImageGenerationPayload,
  generateImage,
} from './imageGenerationClient'

describe('fal.ai image generation client', () => {
  test('builds the FLUX schnell payload with documented field names', () => {
    const payload = buildFalImageGenerationPayload({
      prompt: 'A luminous green terminal floating in space',
      numInferenceSteps: '4',
      imageSizePreset: 'landscape_4_3',
      seed: '1234',
      guidanceScale: '3.5',
      syncMode: false,
      numImages: '2',
      enableSafetyChecker: true,
      outputFormat: 'jpeg',
      acceleration: 'regular',
    })

    expect(payload).toEqual({
      prompt: 'A luminous green terminal floating in space',
      num_inference_steps: 4,
      image_size: 'landscape_4_3',
      seed: 1234,
      guidance_scale: 3.5,
      sync_mode: false,
      num_images: 2,
      enable_safety_checker: true,
      output_format: 'jpeg',
      acceleration: 'regular',
    })
  })

  test('supports custom image dimensions', () => {
    const payload = buildFalImageGenerationPayload({
      prompt: 'Custom size image',
      imageSizePreset: 'custom',
      customWidth: '768',
      customHeight: '512',
      numInferenceSteps: 4,
      guidanceScale: 3.5,
      numImages: 1,
      enableSafetyChecker: true,
      outputFormat: 'png',
      acceleration: 'high',
    })

    expect(payload.image_size).toEqual({
      width: 768,
      height: 512,
    })
    expect(payload.output_format).toBe('png')
    expect(payload.acceleration).toBe('high')
  })

  test('posts to the fal.run model endpoint with Key authorization', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({
        images: [
          {
            url: 'https://example.com/image.jpeg',
            content_type: 'image/jpeg',
            width: 1024,
            height: 768,
          },
        ],
        seed: 42,
        prompt: 'Generate one image',
        timings: {
          inference: 0.8,
        },
      }),
    }))
    globalThis.fetch = fetchMock

    const result = await generateImage({
      provider: IMAGE_GENERATION_PROVIDERS.FAL,
      apiKey: 'fal-test-key',
      model: 'fal-ai/flux-1/schnell',
      settings: {
        prompt: 'Generate one image',
        numInferenceSteps: 4,
        imageSizePreset: 'landscape_4_3',
        guidanceScale: 3.5,
        numImages: 1,
        enableSafetyChecker: true,
        outputFormat: 'jpeg',
        acceleration: 'regular',
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://fal.run/fal-ai/flux-1/schnell')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Key fal-test-key')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).prompt).toBe('Generate one image')
    expect(result.images).toHaveLength(1)
    expect(result.images[0].width).toBe(1024)
    expect(result.seed).toBe(42)
    expect(result.timings).toEqual({ inference: 0.8 })
    expect(result.clientTimings.total).toBeGreaterThanOrEqual(0)
  })
})

describe('Together.ai image generation client', () => {
  test('builds a provider-specific payload with Together field names', () => {
    const payload = buildTogetherImageGenerationPayload({
      prompt: 'Cats eating popcorn',
      togetherSteps: '4',
      togetherSizeMode: 'aspect_ratio',
      togetherAspectRatio: '16:9',
      togetherNumImages: '3',
      togetherSeed: '99',
      togetherGuidanceScale: '3.5',
      togetherNegativePrompt: 'blurry, watermark',
      togetherResponseFormat: 'url',
      togetherOutputFormat: 'jpeg',
      togetherDisableSafetyChecker: true,
    }, 'black-forest-labs/FLUX.1-schnell')

    expect(payload).toEqual({
      model: 'black-forest-labs/FLUX.1-schnell',
      prompt: 'Cats eating popcorn',
      steps: 4,
      n: 3,
      seed: 99,
      guidance_scale: 3.5,
      negative_prompt: 'blurry, watermark',
      response_format: 'url',
      output_format: 'jpeg',
      disable_safety_checker: true,
      aspect_ratio: '16:9',
    })
  })

  test('supports Together custom dimensions without fal.ai image_size', () => {
    const payload = buildTogetherImageGenerationPayload({
      prompt: 'A square synthwave poster',
      togetherSteps: 4,
      togetherSizeMode: 'dimensions',
      togetherWidth: '1024',
      togetherHeight: '1024',
      togetherNumImages: 1,
      togetherGuidanceScale: 3.5,
      togetherResponseFormat: 'base64',
      togetherOutputFormat: 'png',
      togetherDisableSafetyChecker: false,
    }, 'black-forest-labs/FLUX.1.1-pro')

    expect(payload.width).toBe(1024)
    expect(payload.height).toBe(1024)
    expect(payload.image_size).toBeUndefined()
    expect(payload.response_format).toBe('base64')
    expect(payload.output_format).toBe('png')
  })

  test('posts to the Together images endpoint with Bearer authorization', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({
        id: 'together-request-id',
        model: 'black-forest-labs/FLUX.1-schnell',
        data: [
          {
            index: 0,
            url: 'https://api.together.ai/v1/images/example.jpeg',
            type: 'url',
          },
        ],
      }),
    }))
    globalThis.fetch = fetchMock

    const result = await generateImage({
      provider: IMAGE_GENERATION_PROVIDERS.TOGETHER,
      apiKey: 'together-test-key',
      model: 'black-forest-labs/FLUX.1-schnell',
      settings: {
        prompt: 'Cats eating popcorn',
        togetherSteps: 4,
        togetherSizeMode: 'default',
        togetherNumImages: 1,
        togetherGuidanceScale: 3.5,
        togetherResponseFormat: 'url',
        togetherOutputFormat: 'jpeg',
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.together.xyz/v1/images/generations')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer together-test-key')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: 'black-forest-labs/FLUX.1-schnell',
      prompt: 'Cats eating popcorn',
      steps: 4,
      n: 1,
    })
    expect(result.provider).toBe(IMAGE_GENERATION_PROVIDERS.TOGETHER)
    expect(result.images).toHaveLength(1)
    expect(result.images[0].url).toBe('https://api.together.ai/v1/images/example.jpeg')
    expect(result.requestId).toBe('together-request-id')
  })

  test('normalizes Together base64 image responses for preview rendering', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({
        id: 'base64-request-id',
        model: 'black-forest-labs/FLUX.1-schnell',
        data: [
          {
            index: 0,
            b64_json: 'abc123',
            type: 'b64_json',
          },
        ],
      }),
    }))
    globalThis.fetch = fetchMock

    const result = await generateImage({
      provider: IMAGE_GENERATION_PROVIDERS.TOGETHER,
      apiKey: 'together-test-key',
      model: 'black-forest-labs/FLUX.1-schnell',
      settings: {
        prompt: 'A cat in outer space',
        togetherSteps: 4,
        togetherSizeMode: 'default',
        togetherNumImages: 1,
        togetherGuidanceScale: 3.5,
        togetherResponseFormat: 'base64',
        togetherOutputFormat: 'png',
      },
    })

    expect(result.images[0].url).toBe('data:image/png;base64,abc123')
  })
})

describe('OpenAI-compatible image generation client', () => {
  test('builds a gpt-image-2 payload with every supported generation parameter', () => {
    const payload = buildOpenAIImageGenerationPayload({
      prompt: 'A precise product render of a transparent portable radio',
      openaiSizePreset: 'custom',
      openaiCustomWidth: '1536',
      openaiCustomHeight: '864',
      openaiQuality: 'high',
      openaiNumImages: '2',
      openaiOutputFormat: 'webp',
      openaiOutputCompression: '72',
      openaiBackground: 'opaque',
      openaiModeration: 'low',
      openaiStream: true,
      openaiPartialImages: '2',
      openaiUser: 'user-1234',
    }, 'gpt-image-2', IMAGE_GENERATION_PROVIDERS.DEVART)

    expect(payload).toEqual({
      model: 'gpt-image-2',
      prompt: 'A precise product render of a transparent portable radio',
      n: 2,
      quality: 'high',
      output_format: 'webp',
      output_compression: 72,
      stream: true,
      partial_images: 2,
      size: '1536x864',
      moderation: 'low',
      background: 'opaque',
      user: 'user-1234',
    })
    expect(payload.response_format).toBeUndefined()
    expect(payload.style).toBeUndefined()
  })

  test('omits output compression for PNG and partial images outside streaming mode', () => {
    const payload = buildOpenAIImageGenerationPayload({
      prompt: 'A clean vector-like app icon',
      openaiSizePreset: '1024x1024',
      openaiQuality: 'auto',
      openaiNumImages: '1',
      openaiOutputFormat: 'png',
      openaiOutputCompression: '50',
      openaiBackground: 'auto',
      openaiModeration: 'auto',
      openaiStream: false,
      openaiPartialImages: '3',
      openaiUser: '',
    }, 'gpt-image-2', IMAGE_GENERATION_PROVIDERS.DEVART)

    expect(payload).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'A clean vector-like app icon',
      n: 1,
      quality: 'auto',
      output_format: 'png',
      stream: false,
      size: '1024x1024',
      moderation: 'auto',
      background: 'auto',
    })
    expect(payload.output_compression).toBeUndefined()
    expect(payload.partial_images).toBeUndefined()
    expect(payload.user).toBeUndefined()
  })

  test('validates gpt-image-2 custom resolution constraints before sending', () => {
    expect(() => buildOpenAIImageGenerationPayload({
      prompt: 'Invalid narrow banner',
      openaiSizePreset: 'custom',
      openaiCustomWidth: '3840',
      openaiCustomHeight: '512',
      openaiQuality: 'medium',
      openaiNumImages: '1',
      openaiOutputFormat: 'jpeg',
      openaiOutputCompression: '80',
      openaiBackground: 'opaque',
      openaiModeration: 'auto',
      openaiStream: false,
      openaiPartialImages: '0',
    }, 'gpt-image-2', IMAGE_GENERATION_PROVIDERS.DEVART)).toThrow('长短边比例不能超过 3:1')
  })

  test('posts to the DevArt images endpoint with Bearer authorization', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: {
        get: vi.fn((name) => (name === 'x-request-id' ? 'req_openai_image' : null)),
      },
      text: async () => JSON.stringify({
        created: 1713833628,
        data: [
          {
            b64_json: 'openai-image-b64',
          },
        ],
        background: 'opaque',
        output_format: 'jpeg',
        size: '1536x1024',
        quality: 'medium',
        usage: {
          total_tokens: 100,
          input_tokens: 20,
          output_tokens: 80,
        },
      }),
    }))
    globalThis.fetch = fetchMock

    const result = await generateImage({
      provider: IMAGE_GENERATION_PROVIDERS.DEVART,
      apiKey: 'devart-test-key',
      model: 'gpt-image-2',
      settings: {
        prompt: 'A luminous green terminal floating in space',
        openaiBaseUrl: 'https://ignored.example.com/v1',
        openaiSizePreset: '1536x1024',
        openaiQuality: 'medium',
        openaiNumImages: 1,
        openaiOutputFormat: 'jpeg',
        openaiOutputCompression: 80,
        openaiBackground: 'opaque',
        openaiModeration: 'auto',
        openaiStream: false,
        openaiPartialImages: 0,
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://llmapi.devart.ai/v1/images/generations')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer devart-test-key')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'A luminous green terminal floating in space',
      size: '1536x1024',
      output_format: 'jpeg',
      output_compression: 80,
      background: 'opaque',
      moderation: 'auto',
    })
    expect(result.provider).toBe(IMAGE_GENERATION_PROVIDERS.DEVART)
    expect(result.images).toHaveLength(1)
    expect(result.images[0].url).toBe('data:image/jpeg;base64,openai-image-b64')
    expect(result.requestId).toBe('req_openai_image')
    expect(result.usage.total_tokens).toBe(100)
  })

  test('posts to the fixed Cloudsway image-2 endpoint and locked model', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: {
        get: vi.fn(() => null),
      },
      text: async () => JSON.stringify({
        created: 1713833628,
        output_format: 'png',
        data: [
          {
            b64_json: 'cloudsway-image-b64',
          },
        ],
        usage: {
          total_tokens: 234,
        },
      }),
    }))
    globalThis.fetch = fetchMock

    const result = await generateImage({
      provider: IMAGE_GENERATION_PROVIDERS.CLOUDSWAY,
      apiKey: 'cloudsway-test-key',
      model: 'MaaS_GP_image_2',
      settings: {
        prompt: 'A Cloudsway image-2 request',
        openaiBaseUrl: 'https://ignored.example.com/v1',
        openaiSizePreset: '1024x1536',
        openaiQuality: 'high',
        openaiNumImages: 1,
        openaiOutputFormat: 'png',
        openaiBackground: 'opaque',
        openaiModeration: 'auto',
        openaiStream: false,
        openaiPartialImages: 0,
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://genaiapi.cloudsway.net/v1/ai/kGqPeTeUIsCKbUCG/images/generations')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer cloudsway-test-key')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: 'MaaS_GP_image_2',
      prompt: 'A Cloudsway image-2 request',
      size: '1024x1536',
      quality: 'high',
      output_format: 'png',
      background: 'opaque',
      moderation: 'auto',
    })
    expect(result.provider).toBe(IMAGE_GENERATION_PROVIDERS.CLOUDSWAY)
    expect(result.images[0].url).toBe('data:image/png;base64,cloudsway-image-b64')
    expect(result.usage.total_tokens).toBe(234)
  })

  test('posts to the fixed OfoxAI images endpoint and omits unsupported optional fields', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: {
        get: vi.fn(() => null),
      },
      text: async () => JSON.stringify({
        created: 1777385517,
        model: 'openai/gpt-image-2',
        size: '512x512',
        quality: 'standard',
        data: [
          {
            index: 0,
            b64_json: 'ofox-image-b64',
          },
        ],
        usage: {
          total_tokens: 222,
        },
      }),
    }))
    globalThis.fetch = fetchMock

    const result = await generateImage({
      provider: IMAGE_GENERATION_PROVIDERS.OFOX,
      apiKey: 'ofox-test-key',
      model: 'openai/gpt-image-2',
      settings: {
        prompt: 'An OfoxAI image request',
        openaiSizePreset: '512x512',
        openaiQuality: 'standard',
        openaiNumImages: 2,
        openaiOutputFormat: 'webp',
        openaiOutputCompression: 66,
        openaiBackground: 'transparent',
        openaiModeration: 'low',
        openaiStream: false,
        openaiPartialImages: 3,
        openaiUser: 'user-should-not-send',
      },
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ofox.ai/v1/images/generations')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer ofox-test-key')
    expect(body).toMatchObject({
      model: 'openai/gpt-image-2',
      prompt: 'An OfoxAI image request',
      size: '512x512',
      quality: 'standard',
      n: 2,
      output_format: 'webp',
      background: 'transparent',
      stream: false,
    })
    expect(body.output_compression).toBeUndefined()
    expect(body.moderation).toBeUndefined()
    expect(body.partial_images).toBeUndefined()
    expect(body.user).toBeUndefined()
    expect(result.provider).toBe(IMAGE_GENERATION_PROVIDERS.OFOX)
    expect(result.images[0].url).toBe('data:image/webp;base64,ofox-image-b64')
    expect(result.usage.total_tokens).toBe(222)
  })

  test('rejects Cloudsway-only unsupported generation parameters before sending', () => {
    expect(() => buildOpenAIImageGenerationPayload({
      prompt: 'A custom Cloudsway size',
      openaiSizePreset: 'custom',
      openaiCustomWidth: '1536',
      openaiCustomHeight: '864',
      openaiQuality: 'medium',
      openaiNumImages: '1',
      openaiOutputFormat: 'png',
      openaiBackground: 'auto',
      openaiModeration: 'auto',
      openaiStream: false,
      openaiPartialImages: '0',
    }, 'MaaS_GP_image_2', IMAGE_GENERATION_PROVIDERS.CLOUDSWAY)).toThrow('不支持自定义图像尺寸')

    expect(() => buildOpenAIImageGenerationPayload({
      prompt: 'A transparent Cloudsway background',
      openaiSizePreset: '1024x1024',
      openaiQuality: 'medium',
      openaiNumImages: '1',
      openaiOutputFormat: 'png',
      openaiBackground: 'transparent',
      openaiModeration: 'auto',
      openaiStream: false,
      openaiPartialImages: '0',
    }, 'MaaS_GP_image_2', IMAGE_GENERATION_PROVIDERS.CLOUDSWAY)).toThrow('不支持背景参数 transparent')
  })

  test('rejects OfoxAI unsupported image generation values before sending', () => {
    expect(() => buildOpenAIImageGenerationPayload({
      prompt: 'An unsupported OfoxAI size',
      openaiSizePreset: '2048x2048',
      openaiQuality: 'low',
      openaiNumImages: '1',
      openaiOutputFormat: 'png',
      openaiBackground: 'auto',
      openaiStream: false,
      openaiPartialImages: '0',
    }, 'openai/gpt-image-2', IMAGE_GENERATION_PROVIDERS.OFOX)).toThrow('不支持图像尺寸 2048x2048')

    expect(() => buildOpenAIImageGenerationPayload({
      prompt: 'An unsupported OfoxAI quality',
      openaiSizePreset: '1024x1024',
      openaiQuality: 'ultra',
      openaiNumImages: '1',
      openaiOutputFormat: 'png',
      openaiBackground: 'auto',
      openaiStream: false,
      openaiPartialImages: '0',
    }, 'openai/gpt-image-2', IMAGE_GENERATION_PROVIDERS.OFOX)).toThrow('不支持质量参数 ultra')
  })

  test('explains browser CORS or network failures for fixed image channels', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })

    await expect(generateImage({
      provider: IMAGE_GENERATION_PROVIDERS.DEVART,
      apiKey: 'devart-test-key',
      model: 'gpt-image-2',
      settings: {
        prompt: 'A blocked browser request',
        openaiSizePreset: '1024x1024',
        openaiQuality: 'medium',
        openaiNumImages: 1,
        openaiOutputFormat: 'png',
        openaiBackground: 'auto',
        openaiModeration: 'auto',
        openaiStream: false,
        openaiPartialImages: 0,
      },
    })).rejects.toThrow('目标服务没有返回 Access-Control-Allow-Origin')
  })

  test('normalizes streamed OpenAI final image events', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: {
        get: vi.fn(() => null),
      },
      text: async () => [
        'event: image_generation.partial_image',
        'data: {"type":"image_generation.partial_image","b64_json":"partial","partial_image_index":0}',
        '',
        'event: image_generation.completed',
        'data: {"type":"image_generation.completed","b64_json":"final","usage":{"total_tokens":123}}',
        '',
      ].join('\n'),
    }))
    globalThis.fetch = fetchMock

    const result = await generateImage({
      provider: IMAGE_GENERATION_PROVIDERS.DEVART,
      apiKey: 'devart-test-key',
      model: 'gpt-image-2',
      settings: {
        prompt: 'A streamed river landscape',
        openaiSizePreset: '1024x1024',
        openaiQuality: 'low',
        openaiNumImages: 1,
        openaiOutputFormat: 'png',
        openaiBackground: 'auto',
        openaiModeration: 'auto',
        openaiStream: true,
        openaiPartialImages: 1,
      },
    })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      stream: true,
      partial_images: 1,
    })
    expect(result.images).toHaveLength(1)
    expect(result.images[0].url).toBe('data:image/png;base64,final')
    expect(result.usage.total_tokens).toBe(123)
  })
})
