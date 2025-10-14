# Release v1.0.0 - AI 提示词批量测试工具

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
