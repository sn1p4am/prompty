# Release Notes

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
