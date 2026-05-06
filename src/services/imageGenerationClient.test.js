import { describe, expect, test, vi } from 'vitest'
import { IMAGE_GENERATION_PROVIDERS } from '../constants/imageGeneration'
import { buildFalImageGenerationPayload, generateImage } from './imageGenerationClient'

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
      json: async () => ({
        images: [
          {
            url: 'https://example.com/image.jpeg',
            content_type: 'image/jpeg',
          },
        ],
        seed: 42,
        prompt: 'Generate one image',
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
    expect(result.seed).toBe(42)
  })
})
