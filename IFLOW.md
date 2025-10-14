# AI 提示词批量测试工具

## 项目概述

这是一个基于浏览器的 AI 提示词批量测试工具，允许用户同时使用多个 AI 模型（Claude、GPT、DeepSeek、Qwen 等）测试提示词效果，并实时查看和比较不同模型的响应结果。

**项目类型**: 前端单页面应用（HTML + JavaScript）  
**主要技术**: 原生 HTML/CSS/JavaScript，无框架依赖  
**API 集成**: OpenRouter API（统一的多模型接口）

## 核心功能

- **多模型支持**: 支持 Anthropic Claude、OpenAI GPT、DeepSeek、Qwen、Moonshot 等主流 AI 模型
- **批量并发测试**: 支持 5-100 个并发请求，可自定义并发数和请求间隔
- **流式/非流式输出**: 支持两种响应模式，实时显示生成内容
- **智能请求队列**: 自动管理请求队列，避免触发 API rate limit
- **详细统计信息**: 显示 token 使用量、响应时间、生成速度、费用等详细数据
- **自定义模型**: 支持添加自定义模型 ID
- **响应管理**: 全屏查看、一键复制、调试信息等功能

## 文件结构

```
prompty/
├── prompt-tester.html    # 主应用文件（包含 HTML/CSS/JS）
├── README.md            # 项目说明文档
├── .claude/             # Claude AI 配置
│   └── settings.local.json
└── .iflow/              # iFlow CLI 配置
    └── settings.json
```

## 使用方法

### 快速开始

1. **打开应用**
   ```bash
   # 在浏览器中直接打开
   open prompt-tester.html
   # 或使用任何 HTTP 服务器
   python -m http.server 8000
   ```

2. **配置测试参数**
   - 在顶部输入框输入要测试的提示词
   - 选择要测试的模型（或添加自定义模型）
   - 设置批量请求数量（5-100）
   - 调整并发数和请求间隔
   - 配置 Temperature 和 Top-p 参数

3. **开始测试**
   - 点击"开始生成"按钮
   - 实时查看各模型的响应结果
   - 使用卡片操作按钮查看详情或复制内容

### 配置选项说明

| 参数 | 说明 | 默认值 | 范围 |
|------|------|--------|------|
| 请求数 | 每个模型的并发请求数量 | 5 | 5-100 |
| 间隔(ms) | 请求之间的时间间隔 | 200 | 0-5000 |
| 并发数 | 同时进行的最大请求数 | 5 | 1-20 |
| Temperature | 控制输出随机性 | 1.0 | 0-2 |
| Top-p | 核采样参数 | 1.0 | 0-1 |
| 响应模式 | 流式或非流式输出 | 流式 | - |

### 支持的模型

**默认模型列表**:
- `anthropic/claude-sonnet-4` - Claude Sonnet 4
- `qwen/qwen3-max` - Qwen 3 Max
- `qwen/qwen3-coder-plus` - Qwen 3 Coder Plus
- `openai/gpt-5-codex` - GPT-5 Codex
- `deepseek/deepseek-v3.1-terminus` - DeepSeek V3.1 Terminus
- `moonshotai/kimi-k2-0905` - Moonshot Kimi K2
- `deepseek/deepseek-chat-v3.1` - DeepSeek Chat V3.1

**添加自定义模型**:
1. 点击模型选择框旁的 ➕ 按钮
2. 输入模型 ID（格式: `provider/model-name`）
3. 点击确定即可添加

## API 配置

### OpenRouter API

应用使用 OpenRouter API 作为统一的多模型接口。API 密钥已内置在代码中：

```javascript
const API_KEY = 'sk-or-v1-...';
const API_BASE_URL = 'https://openrouter.ai/api/v1';
```

**注意**: 如需使用自己的 API 密钥，请在 `prompt-tester.html` 中修改 `API_KEY` 常量。

### Token 计量说明

- 应用会显示输入/输出 token 数量和费用
- 优先使用 `native_tokens`（更准确）
- 不同模型使用不同的 tokenizer，相同文本的 token 数量会有差异
- 费用以美元（USD）显示，1 credit = 1 USD

## 界面说明

### 统计面板

显示实时测试统计：
- **总请求**: 总共发起的请求数
- **成功**: 成功完成的请求数
- **失败**: 失败的请求数
- **平均耗时**: 所有请求的平均响应时间
- **进行中**: 当前正在处理的请求数
- **总费用**: 累计 API 调用费用

### 结果卡片

每个请求都会生成一个结果卡片，显示：
- 模型名称和提供商信息
- 状态标识（等待中/生成中/已完成/出错了）
- 响应内容（支持滚动查看）
- 详细统计（输入/输出 tokens、耗时、速度、费用）
- 操作按钮（全屏查看、复制、调试）

### 响应式布局

- 桌面：每行 5 个卡片
- 平板：每行 3-4 个卡片
- 手机：每行 1-2 个卡片

## 快捷键

- `Ctrl + Enter`: 开始测试
- `Esc`: 关闭模态框

## 技术细节

### 请求管理

- 使用队列系统管理批量请求
- 支持自定义并发数，避免 API 限流
- 可配置请求间隔，控制请求速率
- 自动重试机制（可选）

### 流式响应处理

```javascript
// 使用 Server-Sent Events (SSE) 处理流式响应
const reader = response.body.getReader();
const decoder = new TextDecoder();
// 逐块读取和显示内容
```

### 费用计算

- 从 API 响应的 `usage` 字段获取 token 数据
- 优先使用 `native_tokens_prompt/completion`（更准确）
- 回退到 `prompt_tokens/completion_tokens`
- 根据 OpenRouter 返回的 `cost` 字段显示费用

## 注意事项

1. **API 密钥安全**: 内置的 API 密钥仅供演示，生产环境请使用环境变量或后端代理
2. **费用控制**: 批量测试会产生 API 费用，建议从小批量开始测试
3. **浏览器兼容性**: 需要支持 Fetch API 和 ReadableStream 的现代浏览器
4. **CORS**: 直接打开 HTML 文件可能遇到 CORS 问题，建议使用 HTTP 服务器
5. **自定义模型**: 添加的自定义模型会保存在浏览器 localStorage 中

## 改进建议

- 添加请求历史记录功能
- 支持导出测试结果（JSON/CSV）
- 添加模型响应对比视图
- 实现提示词模板管理
- 添加错误重试机制
- 支持批量导入测试用例

## 故障排除

### 常见问题

**Q: 请求失败，显示 401 错误**  
A: API 密钥无效或过期，请更新 `API_KEY` 常量

**Q: 无法显示 token 统计**  
A: 某些模型可能不返回 usage 信息，尝试使用非流式模式

**Q: 费用显示为 "--"**  
A: API 未返回费用信息，可能需要等待或查询 generation API

**Q: 添加的自定义模型无法使用**  
A: 确认模型 ID 格式正确（`provider/model-name`），且 OpenRouter 支持该模型

## 相关资源

- [OpenRouter API 文档](https://openrouter.ai/docs)
- [OpenRouter 模型列表](https://openrouter.ai/models)
- [OpenRouter 定价](https://openrouter.ai/docs#models)

---

**最后更新**: 2025-10-14  
**维护者**: 项目开发者  
**许可证**: 未指定
