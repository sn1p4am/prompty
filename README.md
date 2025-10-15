# AI 提示词批量测试工具

> 基于 OpenRouter API 的多模型批量测试工具，支持实时流式输出和 Markdown 渲染

[![License](https://img.shields.io/github/license/sn1p4am/prompty)](LICENSE)
[![Version](https://img.shields.io/github/v/release/sn1p4am/prompty)](https://github.com/sn1p4am/prompty/releases)

## ✨ 功能特点

### 核心功能
- 🤖 **多模型支持** - 通过 OpenRouter 统一调用 Claude、GPT、DeepSeek、Qwen 等主流 AI 模型
- 🔄 **批量测试** - 支持 5-100 个并发请求，可自定义并发数和请求间隔
- 📊 **实时统计** - 显示 Token 使用量、响应时间、生成速度、费用等详细数据
- 📝 **Markdown 渲染** - 支持完整的 Markdown 格式和 Mermaid 图表
- 🎨 **响应式布局** - 完美适配桌面端和移动端
- 💾 **本地存储** - API Key 和模型选择自动保存，刷新不丢失

### 显示模式
- 🌊 **流式输出** - 实时显示 AI 生成内容
- 📄 **原始内容** - 卡片中显示纯文本格式
- 🎯 **Markdown 预览** - 放大窗口支持切换 Markdown 渲染视图
- 🔍 **全屏查看** - 支持全屏查看完整响应内容
- 📋 **一键复制** - 快速复制原始内容到剪贴板

### 高级特性
- ⚙️ **自定义模型** - 支持添加任意 OpenRouter 支持的模型
- 🎛️ **参数调节** - 可调节 Temperature、Top-p 等生成参数
- 🔐 **安全配置** - API Key 本地加密存储，不上传服务器
- 📈 **智能队列** - 自动管理请求队列，避免触发 API 限流

## 🚀 快速开始

### 在线使用
直接访问：[https://sn1p4am.github.io/prompty/](https://sn1p4am.github.io/prompty/)

或访问 Release 页面下载：[https://github.com/sn1p4am/prompty/releases](https://github.com/sn1p4am/prompty/releases)

### 本地使用
1. 下载 `index.html` 文件
2. 在浏览器中打开文件
3. 配置您的 OpenRouter API Key
4. 开始测试！

## 📖 使用说明

### 1. 配置 API Key
- 首次使用需要输入 OpenRouter API Key
- 获取 API Key：[https://openrouter.ai/keys](https://openrouter.ai/keys)
- API Key 会安全地保存在浏览器本地存储中
- 配置后右上角会显示绿色徽章，点击可重新编辑

### 2. 输入提示词
在提示词输入框中输入您要测试的内容，支持多行复杂指令。

### 3. 选择模型
从下拉菜单中选择要测试的模型，或点击 ➕ 按钮添加自定义模型。

**默认支持的模型：**
- Anthropic Claude Sonnet 4
- Qwen 3 Max / Coder Plus
- OpenAI GPT-5 Codex
- DeepSeek V3.1 / Chat V3.1
- Moonshot Kimi K2

### 4. 调整参数
- **请求数**：每个模型的并发请求数量（5-100）
- **间隔**：请求之间的时间间隔（毫秒）
- **并发数**：同时进行的最大请求数（1-20）
- **Temperature**：控制输出随机性（0-2）
- **Top-p**：核采样参数（0-1）
- **响应模式**：流式或非流式输出

### 5. 开始测试
点击"开始生成"按钮，实时查看各模型的响应结果。

### 6. 查看结果
- 每个请求显示为一个卡片，包含模型名称、状态、内容和统计信息
- 点击"全屏查看"可查看完整内容，支持切换原始/Markdown 视图
- 点击"复制内容"快速复制到剪贴板
- 点击"调试信息"查看错误详情

## 🎯 关于 OpenRouter

本工具**仅支持 OpenRouter API**，不支持直接调用其他 API。

### 为什么选择 OpenRouter？
- ✅ **统一接口** - 一个 API Key 访问所有主流 AI 模型
- ✅ **按需付费** - 只为实际使用付费，无需多个订阅
- ✅ **智能路由** - 自动选择最优提供商，保证可用性
- ✅ **透明计费** - 详细的 Token 统计和费用明细
- ✅ **无需代理** - 国内可直接访问

### OpenRouter 定价
- 不同模型价格不同，具体查看：[https://openrouter.ai/models](https://openrouter.ai/models)
- 支持信用卡充值，最低 $5 起
- 提供免费额度供测试使用

## 🛠️ 技术栈

- **纯前端** - 单个 HTML 文件，无需后端服务器
- **Markdown 渲染** - marked.js
- **图表支持** - mermaid.js
- **代码高亮** - highlight.js
- **API 服务** - OpenRouter API

## 📊 统计信息说明

每个请求卡片显示以下统计：
- **输入/输出 Tokens** - 使用 Native Tokens（更准确）或 API 返回值
- **总计 Tokens** - 输入 + 输出的总 Token 数
- **耗时** - 请求响应时间（秒）
- **速度** - 生成速度（tokens/秒 或 字符/秒）
- **费用** - 实际 API 调用费用（美元）

> 💡 **提示**：标记 `*` 的表示使用了 Native Tokens（更准确的计量）

## ⚠️ 注意事项

1. **API Key 安全**
   - API Key 仅保存在浏览器本地，不会上传到任何服务器
   - 建议定期更换 API Key
   - 不要在公共计算机上保存 API Key

2. **费用控制**
   - 批量测试会产生 API 费用，建议从小批量开始
   - 在 OpenRouter 控制台设置消费限额
   - 定期检查费用统计

3. **浏览器兼容性**
   - 需要支持 Fetch API 和 ReadableStream 的现代浏览器
   - 推荐使用 Chrome、Firefox、Edge 或 Safari 最新版

4. **网络要求**
   - 需要稳定的网络连接
   - 流式输出对网络延迟较敏感

## 📝 更新日志

### v1.0.0 (2025-10-14)
- ✨ 首次发布
- 🎨 支持多模型批量测试
- 📝 Markdown 和 Mermaid 渲染
- 💾 本地存储配置
- 📊 详细统计信息
- 🎯 响应式布局

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🔗 相关链接

- [OpenRouter 官网](https://openrouter.ai/)
- [OpenRouter API 文档](https://openrouter.ai/docs)
- [OpenRouter 模型列表](https://openrouter.ai/models)
- [获取 API Key](https://openrouter.ai/keys)

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**