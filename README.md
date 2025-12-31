# Prompty - LLM Prompt 批量测试工具

一个现代化的 LLM Prompt 批量测试工具，支持多家 API 提供商，具备 Terminal CLI 风格界面。

![Terminal CLI Theme](https://img.shields.io/badge/Theme-Terminal%20CLI-00ff00?style=flat-square&labelColor=000000)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)

## ✨ 特性

- 🚀 **多 Provider 支持** - OpenRouter、Google Gemini、阿里百炼、火山引擎 等
- 📊 **批量测试** - 并发控制、间隔设置、实时流式输出
- 🎯 **详细元数据** - Token 统计、首字延迟、费用估算、生成速度
- 📝 **多种预览模式** - Raw 原始输出 / Markdown 渲染 / HTML 页面预览
- 🔐 **本地存储** - API Key 安全存储在浏览器本地
- 🌙 **Terminal 风格** - 酷炫的终端 CLI 主题设计

## 🛠️ 技术栈

- **框架**: React 18 + Vite 7
- **样式**: TailwindCSS + shadcn/ui 组件
- **渲染**: marked.js + highlight.js + mermaid.js

## 🚀 快速开始

### 在线使用

访问: [https://sn1p4am.github.io/prompty/](https://sn1p4am.github.io/prompty/)

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev -- --host

# 构建生产版本
npm run build
```

## 📖 使用指南

1. **配置 API Key** - 点击设置图标，添加你的 API Key
2. **选择模型** - 从下拉菜单选择要测试的模型
3. **输入 Prompt** - 在输入框中编写你的提示词
4. **调整参数** - 设置 Temperature、Top-P、Max Tokens 等
5. **开始测试** - 点击运行按钮，观察实时流式输出

## 📄 License

MIT License
