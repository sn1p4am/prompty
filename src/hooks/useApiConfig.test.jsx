// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { useApiConfig } from './useApiConfig'
import { PROVIDERS, STORAGE_KEYS } from '../constants/providers'

const CLOUDSWAY_BASE_URL = 'https://genaiapi.cloudsway.net/v1/ai'
const CLOUDSWAY_BUILT_IN_MODEL = 'MaaS_Ge_3_flash_preview_20251217'

function ApiConfigProbe({ onConfig }) {
    const apiConfig = useApiConfig()

    useEffect(() => {
        onConfig(apiConfig)
    }, [apiConfig, onConfig])

    return null
}

async function renderApiConfig() {
    const state = { apiConfig: null }
    render(<ApiConfigProbe onConfig={(apiConfig) => { state.apiConfig = apiConfig }} />)

    await waitFor(() => {
        expect(state.apiConfig).not.toBeNull()
    })

    return state
}

afterEach(() => {
    cleanup()
    window.localStorage.clear()
})

describe('useApiConfig Cloudsway model app ids', () => {
    test('resolves the Cloudsway App ID from the selected model config', async () => {
        window.localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify([
            {
                provider: PROVIDERS.CLOUDSWAY,
                model: 'cloudsway-model-a',
                appId: 'app-a',
            }
        ]))

        const state = await renderApiConfig()

        expect(state.apiConfig.getModels(PROVIDERS.CLOUDSWAY)).toContain('cloudsway-model-a')
        expect(state.apiConfig.getModelAppId(PROVIDERS.CLOUDSWAY, 'cloudsway-model-a')).toBe('app-a')
        expect(state.apiConfig.getBaseUrl(PROVIDERS.CLOUDSWAY, 'cloudsway-model-a')).toBe(`${CLOUDSWAY_BASE_URL}/app-a`)
        expect(state.apiConfig.getMissingProviderFields(PROVIDERS.CLOUDSWAY, 'cloudsway-model-a')).toEqual([])
        expect(state.apiConfig.getMissingProviderFields(PROVIDERS.CLOUDSWAY, CLOUDSWAY_BUILT_IN_MODEL)).toEqual([
            `App ID（${CLOUDSWAY_BUILT_IN_MODEL}）`
        ])
    })

    test('saves a Cloudsway App ID as model-level metadata', async () => {
        const state = await renderApiConfig()

        act(() => {
            state.apiConfig.saveModelAppId(PROVIDERS.CLOUDSWAY, CLOUDSWAY_BUILT_IN_MODEL, 'app-built-in')
        })

        await waitFor(() => {
            expect(state.apiConfig.getModelAppId(PROVIDERS.CLOUDSWAY, CLOUDSWAY_BUILT_IN_MODEL)).toBe('app-built-in')
        })

        expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.CUSTOM_MODELS))).toContainEqual({
            provider: PROVIDERS.CLOUDSWAY,
            model: CLOUDSWAY_BUILT_IN_MODEL,
            appId: 'app-built-in',
        })
    })
})
