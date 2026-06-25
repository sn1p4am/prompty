# Wangsu Anthropic 缓存命中检测方案

本文档用于排查网宿 AI Gateway 的 Anthropic 直连模式为什么检测不到 prompt cache 命中，并说明 Prompty 当前采用的检测方式。

## 结论先行

Wangsu Anthropic 直连模式应按 Anthropic 原生 `/v1/messages` 协议检测缓存，不要按 OpenAI-compatible 字段判断。

关键 usage 字段：

- `usage.cache_creation_input_tokens`：本次写入缓存的输入 tokens
- `usage.cache_read_input_tokens`：本次从缓存读取的输入 tokens
- `usage.input_tokens`：本次仍按普通输入处理的 tokens

判断规则：

- `cache_read_input_tokens > 0`：缓存命中
- `cache_creation_input_tokens > 0` 且 `cache_read_input_tokens = 0`：缓存控制已生效，但本轮是在写入/重写缓存，不是命中
- 两者都为 `0`：通常表示未缓存，常见原因是缓存前缀太短、`cache_control` 位置不对、网关未透传字段，或请求没有使用 Anthropic 原生格式

## Wangsu Anthropic 请求形态

网关信息：

- 网关 ID：`3s9bal7f`
- Base URL：`https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic/v1`
- Endpoint：`POST /messages`
- 模型：`anthropic.claude-opus-4-8`、`anthropic.claude-sonnet-4-6`
- 鉴权头：`X-Api-Key: <AI_GATEWAY_TOKEN>`
- 协议头：`anthropic-version: 2023-06-01`

完整请求 URL：

```text
https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic/v1/messages
```

## Prompty 的显式缓存方案

Prompty 的 `Wangsu Anthropic` 缓存测试使用显式 cache breakpoint。固定的大段上下文放在 `system` 内容块中，并在这个块上标记 `cache_control`；每轮变化的问题只放在 `messages` 的最后 user 消息里。

请求体形态：

```json
{
  "model": "anthropic.claude-sonnet-4-6",
  "max_tokens": 64,
  "temperature": 0,
  "system": [
    {
      "type": "text",
      "text": "这里放稳定不变的长前缀、规范、文档、few-shot 示例等。",
      "cache_control": { "type": "ephemeral" }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "这里放每一轮变化的问题。"
    }
  ]
}
```

请求头：

```text
Content-Type: application/json
anthropic-version: 2023-06-01
X-Api-Key: <AI_GATEWAY_TOKEN>
```

Prompty 计算总输入 tokens 时使用：

```text
inputTokens = usage.input_tokens
            + usage.cache_creation_input_tokens
            + usage.cache_read_input_tokens
```

命中率计算：

```text
hitRate = cache_read_input_tokens / inputTokens
```

预热后命中率会排除第 1 轮，因为第 1 轮通常用于创建缓存。

## 推荐测试流程

1. 选择 `Wangsu Anthropic`
2. 选择 `显式缓存`
3. 模型先用 `anthropic.claude-sonnet-4-6`
4. `rounds` 设置为 4
5. `interval` 设置为 1200ms 到 5000ms
6. 并发保持串行，不要并发发送缓存检测请求
7. 固定前缀使用 5k tokens 以上的稳定内容
8. 每轮只改变最后的 user 问题，不要改变 system 中被缓存的文本

第 1 轮理想结果：

```json
{
  "usage": {
    "input_tokens": 27,
    "cache_creation_input_tokens": 5202,
    "cache_read_input_tokens": 0,
    "output_tokens": 4
  }
}
```

第 2 轮及之后理想结果：

```json
{
  "usage": {
    "input_tokens": 27,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 5202,
    "output_tokens": 4
  }
}
```

如果后续轮次仍然是 `cache_creation_input_tokens > 0` 且 `cache_read_input_tokens = 0`，说明请求体里的 `cache_control` 大概率已被接受并触发写入，但本次没有复用上前一轮缓存。此时问题更可能在缓存亲和性、网关转发、模型侧缓存策略、请求前缀不完全一致，或轮次间隔/并发时序上。

## cURL 参考

不要把真实 token 写进脚本或仓库。下面示例用环境变量：

```bash
export AIGATEWAY_TOKEN="..."

curl -sS -X POST \
  "https://aigateway.edgecloudapp.com/v2/gws/3s9bal7f/anthropic/v1/messages" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-Api-Key: ${AIGATEWAY_TOKEN}" \
  -d '{
    "model": "anthropic.claude-sonnet-4-6",
    "max_tokens": 64,
    "temperature": 0,
    "system": [
      {
        "type": "text",
        "text": "把足够长、完全稳定、会重复使用的内容放在这里。至少准备几千 tokens，不要放时间戳、随机数、轮次编号。",
        "cache_control": { "type": "ephemeral" }
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "请基于上面的固定上下文回答第一个问题。"
      }
    ]
  }'
```

第二次请求必须保持 `system[0].text` 字节级一致，只改变最后的 `messages[0].content`。

## 常见问题排查

### 1. 只看了 OpenAI 字段

Anthropic 原生响应没有 `prompt_tokens_details.cached_tokens`。Wangsu Anthropic 要看：

```text
usage.cache_read_input_tokens
usage.cache_creation_input_tokens
```

### 2. 固定前缀太短

Anthropic 官方说明：短于模型/平台最小可缓存长度的 prompt，即使标了 `cache_control` 也不会缓存，并且不会返回错误。表现通常是：

```json
{
  "cache_creation_input_tokens": 0,
  "cache_read_input_tokens": 0
}
```

排查方式：把固定前缀扩大到 5k tokens 以上再测。Prompty 的 `稳妥 5k` 或 `重压 12k` 案例更适合验证缓存。

### 3. 把动态内容放进了缓存块

下面这些内容不要放在带 `cache_control` 的 system block 里：

- 轮次编号
- 当前时间
- request id
- 用户短问题
- 随机采样参数描述
- 每次排序都可能变化的 JSON

缓存匹配要求前缀完全一致。只要缓存块内容每轮变化，就会变成每轮重新写入。

### 4. 并发请求导致缓存还没创建完

缓存通常要等第一条请求开始返回/完成后才可用于后续请求。检测缓存命中时不要并发压测，先串行跑 4 轮。

推荐：

```text
concurrency = 1
rounds = 4
interval >= 1200ms
```

如果网关或模型侧响应慢，可以把 `interval` 增加到 3000ms 或 5000ms。

### 5. `system` 写成字符串，无法放 block-level cache_control

显式缓存时，建议把 `system` 写成内容块数组：

```json
"system": [
  {
    "type": "text",
    "text": "...",
    "cache_control": { "type": "ephemeral" }
  }
]
```

如果写成：

```json
"system": "..."
```

就没有位置给这个 system block 加显式 `cache_control`。

### 6. 网关接受写入但没有读命中

如果连续多轮都看到：

```json
{
  "cache_creation_input_tokens": 5202,
  "cache_read_input_tokens": 0
}
```

这不是解析问题。它表示模型/网关返回了 Anthropic cache usage 字段，且 cache write 被触发，但后续请求没有读到缓存。

建议把以下信息发给网关侧排查：

- 请求 URL
- 模型 ID
- 每轮完整 request body，注意脱敏 token
- 每轮 response `usage`
- 每轮 response headers，尤其是 request id、trace id
- 轮次间隔和是否并发

### 7. `metadata.user_id` 不是缓存命中保证

`metadata.user_id` 可用于用户关联、风控或网关侧请求亲和排查，但它不是 Anthropic prompt cache 的命中条件。Prompty 支持填写它，主要是为了帮助验证网关是否按用户做路由亲和。

## 我们真实测试到的现象

在 Prompty 中用 Wangsu Anthropic 真实网关跑显式缓存：

- 请求成功
- `cache_control` 被网关接受
- 返回了 `cache_creation_input_tokens`
- 短测试中后续轮次仍然返回 `cache_creation_input_tokens`，没有返回 `cache_read_input_tokens`

这说明客户端请求格式和 usage 解析是正常的；如果同事那边“检测不到命中”，需要进一步区分是：

- 完全没有写入：`creation = 0`、`read = 0`
- 有写入但没读取：`creation > 0`、`read = 0`
- 已经命中但读取了错误字段：`read > 0`，但工具只看 OpenAI 字段

这三种情况的排查方向完全不同。

## 参考资料

- Wangsu Anthropic 直连模式文档：<http://doc.model-store.ai/ai-gateway/model/api-detail?endpoint=api-anthropic-direct-mode1>
- Anthropic Prompt Caching 官方文档：<https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching>
