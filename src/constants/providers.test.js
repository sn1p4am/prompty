import { describe, expect, test } from 'vitest'
import { PROVIDERS, PROVIDER_INFO } from './providers'

describe('providers registry', () => {
    test('includes moxin as an OpenAI-compatible provider with no built-in models', () => {
        expect(PROVIDERS.MOXIN).toBe('moxin')
        expect(PROVIDER_INFO[PROVIDERS.MOXIN]).toEqual({
            name: 'Moxin',
            baseUrl: 'https://www.moxin.studio/v1',
            keyStorageKey: 'moxin_api_key',
            getKeyUrl: 'https://www.moxin.studio/',
            models: [],
        })
    })
})
