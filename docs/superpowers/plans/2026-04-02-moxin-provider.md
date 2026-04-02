# Moxin Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `moxin` provider that appears in the provider dropdown, stores its API key separately, accepts user-added custom models, and sends requests to `https://www.moxin.studio/v1` through the existing OpenAI-compatible request path.

**Architecture:** Extend the existing provider registry in `src/constants/providers.js` with one new provider entry and let the rest of the app pick it up through existing registry-driven hooks and UI. Verify behavior by linting the app and manually exercising the provider in the browser with a custom model, while ensuring no real API key is committed or documented.

**Tech Stack:** React 19, Vite 7, localStorage-backed hooks, existing OpenAI-compatible fetch client, ESLint

---

## File Map

- Modify: `src/constants/providers.js`
  - Add the `MOXIN` provider constant and its provider metadata entry.
- Verify only: `src/hooks/useApiConfig.js`
  - Confirms registry-driven provider handling already supports providers with no built-in models and no extra fields.
- Verify only: `src/components/ApiKeyManager.jsx`
  - Confirms provider dropdown is rendered from `PROVIDER_INFO` and will show `Moxin` automatically.
- Verify only: `src/components/ModelSelector.jsx`
  - Confirms users can add a custom model when the provider has an empty built-in model list.
- Verify only: `src/services/apiClient.js`
  - Confirms the provider will flow through the generic OpenAI-compatible `/chat/completions` path without special-case logic.

## Task 1: Add the moxin provider registry entry

**Files:**
- Modify: `src/constants/providers.js:1-94`
- Verify: `src/hooks/useApiConfig.js:31-156`
- Verify: `src/components/ApiKeyManager.jsx:108-195`
- Verify: `src/components/ModelSelector.jsx:8-83`

- [ ] **Step 1: Write the failing test expectation as a manual verification target**

Because this repo does not currently have an automated React test runner configured, use a precise manual red step before changing code:

```text
Expectation before code change:
- The provider dropdown does not contain "Moxin"
- localStorage has no provider-specific key name for moxin
- There is no provider metadata entry for https://www.moxin.studio/v1
```

- [ ] **Step 2: Verify the red state**

Run:
```bash
npm run lint
```

Expected:
```text
PASS or existing-clean output from ESLint, with no references to moxin because the provider has not been added yet.
```

Then inspect the current provider registry in `src/constants/providers.js` and confirm there is no `MOXIN` entry.

- [ ] **Step 3: Write the minimal implementation**

Update `src/constants/providers.js` so the provider registry becomes:

```javascript
export const PROVIDERS = {
    OPENROUTER: 'openrouter',
    VERTEX: 'vertex',
    VOLCENGINE: 'volcengine',
    ALIBAILIAN: 'alibailian',
    CLOUDSWAY: 'cloudsway',
    AIIONLY: 'aiionly',
    AIONLY: 'aionly',
    MOXIN: 'moxin',
}
```

Add this provider metadata entry near the other OpenAI-compatible providers:

```javascript
    [PROVIDERS.MOXIN]: {
        name: 'Moxin',
        baseUrl: 'https://www.moxin.studio/v1',
        keyStorageKey: 'moxin_api_key',
        getKeyUrl: 'https://www.moxin.studio/',
        models: [],
    },
```

Keep the rest of the file unchanged. Do not add built-in models, extra config fields, or provider-specific thinking settings.

- [ ] **Step 4: Run verification to confirm the change is valid**

Run:
```bash
npm run lint
```

Expected:
```text
No ESLint errors.
```

Then verify these code-level outcomes:

```text
- ApiKeyManager will render "Moxin" automatically because it maps Object.entries(PROVIDER_INFO)
- useApiConfig.getApiKey/saveApiKey/clearApiKey will use moxin_api_key
- useApiConfig.getModels() will return only user-added custom models for moxin because models is []
- useApiConfig.getBaseUrl() will return https://www.moxin.studio/v1 for moxin
```

- [ ] **Step 5: Commit**

```bash
git add src/constants/providers.js
git commit -m "feat: add moxin provider"
```

## Task 2: Verify request flow and UI behavior end-to-end

**Files:**
- Verify: `src/services/apiClient.js:544-805`
- Verify: `src/hooks/useBatchTest.js:100-278`
- Verify: `src/components/ApiKeyManager.jsx:108-195`
- Verify: `src/components/ModelSelector.jsx:8-83`

- [ ] **Step 1: Write the failing test expectation as a manual verification target**

```text
Expectation before verification:
- The app has not yet been proven to send moxin requests through the generic OpenAI-compatible path
- The UI behavior for an empty built-in model list has not yet been proven with moxin selected
```

- [ ] **Step 2: Verify the red state in the browser**

Run:
```bash
npm run dev
```

Expected:
```text
Vite starts and prints a local development URL.
```

Before entering any real secret, confirm in the browser that:

```text
- Moxin appears in the provider dropdown
- Selecting Moxin shows no extra config fields
- The model dropdown has no built-in models until you add one manually
```

- [ ] **Step 3: Verify the minimal runtime behavior**

In the browser UI:

```text
1. Select provider: Moxin
2. Add custom model: gemini-3-flash-preview
3. Enter the API key manually into the UI field without saving it anywhere in the repo
4. Enter a tiny prompt pair, for example:
   - systemPrompt: You are a concise assistant.
   - userPrompt: Reply with the single word OK.
5. Run one non-stream request
6. Run one stream request
```

At the same time, confirm the runtime behavior matches this code path:

```javascript
response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
})
```

And confirm for moxin that:

```text
- baseUrl resolves to https://www.moxin.studio/v1
- Authorization header is Bearer <apiKey>
- No OpenRouter-only headers are added
- No Vertex path is used
- No provider-specific thinking retry branch is required
```

- [ ] **Step 4: Run verification commands and secret scan checks**

Run:
```bash
npm run lint
```

Expected:
```text
No ESLint errors.
```

Run:
```bash
git diff -- src/constants/providers.js
```

Expected:
```text
Only the moxin provider addition is present.
```

Run:
```bash
git diff -- . ':(exclude)package-lock.json'
```

Expected:
```text
No API key, sk- prefix, or other secret value appears anywhere in the diff.
```

- [ ] **Step 5: Commit**

If and only if the browser verification succeeded and the diff is secret-free, run:

```bash
git add src/constants/providers.js
git commit -m "test: verify moxin provider flow"
```

If there is no new tracked change after Task 1, skip this commit and record that verification was completed without additional file edits.

## Self-Review Checklist

- Spec coverage:
  - Add provider to dropdown: covered in Task 1 and Task 2
  - Separate API key storage: covered in Task 1
  - No built-in model list: covered in Task 1 and Task 2
  - OpenAI-compatible request flow: covered in Task 2
  - Standard and streaming request support: covered in Task 2
  - No provider-specific extras: covered in Task 1 and Task 2
- Placeholder scan:
  - No TBD/TODO markers
  - Every code-editing step includes exact code
  - Every verification step includes exact commands and expected outcomes
- Type consistency:
  - Provider key is `MOXIN`
  - Provider value is `'moxin'`
  - Storage key is `moxin_api_key`
  - Base URL is `https://www.moxin.studio/v1`

## Notes for Execution

- Never paste the real API key into source files, markdown files, commit messages, or terminal commands that will end up in shell history captured by the session.
- Enter the key only through the browser UI during manual verification.
- If the browser test reveals that moxin needs provider-specific handling after all, stop and update the spec and plan before expanding scope.
