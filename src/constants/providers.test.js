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

    test('includes hoxkai as an OpenAI-compatible provider with the documented base URL', () => {
        expect(PROVIDERS.HOXKAI).toBe('hoxkai')
        expect(PROVIDER_INFO[PROVIDERS.HOXKAI]).toEqual({
            name: 'Hoxkai',
            baseUrl: 'https://api.hoxkai.top/v1',
            keyStorageKey: 'hoxkai_api_key',
            getKeyUrl: 'https://api.hoxkai.top/',
            models: [
                'gemini-3-flash-preview',
            ],
        })
    })

    test('includes wangsu as a Gemini native provider with the configured gateway', () => {
        expect(PROVIDERS.WANGSU).toBe('wangsu')
        expect(PROVIDER_INFO[PROVIDERS.WANGSU]).toEqual({
            name: 'Wangsu Gemini',
            baseUrl: 'https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta',
            keyStorageKey: 'wangsu_ai_gateway_api_key',
            keyStorageAliases: ['wangsu_gemini_api_key'],
            getKeyUrl: 'http://doc.model-store.ai/ai-gateway/model/api-detail?endpoint=api-gemini-direct-mode1',
            credentialLabel: 'AI Gateway Token',
            credentialPlaceholder: '输入网宿 AI Gateway Token',
            credentialHelpText: 'Google Gemini 直连模式，使用网关 ytagcuik，通过 x-goog-api-key 调用 Gemini 原生接口；与 Wangsu Anthropic 共用同一个网关 Token。',
            models: [
                'gemini.gemini-3-flash-preview',
                'gemini.gemini-3.5-flash',
                'gemini.gemini-3.1-pro-preview',
            ],
        })
    })

    test('excludes Gemini image models from the Wangsu Gemini text provider', () => {
        expect(PROVIDER_INFO[PROVIDERS.WANGSU].models).not.toContain('gemini.gemini-3.1-flash-image')
        expect(PROVIDER_INFO[PROVIDERS.WANGSU].models).not.toContain('gemini.gemini-3-pro-image')
    })

    test('includes wangsu anthropic as an Anthropic native provider with the configured gateway', () => {
        expect(PROVIDERS.WANGSU_ANTHROPIC).toBe('wangsu_anthropic')
        expect(PROVIDER_INFO[PROVIDERS.WANGSU_ANTHROPIC]).toEqual({
            name: 'Wangsu Anthropic',
            baseUrl: 'https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic/v1',
            keyStorageKey: 'wangsu_ai_gateway_api_key',
            keyStorageAliases: ['wangsu_gemini_api_key'],
            getKeyUrl: 'http://doc.model-store.ai/ai-gateway/model/api-detail?endpoint=api-anthropic-direct-mode1',
            credentialLabel: 'AI Gateway Token',
            credentialPlaceholder: '输入网宿 AI Gateway Token',
            credentialHelpText: 'Anthropic 直连模式，使用网关 3s9bal7f，通过 X-Api-Key 调用 Anthropic 原生 /v1/messages 接口；与 Wangsu Gemini 共用同一个网关 Token。',
            models: [
                'anthropic.claude-opus-4-8',
                'anthropic.claude-sonnet-4-6',
            ],
        })
    })

    test('keeps Cloudsway App ID out of provider-level header config', () => {
        expect(PROVIDER_INFO[PROVIDERS.CLOUDSWAY].extraConfigFields).toBeUndefined()
        expect(PROVIDER_INFO[PROVIDERS.CLOUDSWAY].appIdStorageKey).toBeUndefined()
    })
})
