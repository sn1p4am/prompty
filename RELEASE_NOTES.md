# Release Notes

## v3.8.11 (2026-05-14)

### 本次更新

- 🔒 OpenAI 生图固定使用 `https://llmapi.devart.ai/v1`，不再暴露 Base URL 配置项
- 🧹 移除图像生成实验室中的 OpenAI Base URL 输入框，避免旧配置或手动切换影响请求地址
- 🧪 使用测试 Key 验证 `https://llmapi.devart.ai/v1/images/generations` 可返回 200、`b64_json` 图像结果和 request id
- 🖼️ 旧缓存中的 `openaiBaseUrl` 会被忽略，OpenAI Image2 请求始终走固定 llmapi endpoint

## v3.8.9 (2026-05-14)

### 本次更新

- 🧱 OpenAI 图像请求遇到浏览器 CORS / preflight 拦截时，显示更明确的中文诊断与处理建议
- 🔁 Base URL 支持同源相对路径，例如 `/api/openai` 会归一化为 `/api/openai/v1`，方便接入自有后端或边缘代理
- 🧪 新增 CORS/Failed to fetch 错误提示测试，以及相对路径代理归一化测试
- 🌐 保持跨域 OpenAI-compatible Base URL 的协议、`/v1`、尾斜杠和完整接口路径容错处理

## v3.8.8 (2026-05-14)

### 本次更新

- 🌐 OpenAI 图像生成渠道新增 Base URL 设置，支持直连官方地址或自定义 OpenAI-compatible 代理地址
- 🧭 请求前自动归一化 Base URL：补齐 `https://`、补齐 `/v1`、移除尾斜杠、查询参数和误粘贴的 `/images/generations` 等接口路径
- 🧪 新增 Base URL 容错测试，覆盖裸域名、代理子路径、已带 `/v1`、完整 generations 路径等输入
- 🖼️ Base URL 留空时仍使用官方默认 `https://api.openai.com/v1`

## v3.8.7 (2026-05-14)

### 本次更新

- 🖼️ 图像生成实验室新增 OpenAI Image API 渠道，内置 `gpt-image-2`、`gpt-image-2-2026-04-21` 与 GPT Image 系列模型
- ⚙️ 新增 Image2 全量生成参数面板：`n`、`size`、`quality`、`output_format`、`output_compression`、`background`、`moderation`、`stream`、`partial_images`、`user`
- 🧪 新增 OpenAI Image2 请求测试，覆盖全量 payload、Bearer 鉴权、base64 图像归一化与流式完成事件
- 📏 自定义尺寸按官方 `gpt-image-2` 约束进行前置校验，避免无效宽高、比例或像素范围请求
- 📝 按官方文档保留 GPT Image 默认 base64 返回行为，未向 `gpt-image-2` 请求注入 DALL-E 专用的 `response_format` / `style`

## v3.8.6 (2026-05-12)

### 本次更新

- 📱 优化移动端 API Key 配置区布局，小屏下改为纵向排布，避免标签和按钮挤压
- 🧭 运行按钮新增阻塞原因提示，可直接看到缺少模型、Prompt、访问令牌或渠道配置
- ⚙️ 高级参数折叠态新增摘要，快速查看 batch、并发、输出模式、采样参数和 Max Token
- 🧹 调整移动端 Header 配置区分隔方式，减少首屏视觉拥挤

## v3.8.5 (2026-05-12)

### 本次更新

- 🔐 加固 Markdown 与 HTML 预览安全：Markdown 输出经过 DOMPurify 净化，HTML iframe 默认禁用脚本执行
- ⛔ 文本批量测试支持真实取消：停止任务会 abort 仍在进行的网络请求，避免继续消耗额度
- ⚡ 优化首屏包体：MarkdownRenderer、Mermaid、图像生成实验室改为按需加载，主入口 chunk 从约 1.58 MB 降至约 287 kB
- 🌊 优化流式输出渲染：chunk 按帧批量提交，并减少结果卡片的重复解析
- 🧰 修复 `useLocalStorage` 函数式更新的闭包旧值问题
- 🛡️ 依赖安全审计修复至 0 vulnerabilities

## v3.5.1 (2026-03-27)

### 本次更新

- 🧠 为 `AiOnly` / `AiIIOnly` 新增 thinking 参数透传支持
- 🔁 新增兼容回退策略，请求会按模型族优先尝试 `enable_thinking` 或 `thinking: { type: "enabled" }`
- 📝 更新界面提示文案与版本说明，明确 `AiOnly` / `AiIIOnly` 为兼容尝试支持

### 兼容策略说明

- `Qwen` / `QwQ` / `QvQ` 模型优先走 `enable_thinking`
- 其他模型优先走 `thinking` 对象
- 若首个 thinking 协议返回 `400` 或 `422`，会自动切换另一种协议重试

## v1.0.0 - AI 提示词批量测试工具

## 🎉 首次发布

基于 OpenRouter API 的多模型批量测试工具，支持实时流式输出和 Markdown 渲染。

## ✨ 核心功能

### 多模型支持
- 🤖 通过 OpenRouter 统一调用 Claude、GPT、DeepSeek、Qwen 等主流 AI 模型
- 🔄 支持批量测试（5-100 个并发请求）
- ⚙️ 可自定义并发数和请求间隔
- 🎛️ 支持添加任意 OpenRouter 支持的自定义模型

### 实时统计
- 📊 显示 Token 使用量（支持 Native Tokens）
- ⏱️ 响应时间和生成速度
- 💰 详细的费用计算
- 📈 实时进度跟踪

### Markdown 支持
- 📝 完整的 Markdown 格式渲染
- 📊 Mermaid 图表支持
- 💻 代码高亮显示
- 🔄 原始内容与预览模式切换

### 用户体验
- 🎨 响应式布局，完美适配桌面和移动端
- 💾 API Key 和模型选择自动保存
- 🔍 全屏查看和一键复制
- 🌊 流式/非流式双模式

## 🚀 快速开始

### 下载使用
1. 从 [Release 页面](https://github.com/sn1p4am/prompty/releases) 下载 `prompt-tester.html`
2. 在浏览器中打开文件
3. 输入您的 OpenRouter API Key
4. 开始测试！

## 📋 使用要求

- ✅ 现代浏览器（Chrome、Firefox、Edge、Safari 最新版）
- ✅ OpenRouter API Key（[获取地址](https://openrouter.ai/keys)）
- ✅ 稳定的网络连接

## ⚠️ 重要说明

### 关于 OpenRouter
- 本工具**仅支持 OpenRouter API**，不支持其他 API
- 需要有效的 OpenRouter API Key
- API Key 安全保存在浏览器本地，不会上传到服务器

### 费用提醒
- 批量测试会产生 API 费用
- 建议从小批量开始测试
- 在 OpenRouter 控制台设置消费限额
- 定期检查费用统计

## 📦 文件说明

- `prompt-tester.html` - 主应用文件（单页面应用）
- `README.md` - 项目文档
- `LICENSE` - MIT 许可证

## 🔗 相关链接

- [OpenRouter 官网](https://openrouter.ai/)
- [OpenRouter API 文档](https://openrouter.ai/docs)
- [获取 API Key](https://openrouter.ai/keys)
- [OpenRouter 模型列表](https://openrouter.ai/models)
- [项目仓库](https://github.com/sn1p4am/prompty)

## 🐛 已知问题

暂无

## 📝 更新日志

### v1.0.0 (2025-10-14)
- ✨ 首次发布
- 🎨 支持多模型批量测试
- 📝 Markdown 和 Mermaid 渲染
- 💾 本地存储配置
- 📊 详细统计信息
- 🎯 响应式布局
- 🔐 安全的 API Key 管理

---

**感谢使用！如有问题请提交 Issue。**
