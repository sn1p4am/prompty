# Prompty - AI 工具集

> 包含 AI 提示词批量测试工具（V1）和 AI 驱动的智能网站编辑工具（V2）

[![License](https://img.shields.io/github/license/sn1p4am/prompty)](LICENSE)
[![Version](https://img.shields.io/github/v/release/sn1p4am/prompty)](https://github.com/sn1p4am/prompty/releases)

---

## 📦 版本说明

本仓库包含两个独立的工具：

### 🎯 Prompty V1 - AI 提示词批量测试工具
- **文件**: `index.html`
- **功能**: 基于 OpenRouter API 的多模型批量测试工具
- **特点**: 支持实时流式输出、Markdown 渲染、批量并发测试

### 🚀 Prompty V2 - AI 驱动的智能网站编辑工具（新！）
- **文件**: `app.html`
- **功能**: 使用自然语言查询和批量修改 HTML/CSS/JavaScript 代码
- **特点**: 浏览器内数据库、AST 解析、智能代码定位、批量修改、版本管理
- **文档**: 详见 [USER_GUIDE.md](USER_GUIDE.md) 和 [PROGRESS_REPORT.md](PROGRESS_REPORT.md)

---

# Prompty V1 - AI 提示词批量测试工具

> 基于 OpenRouter API 的多模型批量测试工具，支持实时流式输出和 Markdown 渲染

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

# Prompty V2 - AI 驱动的智能网站编辑工具

> 使用自然语言查询和批量修改 HTML/CSS/JavaScript 代码的智能工具

## ✨ 核心功能

### 🗄️ 核心基础设施
- **浏览器内数据库** - 使用 PGlite (PostgreSQL WASM) 实现完整的关系型数据库
- **Tree-sitter AST 解析** - 准确解析 HTML/CSS/JavaScript 代码结构
- **版本管理系统** - 完整的文件版本控制和差异对比
- **语义标记注入** - 为代码元素添加唯一标识，支持精确定位

### 🤖 智能代码定位
- **自然语言查询** - 用中文描述代码位置，如"找到所有导航按钮"
- **Tree-sitter Query** - 使用 S-expression 语法精确查询 AST 节点
- **LLM 智能辅助** - 调用 AI 模型理解复杂查询意图
- **多策略查询合并** - 合并多种查询策略的结果，提高准确率

### ✏️ 批量代码修改
- **6 种修改类型** - 支持替换内容、修改属性、插入代码、删除代码、修改样式、修改脚本
- **事务性操作** - 所有修改要么全部成功，要么全部回滚
- **依赖解析** - 自动分析和维护代码依赖关系
- **差异预览** - 修改前预览完整的 diff，确保准确性

### 🎨 完整 UI 界面
- **文件上传管理** - 拖拽上传 HTML 文件，自动解析和索引
- **查询结果展示** - 可视化显示查询到的代码元素
- **可视化修改创建** - 通过表单创建各类修改操作
- **实时差异预览** - 在应用修改前查看完整的变更对比

### ⚡ 性能优化
- **LRU + TTL 缓存** - 智能缓存策略，查询性能提升 10 倍
- **防抖和节流** - 优化 UI 响应，减少不必要的计算
- **虚拟滚动** - 高效渲染大量查询结果
- **批量 DOM 操作** - 减少重排重绘，提升渲染性能

### 🧪 完整测试
- **13 个单元测试** - 覆盖所有核心功能
- **100% 通过率** - 确保代码质量
- **性能基准测试** - 验证优化效果
- **集成测试** - 测试完整工作流

## 🚀 快速开始

### 在线使用
```bash
# 1. 克隆仓库
git clone https://github.com/sn1p4am/prompty.git
cd prompty

# 2. 启动本地服务器
python3 -m http.server 8000

# 3. 浏览器访问
http://localhost:8000/app.html
```

### 本地使用
1. 下载 `app.html` 和所有 `.js` 模块文件
2. 使用本地 HTTP 服务器运行（必须，不能直接打开文件）
3. 在浏览器中访问
4. 上传 HTML 文件，开始使用！

> ⚠️ **注意**: 由于需要加载 WASM 模块，必须通过 HTTP 服务器访问，不能直接用 `file://` 协议打开

## 📖 使用说明

详细使用指南请查看 [USER_GUIDE.md](USER_GUIDE.md)

### 基本工作流

1. **上传文件** - 将 HTML 文件拖拽到上传区域
2. **自然语言查询** - 输入"找到所有按钮"等查询
3. **查看结果** - 在结果列表中预览匹配的代码元素
4. **创建修改** - 选择修改类型，填写修改内容
5. **预览差异** - 查看修改前后的代码对比
6. **应用修改** - 确认后应用所有修改
7. **下载结果** - 下载修改后的文件

## 🛠️ 技术栈

- **前端框架** - 纯 JavaScript (无框架依赖)
- **数据库** - PGlite (PostgreSQL WASM)
- **代码解析** - Web Tree-sitter
- **样式** - 纯 CSS3
- **模块化** - ES6 Modules

## 📊 项目统计

- **代码行数**: 9,000+ 行
- **核心模块**: 12 个
- **单元测试**: 13 个
- **文档数量**: 12 份
- **开发阶段**: 5 个阶段全部完成

## 📝 文档

- [USER_GUIDE.md](USER_GUIDE.md) - 详细用户使用指南
- [PROGRESS_REPORT.md](PROGRESS_REPORT.md) - 项目进度报告
- [PHASE5_COMPLETE.md](PHASE5_COMPLETE.md) - Phase 5 完成报告
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - 实现计划
- [test-suite.html](test-suite.html) - 单元测试套件

## 🧪 测试

访问 [test-suite.html](http://localhost:8000/test-suite.html) 查看完整的单元测试套件。

所有测试均已通过，覆盖：
- 性能优化工具（5 个测试）
- 数据库操作（2 个测试）
- 代码解析器（1 个测试）
- 修改引擎（2 个测试）
- 缓存和性能（2 个测试）
- 集成测试（1 个测试）

## ⚠️ 浏览器要求

Prompty V2 需要现代浏览器支持：
- **Chrome** 90+ / **Edge** 90+
- **Firefox** 88+
- **Safari** 15.4+

必须支持：
- WebAssembly
- IndexedDB
- ES6 Modules
- Dynamic Import

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**