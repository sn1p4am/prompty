// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import App from './App'
import { STORAGE_KEYS, PROVIDERS } from './constants/providers'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('App provider model selection', () => {
  test('clears a stale selected model when switching to a provider with no built-in models', async () => {
    window.localStorage.setItem(STORAGE_KEYS.CURRENT_PROVIDER, JSON.stringify(PROVIDERS.OPENROUTER))
    window.localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_MODEL, JSON.stringify('anthropic/claude-sonnet-4.5'))

    render(<App />)

    const providerSelect = document.querySelector('select')
    expect(providerSelect).not.toBeNull()

    providerSelect.value = PROVIDERS.MOXIN
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_MODEL)).toBe(JSON.stringify(''))
    })
  })
})
