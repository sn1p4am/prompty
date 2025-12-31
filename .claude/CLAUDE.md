# Prompty 项目开发规范

## 项目概述
AI 提示词批量测试工具 - 使用多个 AI 模型同时测试提示词效果

## 🔒 安全规则

### ⚠️ 绝对禁止：API Key 泄露

**严格禁止将 API Key 推送到 Git 仓库！**

- ❌ **不要提交**: 任何包含实际 API Key 的文件
- ❌ **不要推送**: `.env` 文件、配置文件中的实际 key
- ❌ **不要写入**: API Key 到代码中（即使是注释）

**项目使用 localStorage 存储 API Key**:
- ✅ API Key 仅存储在浏览器本地
- ✅ 不会被提交到 Git
- ✅ 每个用户使用自己的 Key

**AI 助手检查清单**:
- 每次提交前必须检查是否包含实际的 API Key
- 使用 `git diff` 和 `git show` 确认提交内容安全
- 搜索关键词：`sk-`, `apikey`, `api_key`, `token`

## 发布流程

### 🤖 AI 助手自动发布规则

**每次代码更新完成并确认无误后，AI 助手必须自动执行完整的发布流程：**

1. ✅ 确认代码修改正确无误
2. ✅ 更新版本号和更新内容
3. ✅ 提交到 Git
4. ✅ 推送到 GitHub
5. ✅ 创建 GitHub Release
6. ✅ 验证 GitHub Pages 部署状态

**不需要用户明确要求发布，AI 助手应主动完成以上所有步骤。**

### ⚠️ 重要规则：每次更新必须同时完成以下三步

1. **更新版本号**
   - 修改 `index.html` 中的版本号（搜索 `<span>v1.x.x</span>`）
   - 同时更新版本号下方的 `.version-tooltip` 中的更新内容列表

2. **提交到 Git**
   ```bash
   git add .
   git commit -m "feat/fix: 简要描述"
   git push
   ```

3. **创建 GitHub Release**
   ```bash
   gh release create vX.Y.Z \
     --title "vX.Y.Z - 版本标题" \
     --notes "详细的更新说明" \
     --target main
   ```

### 为什么需要创建 Release？

虽然 GitHub Pages 会自动部署 main 分支的最新代码，但创建 Release 有以下重要作用：

1. **版本追踪**: 标记重要的版本里程碑
2. **更新日志**: 提供完整的功能说明和 bug 修复记录
3. **用户通知**: 用户可以订阅 Release 获取更新通知
4. **版本回滚**: 需要时可以快速回退到特定版本
5. **下载归档**: 用户可以下载特定版本的文件

### 版本号规范

使用语义化版本 (Semantic Versioning)：

- **MAJOR (主版本号)**: 不兼容的 API 变更
- **MINOR (次版本号)**: 向后兼容的功能新增
- **PATCH (修订号)**: 向后兼容的 bug 修复

示例：
- `v1.0.0` → `v1.0.1` : Bug 修复
- `v1.0.1` → `v1.1.0` : 新增功能
- `v1.1.0` → `v2.0.0` : 重大变更

### Release 标题规范

格式：`vX.Y.Z - 简短描述`

示例：
- `v1.1.0 - 网络稳定性增强版`
- `v1.2.0 - 调试增强版`
- `v2.0.0 - 架构重构版`

### Release 描述规范

建议包含以下部分：

```markdown
## 🎯 本版本重点

简要说明本版本的主要改进

## ✨ 新功能

- 功能1
- 功能2

## 🐛 Bug 修复

- 修复1
- 修复2

## 📈 改进

- 改进1
- 改进2

## 📖 相关链接

- [在线使用 (GitHub Pages)](https://sn1p4am.github.io/prompty/)
- [问题反馈](https://github.com/sn1p4am/prompty/issues)
- [完整更新日志](https://github.com/sn1p4am/prompty/compare/vX.Y.Z...vX.Y.Z)
```

## 开发规范

### 代码修改

1. **修改前先读取文件**: 使用 Read tool 读取完整文件后再进行 Edit/Write
2. **保持一致性**: 遵循现有的代码风格和命名规范
3. **添加注释**: 对复杂逻辑添加清晰的中文注释

### 功能开发

1. **渐进增强**: 新功能应该优雅降级，不影响现有功能
2. **用户体验**: 注重交互反馈和错误提示
3. **性能优化**: 考虑大批量请求时的性能影响

### 测试要求

每次重大更新后建议测试：
- 不同并发数和间隔的组合
- 错误重试机制
- 流式和非流式模式
- API Key 保存和读取

## 技术栈

- **前端**: 纯 HTML + CSS + JavaScript (无框架)
- **API**: OpenRouter API (多模型路由)
- **部署**: GitHub Pages (自动部署)
- **工具**: marked.js (Markdown 渲染), mermaid.js (图表), highlight.js (代码高亮)

## 文件结构

```
prompty/
├── index.html          # 主文件（包含所有代码）
├── README.md           # 项目说明
├── .claude/
│   ├── CLAUDE.md      # 本文件（开发规范）
│   └── settings.local.json
└── .git/
```

## 常见问题

### Q: 为什么 GitHub Pages 没有更新？

A:
1. 检查是否推送到了 main 分支
2. GitHub Pages 部署需要 1-3 分钟
3. 清除浏览器缓存 (Ctrl+Shift+R)

### Q: 为什么需要同时创建 Release？

A: GitHub Pages 会自动部署，但 Release 用于版本管理和用户通知。详见上文"为什么需要创建 Release？"

### Q: 如何回滚到旧版本？

A:
```bash
# 查看历史版本
gh release list

# 回滚到指定版本
git reset --hard vX.Y.Z
git push --force
```

## 联系方式

- GitHub Issues: https://github.com/sn1p4am/prompty/issues
- 项目主页: https://sn1p4am.github.io/prompty/
