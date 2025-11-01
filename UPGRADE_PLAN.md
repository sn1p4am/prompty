# Prompty 项目改造升级方案

## 📋 项目目标

将 Prompty 从"AI提示词批量测试工具"改造为"AI驱动的网站生成与管理工具"。

支持功能：
- ✅ 从0到1生成多页面网站
- ✅ 对已生成页面进行编辑、新增、删除
- ✅ 版本管理与回滚
- ✅ 跨页面依赖分析与自动修复

---

## 🏗️ 系统架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户交互层 (UI Layer)                      │
├─────────────────────────────────────────────────────────────┤
│  • 需求输入框 (支持连续对话)                                    │
│  • 页面预览区 (实时预览生成的HTML)                              │
│  • 版本管理面板 (版本切换、对比、回滚)                           │
│  • 页面列表 (显示所有页面，支持下载、删除)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   核心处理层 (Core Layer)                      │
├─────────────────────────────────────────────────────────────┤
│  1. 意图识别引擎 (Intent Recognition Engine)                  │
│     • LLM分析用户输入                                          │
│     • 识别操作类型: 生成/编辑/新增/删除                          │
│     • 提取关键信息: 目标页面、修改内容、影响范围                   │
│                                                               │
│  2. 页面生成引擎 (Page Generation Engine)                     │
│     • LLM生成HTML/CSS/JS代码                                  │
│     • 智能标记注入 (为元素添加语义ID)                            │
│     • 页面关系建立 (导航、链接等)                                │
│                                                               │
│  3. 代码定位引擎 (Code Localization Engine)                   │
│     • 解析HTML结构 (DOMParser)                                │
│     • 语义标记匹配 (通过data-semantic-id定位)                   │
│     • LLM辅助定位 (当标记不足时)                                │
│                                                               │
│  4. 代码修改引擎 (Code Modification Engine)                   │
│     • 生成修改代码                                             │
│     • Diff计算与应用                                          │
│     • 语法验证与修复                                           │
│                                                               │
│  5. 依赖分析引擎 (Dependency Analysis Engine)                 │
│     • 分析页面间关系 (导航、链接、共享组件)                       │
│     • 检测修改影响范围                                         │
│     • 自动修复关联页面                                         │
│                                                               │
│  6. 版本管理引擎 (Version Management Engine)                  │
│     • 版本快照存储                                             │
│     • 版本对比                                                │
│     • 版本回滚                                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   数据存储层 (Storage Layer)                   │
├─────────────────────────────────────────────────────────────┤
│  • localStorage: 页面数据、版本历史、配置                        │
│  • IndexedDB: 大型页面内容、资源文件                            │
│  • 数据结构:                                                   │
│    - ProjectState: 当前项目状态                               │
│    - VersionHistory: 版本历史记录                              │
│    - PageRegistry: 页面注册表                                 │
│    - DependencyGraph: 页面依赖关系图                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 核心功能模块详细设计

### 1. 意图识别引擎 (Intent Recognition Engine)

**职责：** 分析用户输入，识别操作意图和目标

**工作流程：**
```
用户输入 → LLM分析 → 输出结构化意图
```

**LLM Prompt模板：**
```javascript
const INTENT_RECOGNITION_PROMPT = `
你是一个网站修改意图识别专家。分析用户的需求，输出JSON格式的意图信息。

当前网站状态:
{pages_summary}

用户需求: {user_input}

请输出以下JSON格式:
{
  "intent_type": "generate|edit|add_page|delete_page|modify_navigation",
  "target_pages": ["page1.html", "page2.html"],
  "description": "用户意图的详细描述",
  "modifications": [
    {
      "page": "index.html",
      "type": "edit|add|delete",
      "target_element": "导航栏|某个按钮|页脚",
      "change_description": "具体要做什么修改"
    }
  ],
  "affected_pages": ["index.html", "about.html"],
  "reasoning": "为什么需要修改这些页面"
}
`;
```

**示例场景：**

| 用户输入 | 识别结果 |
|---------|---------|
| "把首页的蓝色按钮改成红色" | `intent_type: "edit"`, `target_pages: ["index.html"]` |
| "新增一个关于我们页面" | `intent_type: "add_page"`, `target_pages: ["about.html"]` |
| "删除联系我们页面" | `intent_type: "delete_page"`, `target_pages: ["contact.html"]` |
| "在导航栏添加一个博客入口" | `intent_type: "modify_navigation"`, `affected_pages: ["index.html", "about.html", ...]` |

---

### 2. 页面生成引擎 (Page Generation Engine)

**职责：** 生成带语义标记的HTML页面

**智能标记系统：**
```html
<!-- 为每个重要元素添加语义标记 -->
<nav data-semantic-id="main-navigation" data-semantic-type="navigation">
  <a href="index.html" data-semantic-id="nav-home" data-semantic-role="nav-link">首页</a>
  <a href="about.html" data-semantic-id="nav-about" data-semantic-role="nav-link">关于</a>
</nav>

<header data-semantic-id="page-header" data-semantic-type="header">
  <h1 data-semantic-id="page-title" data-semantic-type="title">欢迎</h1>
</header>

<button data-semantic-id="cta-button-primary" data-semantic-type="button" data-semantic-role="cta">
  联系我们
</button>
```

**生成流程：**
1. LLM生成HTML代码
2. 自动注入语义标记
3. 建立页面关系记录
4. 存储到版本系统

---

### 3. 代码定位引擎 (Code Localization Engine)

**职责：** 精确定位需要修改的代码位置

**定位策略（三级定位）：**

#### Level 1: 语义标记定位（最快）
```javascript
// 通过data-semantic-id直接定位
const element = doc.querySelector('[data-semantic-id="cta-button-primary"]');
```

#### Level 2: 语义描述定位（LLM辅助）
```javascript
// 当标记不够精确时，使用LLM
const LOCALIZATION_PROMPT = `
HTML代码:
{html_code}

用户要修改: {target_description}

请输出需要修改的元素的CSS选择器和行号:
{
  "selector": "nav > ul > li:nth-child(2)",
  "start_line": 45,
  "end_line": 47,
  "element_description": "导航栏中的第二个链接"
}
`;
```

#### Level 3: 结构分析定位（最精确）
```javascript
// 使用DOMParser解析整个HTML，通过AST遍历
const parser = new DOMParser();
const doc = parser.parseFromString(htmlContent, 'text/html');
// 遍历DOM树，通过语义匹配找到目标元素
```

---

### 4. 代码修改引擎 (Code Modification Engine)

**职责：** 生成并应用代码修改

**修改策略：**

#### 策略1: 元素级替换（适用于局部修改）
```javascript
// 1. 定位元素
const element = locateElement(html, targetDescription);

// 2. LLM生成新代码
const newCode = await generateCode(element, modification);

// 3. 替换
html = html.replace(element.outerHTML, newCode);
```

#### 策略2: 差分修改（适用于精确修改）
```javascript
// 1. LLM生成修改指令
const diffInstructions = await generateDiffInstructions(oldCode, modification);

// 2. 应用diff
const newCode = applyDiff(oldCode, diffInstructions);
```

#### 策略3: 全量重生成（适用于重大修改）
```javascript
// 1. LLM重新生成整个页面
const newHtml = await regenerateFullPage(pageContext, modifications);

// 2. 保留语义标记
const htmlWithMarkers = preserveSemanticMarkers(oldHtml, newHtml);
```

**LLM修改Prompt模板：**
```javascript
const CODE_MODIFICATION_PROMPT = `
你是一个HTML代码修改专家。

原始代码:
{original_code}

修改需求: {modification_description}

请生成修改后的完整代码，要求:
1. 保留所有data-semantic-*属性
2. 保持原有代码风格
3. 只修改需要改的部分
4. 确保HTML语法正确

输出格式:
{
  "modified_code": "修改后的HTML代码",
  "changes_summary": "修改了什么",
  "preserved_markers": ["semantic-id-1", "semantic-id-2"]
}
`;
```

---

### 5. 依赖分析引擎 (Dependency Analysis Engine)

**职责：** 分析页面间关系，处理修改的连锁影响

**依赖关系类型：**

```javascript
const DependencyTypes = {
  NAVIGATION: 'navigation',        // 导航链接
  HYPERLINK: 'hyperlink',          // 普通链接
  SHARED_COMPONENT: 'component',   // 共享组件（如header/footer）
  RESOURCE: 'resource',            // 共享资源（CSS/JS）
  SEMANTIC: 'semantic'             // 语义关联（如相关页面）
};
```

**依赖分析流程：**

```javascript
class DependencyAnalyzer {
  // 1. 构建依赖图
  buildDependencyGraph(pages) {
    const graph = {
      nodes: [],  // 页面节点
      edges: []   // 依赖边
    };

    pages.forEach(page => {
      // 分析导航链接
      const navLinks = this.extractNavLinks(page);

      // 分析共享组件
      const sharedComponents = this.extractSharedComponents(page);

      // 建立依赖关系
      graph.edges.push(...this.createDependencyEdges(page, navLinks, sharedComponents));
    });

    return graph;
  }

  // 2. 分析修改影响
  analyzeImpact(targetPage, modification) {
    const graph = this.buildDependencyGraph(allPages);

    // 找出所有受影响的页面
    const affectedPages = this.findAffectedPages(graph, targetPage, modification);

    return affectedPages.map(page => ({
      page: page.name,
      reason: page.affectedReason,
      suggestedFix: page.suggestedFix
    }));
  }
}
```

**自动修复示例：**

| 修改操作 | 检测到的影响 | 自动修复 |
|---------|------------|---------|
| 新增about.html | 所有页面的导航栏缺少about链接 | 在所有页面导航栏添加about链接 |
| 删除contact.html | 部分页面有指向contact的链接 | 移除或替换为其他页面 |
| 修改index.html的导航结构 | 其他页面导航结构不一致 | 同步更新所有页面的导航 |

---

### 6. 版本管理引擎 (Version Management Engine)

**职责：** 管理页面集的版本历史

**数据结构：**

```javascript
// 版本数据结构
const VersionStructure = {
  version_id: 'v1',
  timestamp: '2025-10-31T10:00:00Z',
  description: '初始版本 - 生成了首页和关于页',
  pages: {
    'index.html': {
      content: '...',
      hash: 'abc123...',
      semantic_markers: [...],
      dependencies: [...]
    },
    'about.html': {
      content: '...',
      hash: 'def456...',
      semantic_markers: [...],
      dependencies: [...]
    }
  },
  dependency_graph: {...},
  user_prompt: '生成一个公司网站，包含首页和关于页',
  parent_version: null  // 父版本ID
};
```

**版本管理功能：**

1. **创建版本快照**
```javascript
function createVersionSnapshot(pages, description, userPrompt) {
  const version = {
    version_id: `v${getNextVersionNumber()}`,
    timestamp: new Date().toISOString(),
    description,
    pages: serializePages(pages),
    dependency_graph: buildDependencyGraph(pages),
    user_prompt: userPrompt,
    parent_version: getCurrentVersionId()
  };

  saveToStorage(version);
  return version;
}
```

2. **版本对比**
```javascript
function compareVersions(v1, v2) {
  return {
    added_pages: findAddedPages(v1, v2),
    deleted_pages: findDeletedPages(v1, v2),
    modified_pages: findModifiedPages(v1, v2),
    detailed_diff: generateDetailedDiff(v1, v2)
  };
}
```

3. **版本回滚**
```javascript
function rollbackToVersion(versionId) {
  const targetVersion = loadVersion(versionId);
  restorePages(targetVersion.pages);
  restoreDependencyGraph(targetVersion.dependency_graph);
  setCurrentVersion(versionId);
}
```

**版本存储策略：**
- 使用localStorage存储版本元数据
- 使用IndexedDB存储完整页面内容（避免localStorage 5MB限制）
- 实现增量存储（只存储差异）以节省空间

```javascript
// 增量存储示例
function saveVersionIncremental(newVersion, oldVersion) {
  const diff = calculateDiff(oldVersion, newVersion);

  saveToIndexedDB({
    version_id: newVersion.version_id,
    base_version: oldVersion.version_id,
    diff: diff,  // 只存储差异
    metadata: newVersion.metadata
  });
}
```

---

## 🎨 UI交互设计

### 主界面布局

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 AI网站生成器          [v2]  [设置⚙️]  [导出📦]          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💬 需求输入框                                         │   │
│  │ 请输入您的需求（可以是初次生成，也可以是修改要求）      │   │
│  │                                                       │   │
│  │ [生成/修改] [清空]                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────┬────────────────────────────────────────┐ │
│  │ 📄 页面列表   │  🖼️ 预览区域                           │ │
│  │              │                                        │ │
│  │ □ index.html │  ┌──────────────────────────────────┐ │ │
│  │ □ about.html │  │                                  │ │ │
│  │ □ contact... │  │     页面预览（iframe）            │ │ │
│  │              │  │                                  │ │ │
│  │ [+ 新增页面] │  │                                  │ │ │
│  │              │  │                                  │ │ │
│  │ 📚 版本历史   │  └──────────────────────────────────┘ │ │
│  │ • v3 (当前)  │  [查看代码] [下载] [在新窗口打开]     │ │ │
│  │ • v2         │                                        │ │
│  │ • v1         │                                        │ │
│  │              │                                        │ │
│  └──────────────┴────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 操作日志                                           │   │
│  │ ✅ v3: 修改了index.html的导航栏样式                    │   │
│  │ ✅ v2: 新增了contact.html页面，同步更新了导航          │   │
│  │ ✅ v1: 生成了index.html和about.html                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 交互流程

#### 流程1: 初次生成（v1）
```
1. 用户输入: "生成一个公司网站，包含首页、关于我们、联系我们三个页面"
   ↓
2. 系统显示: "正在分析需求..."
   ↓
3. LLM分析: 识别为generate操作，需要生成3个页面
   ↓
4. 系统显示: "正在生成页面... [█████-----] 50%"
   ↓
5. 生成完成，显示预览
   ↓
6. 创建v1版本快照
   ↓
7. 显示成功提示: "✅ 已生成3个页面，当前版本: v1"
```

#### 流程2: 编辑现有页面（v1 → v2）
```
1. 用户输入: "把首页的蓝色按钮改成红色，字体改大一点"
   ↓
2. 系统分析意图
   ↓
3. 定位目标元素（通过语义标记或LLM）
   ↓
4. 显示预览对比:
   [修改前]  [修改后]
   ↓
5. 用户确认: [应用修改] [取消]
   ↓
6. 应用修改，创建v2版本快照
   ↓
7. 更新预览区域
```

#### 流程3: 新增页面，自动处理依赖（v2 → v3）
```
1. 用户输入: "新增一个博客页面"
   ↓
2. 系统分析: 需要新增blog.html
   ↓
3. 系统检测: "检测到其他页面的导航栏需要更新"
   ↓
4. 显示影响分析:
   "将会修改以下页面:
    • index.html (添加博客链接到导航栏)
    • about.html (添加博客链接到导航栏)
    • contact.html (添加博客链接到导航栏)"
   ↓
5. 用户确认: [全部应用] [仅创建新页面] [取消]
   ↓
6. 执行修改，创建v3版本快照
```

#### 流程4: 版本回滚
```
1. 用户点击版本历史中的v1
   ↓
2. 显示版本对比:
   "v1 → v3 的变化:
    • 新增: blog.html
    • 修改: index.html (导航栏、按钮样式)"
   ↓
3. 用户选择: [回滚到v1] [仅查看] [取消]
   ↓
4. 执行回滚，恢复到v1状态
   ↓
5. 显示提示: "⚠️ 已回滚到v1，当前有3个页面"
```

---

## 💾 数据存储设计

### 存储结构

```javascript
// localStorage 存储结构
{
  // 项目配置
  "project_config": {
    "project_name": "我的网站",
    "current_version": "v3",
    "api_key": "...",
    "settings": {...}
  },

  // 版本元数据（轻量级）
  "version_metadata": [
    {
      "version_id": "v1",
      "timestamp": "...",
      "description": "...",
      "pages_count": 3,
      "user_prompt": "..."
    },
    ...
  ],

  // 页面注册表（当前版本）
  "page_registry": {
    "index.html": {
      "hash": "abc123",
      "size": 1024,
      "last_modified": "..."
    },
    ...
  }
}

// IndexedDB 存储结构
Database: "prompty_db"
  ObjectStore: "versions"
    - version_id (key)
    - pages (完整HTML内容)
    - dependency_graph
    - full_snapshot

  ObjectStore: "pages"
    - page_id (key)
    - version_id
    - content
    - metadata
```

### 存储优化策略

1. **增量存储**
   - 只存储页面内容的diff
   - 节省70%以上的存储空间

2. **压缩存储**
   - 使用LZ-string等压缩算法
   - 可进一步节省50%空间

3. **自动清理**
   - 保留最近10个版本
   - 旧版本可导出为文件

```javascript
// 压缩存储示例
import LZString from 'lz-string';

function savePageCompressed(pageId, content) {
  const compressed = LZString.compress(content);
  localStorage.setItem(`page_${pageId}`, compressed);
}

function loadPageCompressed(pageId) {
  const compressed = localStorage.getItem(`page_${pageId}`);
  return LZString.decompress(compressed);
}
```

---

## 🔄 完整工作流程示例

### 示例场景：从0到1，再到迭代修改

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
阶段1: 初次生成（v1）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 用户: "帮我生成一个个人博客网站，要有首页、关于我、文章列表三个页面"

🤖 系统:
  ├─ 意图识别: intent_type = "generate"
  ├─ 生成页面: index.html, about.html, articles.html
  ├─ 注入语义标记: 导航栏、标题、文章卡片等
  ├─ 建立依赖关系: 导航链接、共享样式
  └─ 创建版本快照: v1

✅ 输出: 3个HTML页面，可预览、下载

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
阶段2: 样式修改（v1 → v2）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 用户: "把所有页面的导航栏背景色改成深蓝色"

🤖 系统:
  ├─ 意图识别: intent_type = "edit", target = "导航栏样式"
  ├─ 依赖分析: 影响 index.html, about.html, articles.html
  ├─ 代码定位: 通过 [data-semantic-id="main-navigation"] 定位
  ├─ 生成修改: 修改导航栏CSS
  ├─ 应用到所有页面
  └─ 创建版本快照: v2

✅ 输出: 3个页面的导航栏都变成深蓝色

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
阶段3: 新增页面（v2 → v3）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 用户: "新增一个友情链接页面"

🤖 系统:
  ├─ 意图识别: intent_type = "add_page", page_name = "links.html"
  ├─ 生成页面: links.html
  ├─ 依赖分析:
  │   └─ 检测到需要在所有页面的导航栏添加"友情链接"入口
  ├─ 询问用户: "是否同步更新所有页面的导航栏？"
  ├─ 用户确认: 是
  ├─ 修改所有页面的导航栏
  └─ 创建版本快照: v3

✅ 输出: 4个页面，导航栏都包含新的"友情链接"入口

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
阶段4: 删除页面（v3 → v4）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 用户: "删除友情链接页面"

🤖 系统:
  ├─ 意图识别: intent_type = "delete_page", page_name = "links.html"
  ├─ 依赖分析:
  │   ├─ 检测到其他页面的导航栏有指向links.html的链接
  │   └─ 检测到about.html中有一个链接指向links.html
  ├─ 询问用户: "检测到以下关联需要处理:
  │              1. 从所有页面导航栏移除'友情链接'
  │              2. about.html中有一个链接需要移除
  │              是否继续？"
  ├─ 用户确认: 是
  ├─ 删除 links.html
  ├─ 移除所有导航栏中的相关链接
  ├─ 移除 about.html 中的链接
  └─ 创建版本快照: v4

✅ 输出: 3个页面，links.html已移除，相关链接已清理

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
阶段5: 版本回滚（v4 → v2）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 用户: 点击版本历史中的 v2

🤖 系统:
  ├─ 显示版本对比:
  │   v2 → v4 的变化:
  │   • 新增: links.html (已删除)
  │   • 修改: 导航栏链接
  ├─ 询问用户: "回滚到v2将会:
  │              • 删除 links.html
  │              • 恢复导航栏到v2状态
  │              是否继续？"
  ├─ 用户确认: 是
  ├─ 从IndexedDB加载v2快照
  ├─ 恢复所有页面到v2状态
  └─ 设置当前版本: v2

✅ 输出: 回到v2状态，3个页面，深蓝色导航栏
```

---

## 🎯 技术实现要点

### 1. 语义标记注入策略

```javascript
/**
 * 为生成的HTML自动注入语义标记
 */
function injectSemanticMarkers(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 标记导航元素
  doc.querySelectorAll('nav').forEach((nav, index) => {
    nav.setAttribute('data-semantic-id', `navigation-${index}`);
    nav.setAttribute('data-semantic-type', 'navigation');
  });

  // 标记按钮
  doc.querySelectorAll('button, .btn, [role="button"]').forEach((btn, index) => {
    const purpose = inferButtonPurpose(btn); // 使用LLM推断按钮用途
    btn.setAttribute('data-semantic-id', `button-${purpose}-${index}`);
    btn.setAttribute('data-semantic-type', 'button');
    btn.setAttribute('data-semantic-role', purpose); // 'cta', 'submit', 'cancel', etc.
  });

  // 标记链接
  doc.querySelectorAll('a[href]').forEach((link, index) => {
    const href = link.getAttribute('href');
    if (href.endsWith('.html')) {
      link.setAttribute('data-semantic-type', 'internal-link');
      link.setAttribute('data-target-page', href);
    }
  });

  // 标记标题
  doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading, index) => {
    heading.setAttribute('data-semantic-id', `heading-${heading.tagName.toLowerCase()}-${index}`);
    heading.setAttribute('data-semantic-type', 'heading');
  });

  return doc.documentElement.outerHTML;
}
```

### 2. LLM辅助代码定位

```javascript
/**
 * 当语义标记不足时，使用LLM辅助定位
 */
async function locateElementWithLLM(html, targetDescription) {
  const prompt = `
你是一个HTML代码分析专家。

HTML代码:
\`\`\`html
${html}
\`\`\`

用户想要修改: ${targetDescription}

请分析并输出以下JSON:
{
  "selector": "CSS选择器（尽可能精确）",
  "element_type": "元素类型（button/nav/div等）",
  "start_line": 起始行号（估算）,
  "end_line": 结束行号（估算）,
  "confidence": 0.0-1.0（定位的置信度）,
  "reasoning": "为什么是这个元素"
}
`;

  const response = await callLLM(prompt);
  return JSON.parse(response);
}
```

### 3. 跨页面依赖检测

```javascript
/**
 * 检测跨页面的依赖关系
 */
function detectCrossPageDependencies(pages) {
  const dependencies = [];

  // 检测导航结构
  const navStructures = pages.map(page => extractNavigationStructure(page));
  if (!areNavigationsConsistent(navStructures)) {
    dependencies.push({
      type: 'NAVIGATION_INCONSISTENCY',
      affected_pages: pages.map(p => p.name),
      description: '导航结构不一致'
    });
  }

  // 检测内部链接
  pages.forEach(page => {
    const links = extractInternalLinks(page.content);
    links.forEach(link => {
      if (!pageExists(link.href, pages)) {
        dependencies.push({
          type: 'BROKEN_LINK',
          source_page: page.name,
          target_page: link.href,
          description: `${page.name}中的链接指向不存在的页面${link.href}`
        });
      }
    });
  });

  // 检测共享组件
  const sharedComponents = detectSharedComponents(pages);
  if (sharedComponents.length > 0) {
    dependencies.push({
      type: 'SHARED_COMPONENT',
      components: sharedComponents,
      description: '检测到共享组件（header/footer等）'
    });
  }

  return dependencies;
}
```

### 4. 智能差分算法

```javascript
/**
 * 计算HTML的智能差分
 */
function calculateSmartDiff(oldHtml, newHtml) {
  const oldDoc = parseHTML(oldHtml);
  const newDoc = parseHTML(newHtml);

  const changes = [];

  // 比较DOM树
  function compareDOMNodes(oldNode, newNode, path = []) {
    if (!oldNode && newNode) {
      changes.push({ type: 'ADD', path, node: newNode });
    } else if (oldNode && !newNode) {
      changes.push({ type: 'DELETE', path, node: oldNode });
    } else if (oldNode.tagName !== newNode.tagName) {
      changes.push({ type: 'REPLACE', path, oldNode, newNode });
    } else {
      // 比较属性
      compareAttributes(oldNode, newNode, path);
      // 比较子节点
      const maxLength = Math.max(oldNode.children.length, newNode.children.length);
      for (let i = 0; i < maxLength; i++) {
        compareDOMNodes(
          oldNode.children[i],
          newNode.children[i],
          [...path, i]
        );
      }
    }
  }

  compareDOMNodes(oldDoc.body, newDoc.body);

  return changes;
}
```

---

## 🚀 实施路线图

### Phase 1: 基础架构（2周）
- [ ] 搭建新的UI框架
- [ ] 实现意图识别引擎
- [ ] 实现基础的页面生成功能
- [ ] 实现localStorage/IndexedDB存储

### Phase 2: 核心功能（3周）
- [ ] 实现代码定位引擎
- [ ] 实现代码修改引擎
- [ ] 实现版本管理功能
- [ ] 实现页面预览功能

### Phase 3: 高级功能（2周）
- [ ] 实现依赖分析引擎
- [ ] 实现跨页面自动修复
- [ ] 实现版本对比与回滚
- [ ] 实现导出功能

### Phase 4: 优化与测试（1周）
- [ ] 性能优化（大文件处理、存储优化）
- [ ] 用户体验优化
- [ ] 完整流程测试
- [ ] 文档编写

---

## ⚠️ 技术挑战与解决方案

### 挑战1: LLM输出不稳定
**问题:** LLM可能返回格式不正确的代码或JSON

**解决方案:**
```javascript
// 1. 使用JSON Schema约束输出
// 2. 实现输出验证与自动修复
function validateAndRepairLLMOutput(output, expectedSchema) {
  try {
    const parsed = JSON.parse(output);
    if (validateSchema(parsed, expectedSchema)) {
      return parsed;
    } else {
      // 尝试修复
      return repairJSON(output, expectedSchema);
    }
  } catch (e) {
    // 提取JSON片段
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return validateAndRepairLLMOutput(jsonMatch[0], expectedSchema);
    }
    throw new Error('无法解析LLM输出');
  }
}
```

### 挑战2: 大型HTML文件的存储限制
**问题:** localStorage有5MB限制，IndexedDB虽然更大但仍有限制

**解决方案:**
```javascript
// 1. 使用压缩算法（LZ-String）
// 2. 实现增量存储
// 3. 实现分片存储
function savePageInChunks(pageId, content) {
  const CHUNK_SIZE = 50000; // 50KB per chunk
  const compressed = LZString.compress(content);
  const chunks = splitIntoChunks(compressed, CHUNK_SIZE);

  chunks.forEach((chunk, index) => {
    indexedDB.put('page_chunks', {
      page_id: pageId,
      chunk_index: index,
      chunk_data: chunk
    });
  });
}
```

### 挑战3: 精确定位复杂HTML中的元素
**问题:** 用户描述可能模糊，难以精确定位

**解决方案:**
```javascript
// 多级定位策略
async function locateElement(html, description) {
  // Level 1: 尝试语义标记
  let result = locateBySemanticMarker(html, description);
  if (result.confidence > 0.8) return result;

  // Level 2: 使用LLM分析
  result = await locateWithLLM(html, description);
  if (result.confidence > 0.6) return result;

  // Level 3: 交互式确认
  const candidates = result.candidates;
  result = await askUserToConfirm(candidates);
  return result;
}
```

### 挑战4: 保持代码风格一致性
**问题:** LLM生成的代码风格可能与原代码不一致

**解决方案:**
```javascript
// 提取并应用代码风格
function extractCodeStyle(html) {
  return {
    indentation: detectIndentation(html),
    quote_style: detectQuoteStyle(html),
    class_naming: detectClassNaming(html),
    formatting: detectFormatting(html)
  };
}

function applyCodeStyle(newCode, style) {
  // 应用缩进
  newCode = applyIndentation(newCode, style.indentation);
  // 统一引号
  newCode = normalizeQuotes(newCode, style.quote_style);
  // 格式化
  newCode = formatCode(newCode, style.formatting);
  return newCode;
}
```

---

## 📊 性能指标

### 目标性能指标

| 操作 | 目标时间 | 说明 |
|------|---------|------|
| 生成单个页面 | < 10秒 | 使用GPT-4级别模型 |
| 编辑单个元素 | < 5秒 | 简单修改 |
| 版本切换 | < 1秒 | 从缓存加载 |
| 依赖分析 | < 2秒 | 分析5个页面 |
| 页面预览 | < 500ms | 本地渲染 |

### 存储优化目标

| 项目规模 | 版本数 | 预计存储 | 优化后 |
|---------|--------|---------|--------|
| 小型(3-5页) | 10个版本 | 5MB | 1MB |
| 中型(10页) | 10个版本 | 20MB | 4MB |
| 大型(20页) | 10个版本 | 50MB | 10MB |

---

## 🔐 安全考虑

1. **API Key安全**
   - localStorage加密存储
   - 不在生成的HTML中暴露API Key
   - 支持环境变量配置

2. **XSS防护**
   - 对生成的HTML进行安全检查
   - 过滤危险的script标签
   - 使用CSP策略

3. **数据隔离**
   - 每个项目独立存储
   - 支持导出/导入加密备份

---

## 📚 后续扩展方向

1. **模板市场**
   - 预设网站模板
   - 用户可分享模板
   - 模板评分与推荐

2. **组件库**
   - 预定义可复用组件
   - 拖拽式组件组装
   - 自定义组件库

3. **协作功能**
   - 多人协作编辑
   - 版本分支与合并
   - 评论与审阅

4. **高级功能**
   - 响应式设计自动生成
   - 无障碍(a11y)自动检查
   - SEO优化建议
   - 性能优化建议

---

## 🎉 总结

本方案提供了一个完整的改造升级路径，核心特点：

✅ **纯前端实现** - 无需后端，降低部署复杂度
✅ **LLM驱动** - 利用AI理解用户意图，智能定位和修改代码
✅ **版本管理** - 完整的版本历史，支持回滚和对比
✅ **依赖分析** - 自动检测和处理跨页面影响
✅ **渐进增强** - 保留现有UI风格，平滑过渡

**下一步行动:**
1. 确认方案可行性
2. 细化技术实现细节
3. 开始Phase 1开发
