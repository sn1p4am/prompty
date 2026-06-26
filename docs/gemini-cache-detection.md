# Gemini 缓存命中检测方案

本文档说明 Prompty 当前如何检测 Gemini prompt/context cache 命中，覆盖 `Gemini` 通用原生格式和 `Wangsu Gemini` 直连格式。

## 结论先行

Prompty 的 Gemini 缓存检测统一读取 Gemini Native 响应里的：

```text
usageMetadata.cachedContentTokenCount
```

判断规则：

- `cachedContentTokenCount > 0`：缓存命中
- `cachedContentTokenCount = 0` 或字段不存在：本轮未读到缓存
- `promptTokenCount` 是输入 tokens 分母
- `candidatesTokenCount` 是输出 tokens
- `totalTokenCount` 是总 tokens

Prompty 计算：

```text
inputTokens = usageMetadata.promptTokenCount
cachedReadTokens = usageMetadata.cachedContentTokenCount
hitRate = cachedReadTokens / inputTokens
```

第一轮通常用于预热，所以 Prompty 同时展示整体命中率和排除第一轮后的预热后命中率。

## 两种 Gemini API 格式

Prompty 目前有两个 Gemini 缓存 API 格式：

| 格式 | Base URL | 默认模型 | 缓存模式 |
| --- | --- | --- | --- |
| `Gemini` | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.5-flash` | 自动缓存、显式缓存 |
| `Wangsu Gemini` | `https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta` | `gemini.gemini-3-flash-preview` | 自动缓存 |

`Gemini` 通用格式可以用于 Google 官方 Gemini API，也可用于兼容 Gemini Native 的代理。

`Wangsu Gemini` 使用网宿 AI Gateway 的 Google Gemini 直连模式：

- 网关 ID：`ytagcuik`
- 协议：Google Gemini 原生 `generateContent` / `streamGenerateContent`
- 鉴权：`x-goog-api-key: <AI_GATEWAY_TOKEN>`
- 模型示例：`gemini.gemini-3-flash-preview`、`gemini.gemini-3.5-flash`、`gemini.gemini-3.1-pro-preview`

## Base URL 归一化

Prompty 会把用户粘贴的 URL 清理成 API 根路径，避免重复拼 endpoint。

示例：

```text
https://generativelanguage.googleapis.com
=> https://generativelanguage.googleapis.com/v1beta

https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
=> https://generativelanguage.googleapis.com/v1beta

https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini
=> https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta

https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta/models/gemini.gemini-3-flash-preview:streamGenerateContent
=> https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta
```

最终每轮请求会拼成：

```text
POST {baseUrl}/models/{model}:generateContent
POST {baseUrl}/models/{model}:streamGenerateContent
```

## 鉴权策略

Prompty 对 Gemini Native 请求优先使用：

```text
x-goog-api-key: <API_KEY>
```

对 Google 官方地址，重试顺序是：

```text
x-goog-api-key -> ?key= -> Authorization: Bearer
```

对自定义代理或网宿地址，重试顺序是：

```text
x-goog-api-key -> Authorization: Bearer -> ?key=
```

如果端点返回 401/403 且错误信息显示鉴权方式不匹配，Prompty 会自动尝试下一个鉴权方式。

Wangsu Gemini 按文档使用 `x-goog-api-key`，真实测试 CORS 预检也允许浏览器直连。

## 自动缓存模式

自动缓存模式不创建缓存资源。Prompty 每轮都直接发 `generateContent` 或 `streamGenerateContent`，把稳定前缀放在 `systemInstruction`，把每轮变化的问题放在 `contents`。

请求体形态：

```json
{
  "systemInstruction": {
    "parts": [
      {
        "text": "这里放稳定不变的长前缀、规范、文档、few-shot 示例等。"
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Round: 1\n这里放每轮变化的问题。"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0,
    "maxOutputTokens": 128,
    "thinkingConfig": {
      "thinkingBudget": 0
    }
  }
}
```

为什么禁用 thinking：

Gemini 3 系列可能在短 `maxOutputTokens` 下把预算消耗到 thinking tokens，导致响应 usage 正常但正文为空。Prompty 的缓存测试会固定发送：

```json
{
  "thinkingConfig": {
    "thinkingBudget": 0
  }
}
```

这样缓存测试更专注于 `usageMetadata.cachedContentTokenCount`，也避免短输出被 thinking 吃掉。

## 显式缓存模式

只有 `Gemini` 通用格式支持显式缓存；`Wangsu Gemini` 当前只开放 `models/{model}:generateContent` 和 `models/{model}:streamGenerateContent`，不开放 `cachedContents`，因此 Prompty 对 Wangsu Gemini 只提供自动缓存。

显式缓存流程：

1. 先创建 cached content
2. 每轮 generateContent 引用返回的缓存名
3. 测试完成后尽力删除缓存资源

创建缓存请求：

```text
POST {baseUrl}/cachedContents
```

请求体：

```json
{
  "model": "models/gemini-2.5-flash",
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "这里放稳定不变的长前缀。"
        }
      ]
    }
  ],
  "ttl": "3600s"
}
```

随后每轮请求体不再发送 `systemInstruction`，而是引用缓存名：

```json
{
  "cachedContent": "cachedContents/cache-123",
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Round: 1\n这里放每轮变化的问题。"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0,
    "maxOutputTokens": 128,
    "thinkingConfig": {
      "thinkingBudget": 0
    }
  }
}
```

清理缓存请求：

```text
DELETE {baseUrl}/{cachedContentName}
```

清理是 best effort；如果删除失败，缓存也会按 TTL 过期。

## cachedContents 不支持时的降级

有些 Gemini 代理只支持：

```text
models/{model}:generateContent
models/{model}:streamGenerateContent
```

不支持：

```text
/cachedContents
```

如果 Prompty 创建 `cachedContents` 时收到类似 404 unsupported/not found/available endpoints 的错误，会自动降级为自动缓存测试，并在 UI 中提示：

```text
当前 Gemini Base URL 的 cachedContents 创建请求返回 unsupported，已自动降级为 generateContent 隐式缓存测试。
```

此时结果里会保留 cachedContents 创建失败的状态、HTTP status 和 response headers，方便拿 request id / trace id 去查网关日志。

## 流式与非流式解析

非流式：

```text
POST /models/{model}:generateContent
```

Prompty 直接读取 JSON：

```text
data.usageMetadata.cachedContentTokenCount
```

流式：

```text
POST /models/{model}:streamGenerateContent
```

Prompty 会解析 SSE 事件，收集最后出现的：

```text
event.usageMetadata
```

最终仍然按 `usageMetadata.cachedContentTokenCount` 计算命中率。

## 推荐测试流程

对于 Gemini 3.5 Flash、Gemini 3.1 Pro Preview 这类新模型，官方文档列出的隐式缓存最低输入 token 量约为 4096。低于这个量时，即使请求完全重复，也可能不会返回缓存命中。

推荐配置：

- API 格式：`Wangsu Gemini` 或 `Gemini`
- 响应模式：先用非流式 `generateContent`，排除 SSE 解析因素
- 模型：`gemini.gemini-3-flash-preview` 或 `gemini.gemini-3.5-flash`
- 轮数：4
- 间隔：1200ms 到 5000ms
- 案例体量：优先 `稳妥 5k`，必要时用 `重压 12k`
- 静态前缀：保持字节级稳定
- 动态问题：只放在最后的 user message

预期：

- 第 1 轮通常 `cachedContentTokenCount = 0`
- 第 2 轮及以后如果命中，`cachedContentTokenCount > 0`
- 如果所有轮次都是 0，但 `promptTokenCount` 足够大，说明模型/网关本次没有读到缓存，而不是 Prompty 解析错字段

## Wangsu Gemini cURL 参考

不要把真实 token 写进脚本或仓库。下面示例用环境变量：

```bash
export AIGATEWAY_TOKEN="..."

curl -sS -X POST \
  "https://aigateway.edgecloudapp.com/v2/gws/ytagcuik/gemini/v1beta/models/gemini.gemini-3-flash-preview:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: ${AIGATEWAY_TOKEN}" \
  -d '{
    "systemInstruction": {
      "parts": [
        {
          "text": "这里放足够长、完全稳定、会重复使用的上下文。建议至少 5k tokens，用于提高隐式缓存命中概率。"
        }
      ]
    },
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "请基于上面的固定上下文回答第一个问题。"
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0,
      "maxOutputTokens": 128,
      "thinkingConfig": {
        "thinkingBudget": 0
      }
    }
  }'
```

第二次请求必须保持 `systemInstruction.parts[0].text` 字节级一致，只改变最后的 `contents[0].parts[0].text`。

## 常见问题排查

### 1. 只看 OpenAI/Claude 字段

Gemini Native 没有：

```text
prompt_tokens_details.cached_tokens
cache_read_input_tokens
cache_creation_input_tokens
```

Gemini 要看：

```text
usageMetadata.cachedContentTokenCount
```

### 2. 输入 tokens 不够

如果 `promptTokenCount` 低于模型的隐式缓存阈值，通常不会命中。Gemini 3.5 Flash 和 Gemini 3.1 Pro Preview 这类模型建议至少准备 4096 tokens 以上的稳定前缀。

Prompty 里优先使用：

```text
稳妥 5k
重压 12k
```

### 3. 稳定前缀每轮变化

不要把这些内容放进 `systemInstruction` 的稳定前缀里：

- 当前时间
- request id
- 轮次编号
- 用户问题
- 随机排序的 JSON
- 每轮变化的工具定义或 schema

这些应该放在最后的 user message，或者完全不要参与缓存检测。

### 4. 并发导致预热失败

隐式缓存依赖前一轮请求先被模型侧接收和处理。不要同时发多轮缓存检测请求。

推荐：

```text
rounds = 4
interval >= 1200ms
concurrency = 1
```

如果模型慢或网关排队明显，把 `interval` 增加到 3000ms 或 5000ms。

### 5. Wangsu Gemini 不支持显式 cachedContents

Wangsu Gemini 当前按文档开放：

```text
/models/{model}:generateContent
/models/{model}:streamGenerateContent
```

Prompty 真实测试过 `cachedContents` 形态不可用，因此 UI 对 `Wangsu Gemini` 只提供自动缓存模式。不要用显式缓存方式判断 Wangsu Gemini 是否支持缓存。

### 6. 响应正文为空但 usage 正常

这常见于 Gemini 3 模型在低 `maxOutputTokens` 下消耗 thinking tokens。Prompty 已在缓存测试里发送：

```json
"thinkingConfig": { "thinkingBudget": 0 }
```

如果自写脚本复现，请也加上这个配置，否则可能误判为请求失败或缓存导致无输出。

### 7. `cachedContentTokenCount` 一直为 0

先确认：

- 状态码是 200
- `promptTokenCount` 足够大
- 前缀字节级一致
- 后续轮次不是并发抢跑
- 响应里确实有 `usageMetadata`
- 使用的是 Gemini Native endpoint，不是 OpenAI-compatible 包装

如果这些都满足但仍然为 0，可以把每轮 request body、response `usageMetadata`、response headers 交给网关侧排查。

## 我们真实测试到的现象

Prompty 用 Wangsu Gemini 真实网关测试：

- 三个文本模型常规请求都返回 200
- 浏览器 CORS 预检通过
- `generateContent` 和 `streamGenerateContent` 都可用
- 缓存测试请求可用，能正常返回正文和 `usageMetadata`
- 短测试中 `cachedContentTokenCount` 仍为 0，说明当轮未读到缓存；Prompty 会如实显示 0

这说明客户端请求格式和 usage 解析是正常的。若同事检测不到命中，需要区分：

- 请求没通：HTTP 非 200
- usage 被网关吞掉：没有 `usageMetadata`
- 输入太短或前缀变化：`promptTokenCount` 不够或每轮不同
- 真的未命中：`cachedContentTokenCount = 0`
- 已命中但工具看错字段：`cachedContentTokenCount > 0`，但工具只看 OpenAI/Claude 字段

## 参考资料

- Gemini Context Caching 官方文档：<https://ai.google.dev/gemini-api/docs/caching>
- Wangsu Gemini 直连模式文档：<http://doc.model-store.ai/ai-gateway/model/api-detail?endpoint=api-gemini-direct-mode1>
