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

1. **配置访问凭证** - 点击设置图标，添加 API Key 或 Access Token
2. **选择模型** - 从下拉菜单选择要测试的模型
3. **输入 Prompt** - 在输入框中编写你的提示词
4. **调整参数** - 设置 Temperature、Top-P、Max Tokens 等
5. **开始测试** - 点击运行按钮，观察实时流式输出

## ☁️ Vertex AI 配置说明

Prompty 中的 Vertex AI 渠道走 **Vertex AI OpenAI 兼容接口**，需要同时配置以下字段：

- **Project ID** - 你的 Google Cloud 项目标识
- **Location** - 建议使用 `global`，也可替换成实际区域
- **Access Token** - 必须是 Google Cloud OAuth Access Token，不能使用普通 API Key

本地获取 Access Token 的常见方式：

```bash
gcloud auth application-default print-access-token
```

或：

```bash
gcloud auth print-access-token
```

配置完成后，请在模型选择器中使用 Vertex 支持的模型 ID，例如：

- `google/gemini-2.5-flash`
- `google/gemini-2.5-pro`
- `google/gemini-2.5-flash-lite`

## 🧩 Vertex 高级参数

切换到 `Vertex AI` 渠道后，左侧会出现专属扩展面板，当前已暴露：

- `reasoning_effort`
- `response_format`
- `tools`
- `tool_choice`
- `parallel_tool_calls`
- `web_search_options`

注意：

- `reasoning_effort` 与通用 `Thinking` 开关互斥
- `response_format = json_schema` 时需要提供合法 JSON Schema
- `tool_choice = required / validated` 时，至少要配置 `tools` 或启用 `web_search_options`
- 工具调用结果会在输出卡片中以 `工具调用` 区块展示

### Vertex API 示例

```bash
ACCESS_TOKEN="$(gcloud auth print-access-token)"
PROJECT_ID="your-project-id"
LOCATION="global"

curl -X POST \
  "https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/openapi/chat/completions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.5-flash",
    "messages": [
      { "role": "system", "content": "You are a precise assistant." },
      { "role": "user", "content": "查询上海今天天气，并返回结构化结果。" }
    ],
    "stream": true,
    "temperature": 0.3,
    "stream_options": { "include_usage": true },
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get weather by city name",
          "parameters": {
            "type": "object",
            "properties": {
              "city": { "type": "string" }
            },
            "required": ["city"]
          }
        }
      }
    ],
    "tool_choice": "validated",
    "parallel_tool_calls": true,
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "weather_result",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "city": { "type": "string" },
            "temperature": { "type": "string" },
            "summary": { "type": "string" }
          },
          "required": ["city", "temperature", "summary"]
        }
      }
    }
  }'
```

## 📄 License

MIT License
