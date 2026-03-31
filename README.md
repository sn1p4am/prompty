# Prompty - LLM Prompt 批量测试工具

一个现代化的 LLM Prompt 批量测试工具，支持多家 API 提供商，具备 Terminal CLI 风格界面。

![Terminal CLI Theme](https://img.shields.io/badge/Theme-Terminal%20CLI-00ff00?style=flat-square&labelColor=000000)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)

## ✨ 特性

- 🚀 **多 Provider 支持** - OpenRouter、Vertex AI、Cloudsway、阿里百炼、火山引擎、AiOnly、AiIIOnly
- 📊 **批量测试** - 并发控制、间隔设置、实时流式输出
- 🧠 **Thinking 支持** - 火山 / 阿里 / Vertex 原生支持，AiOnly / AiIIOnly 按兼容协议自动尝试
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

1. **配置访问凭证** - 点击设置图标，添加 API Key
2. **选择模型** - 从下拉菜单选择要测试的模型
3. **输入 Prompt** - 在输入框中编写你的提示词
4. **调整参数** - 设置 Temperature、Top-P、Max Tokens 等
5. **开始测试** - 点击运行按钮，观察实时流式输出

## ☁️ Vertex AI 配置说明

Prompty 中的 Vertex AI 渠道现在只保留 **Vertex Express Mode**：

- 使用 `API key`
- 请求路径：`/v1/publishers/google/models/{MODEL_ID}:generateContent`
- 不需要 `Project ID`
- 不需要 `Location`

模型示例：

- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gemini-2.5-flash-lite`

## 🧩 Vertex 原生参数

切换到 `Vertex AI` 渠道后，左侧会出现专属扩展面板，当前保留文本生成场景真正需要的原生参数：

- `thinkingLevel`
- `thinkingBudget`
- `responseMimeType`
- `responseSchema`

注意：

- 顶部通用 `Thinking` 开关关闭时，会向原生接口发送 `thinkingBudget: 0`
- `responseSchema` 只有在 `responseMimeType` 不是 `text/plain` 时才有效
- `application/json` 可以不带 schema；`text/x.enum` 建议搭配 schema 使用

### Express Mode 官方 curl

```bash
MODEL_ID="gemini-3-pro-preview"
API_KEY="YOUR_API_KEY"

curl \
  -X POST \
  -H "Content-Type: application/json" \
  "https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL_ID}:streamGenerateContent?key=${API_KEY}" -d \
  $'{
    "contents": {
      "role": "user",
      "parts": [
        {
          "text": "Describe this picture."
        }
      ]
    }
  }'
```

## 📄 License

MIT License
