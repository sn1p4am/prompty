import { describe, expect, test, vi } from 'vitest'
import { IMAGE_GENERATION_PROVIDERS } from '../constants/imageGeneration'
import { buildFalImageGenerationPayload, buildTogetherImageGenerationPayload, generateImage } from './imageGenerationClient'

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
