# Moxin 渠道接入设计

- 日期：2026-04-02
- 主题：新增 moxin 常规渠道（OpenAI 兼容协议）

## 背景

现有应用已经支持多个供应商渠道，并且对大多数“OpenAI 兼容”渠道复用了同一套请求逻辑。现在需要新增一个名为 `moxin` 的常规渠道，接入地址为 `https://www.moxin.studio/v1`。

本次目标是以最小改动完成接入，不引入额外抽象，也不为 moxin 增加专属高级配置。

## 目标

1. 在渠道下拉中新增 `moxin`
2. 使用独立的本地存储 API Key
3. 请求通过现有 OpenAI 兼容协议逻辑发送
4. 支持现有普通请求与流式请求
5. 不提供内置模型列表，允许用户手动添加自定义模型

## 非目标

1. 不新增 moxin 专属高级参数
2. 不新增 thinking 专属适配逻辑
3. 不重构现有 provider 架构
4. 不实现“通用自定义 OpenAI 兼容渠道”抽象

## 用户确认的约束

- Base URL：`https://www.moxin.studio/v1`
- 认证方式：标准 Bearer API Key
- 额外字段：无
- 内置模型列表：无
- 测试模型：`gemini-3-flash-preview`
- 用户提供了测试 API Key，但该密钥不得写入代码、文档或 Git 提交内容

## 现状

- `src/constants/providers.js` 维护渠道常量、渠道元信息、默认配置与本地存储键
- `src/hooks/useApiConfig.js` 基于 `PROVIDER_INFO` 统一管理 API Key、模型列表、额外字段与 Base URL
- `src/components/ApiKeyManager.jsx` 通过遍历 `PROVIDER_INFO` 自动渲染渠道下拉
- `src/services/apiClient.js` 通过 `buildOpenAiCompatibleRequestBody()` 处理通用 OpenAI 兼容请求
- 仅部分渠道（如 OpenRouter、Vertex、火山、阿里、AiOnly 系）有特殊分支；moxin 不需要进入这些专属分支

## 方案对比

### 方案 A：最小接入（推荐）

直接把 `moxin` 作为一个新的 provider 加入现有体系：

- 新增 provider 常量
- 新增 provider 元信息
- 复用现有 OpenAI 兼容请求体
- 不加任何 provider 特殊分支

优点：
- 改动最小
- 与现有架构一致
- 风险最低
- 完全符合本次需求

缺点：
- 后续若 moxin 需要特殊参数，再追加适配

### 方案 B：为兼容渠道预留扩展位

在最小接入基础上，提前为 moxin 增加隐藏的扩展配置能力。

优点：
- 后续扩展方便

缺点：
- 当前需求用不到
- 增加无意义复杂度

### 方案 C：抽象成“自定义兼容渠道”

把 moxin 做成一个可自定义 Base URL 的通用 OpenAI-compatible provider。

优点：
- 后续接其他兼容平台更灵活

缺点：
- 明显超出本次范围
- 会扩大 UI 与状态管理改动面

## 最终设计

采用**方案 A：最小接入**。

### 1. Provider 常量与元信息

在 `src/constants/providers.js` 中：

- 新增 `PROVIDERS.MOXIN = 'moxin'`
- 在 `PROVIDER_INFO` 中新增：
  - `name: 'Moxin'`
  - `baseUrl: 'https://www.moxin.studio/v1'`
  - `keyStorageKey: 'moxin_api_key'`
  - `getKeyUrl: 'https://www.moxin.studio/'`
  - `models: []`

说明：
- `models` 为空数组，表示不提供内置模型
- 不设置 `extraConfigFields`
- 不设置专属 `credentialLabel` / `credentialHelpText`，直接复用现有默认展示

### 2. 配置与本地存储行为

`src/hooks/useApiConfig.js` 无需新增 moxin 专属逻辑：

- `getApiKey()` 会按 `moxin_api_key` 读取密钥
- `saveApiKey()` / `clearApiKey()` 会独立保存和清除 moxin 密钥
- `getModels()` 对 moxin 返回用户自定义模型列表
- `getBaseUrl()` 直接返回 `https://www.moxin.studio/v1`

这意味着 moxin 会天然复用现有 provider 配置机制。

### 3. UI 行为

#### 渠道下拉

`src/components/ApiKeyManager.jsx` 已通过 `Object.entries(PROVIDER_INFO)` 渲染渠道列表，因此新增 provider 后会自动显示 `Moxin`，无需新增条件分支。

#### 模型选择

由于 `models` 为空：

- 默认不会显示任何内置模型
- 用户需要通过现有“自定义模型”能力手动添加模型
- 本次验证时可添加 `gemini-3-flash-preview`

这与用户“不要内置模型列表”的要求一致。

#### 高级设置

- 不新增 moxin 专属设置面板
- `VertexAdvancedSettings` 仍仅对 Vertex 显示
- thinking 仍沿用现有通用开关；但 moxin 不增加任何特殊 payload 适配逻辑

### 4. 请求发送行为

在 `src/services/apiClient.js` 中，moxin 应走现有 OpenAI-compatible 分支：

- 请求体由 `buildOpenAiCompatibleRequestBody()` 构造
- 请求地址使用 `https://www.moxin.studio/v1`
- 请求头继续使用标准 Bearer Token 方案
- 支持普通请求与流式请求

同时明确以下边界：

- moxin **不是** OpenRouter，因此不附加 OpenRouter 专属 `usage: { include: true }` 以外的新行为；现有代码中该逻辑只对 `PROVIDERS.OPENROUTER` 生效，moxin 保持不命中即可
- moxin **不是** Vertex，不走 Vertex 原生接口与模型归一化分支
- moxin **不是** 火山 / 阿里 / AiOnly 系，不增加 thinking payload 变体重试逻辑

### 5. 错误处理

本次不新增 moxin 专属错误文案，沿用现有通用 API 错误处理逻辑。

这样可以保持实现最小化；若后续 moxin 有稳定且明确的错误格式，再单独增强。

## 变更范围

### 必改文件

1. `src/constants/providers.js`
   - 增加 `MOXIN` 常量
   - 增加 `PROVIDER_INFO[PROVIDERS.MOXIN]`

### 预期无需改动但需验证的文件

1. `src/hooks/useApiConfig.js`
2. `src/components/ApiKeyManager.jsx`
3. `src/components/ModelSelector.jsx`
4. `src/services/apiClient.js`
5. `src/hooks/useBatchTest.js`

如果验证中发现 moxin 未正确落到 OpenAI-compatible 分支，再做最小修正；否则不主动改动这些文件。

## 测试设计

### 手工验证

1. 在渠道下拉中可以看到 `Moxin`
2. 切换到 `Moxin` 后可单独保存 API Key
3. Moxin 不显示额外配置字段
4. Moxin 下无内置模型
5. 可手动添加模型 `gemini-3-flash-preview`
6. 发起一次普通请求，请求 URL 命中 `https://www.moxin.studio/v1`
7. 发起一次流式请求，能正常返回结果或得到可读错误

### 安全验证

1. 代码中不写入真实 API Key
2. 文档中不写入真实 API Key
3. 提交前检查 diff，确认没有 `sk-`、`apikey`、`api_key`、`token` 等敏感内容误入版本控制

## 实施原则

1. 只做本次所需的最小改动
2. 不为了未来需求提前抽象
3. 不新增与 moxin 无关的重构
4. 任何测试都使用本地输入或浏览器 localStorage，不把密钥落入仓库

## 成功标准

满足以下条件即可认为本次接入完成：

1. UI 中可选中 `Moxin`
2. `Moxin` 使用独立 API Key 存储
3. 支持手动添加模型并发起请求
4. 请求按 OpenAI 兼容协议发送到 `https://www.moxin.studio/v1`
5. 不引入额外字段、内置模型或 provider 专属复杂逻辑
