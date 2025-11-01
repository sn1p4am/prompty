# Prompty 项目改造升级方案 V2.0

> 基于深入调研的改进版方案，重点解决多文件多片段精确编辑问题

---

## 📊 技术调研总结

经过深入调研，我发现了以下关键技术，可以显著提升代码定位和编辑的能力：

### 1. 轻量级数据库方案对比

| 方案 | 大小 | 特点 | 推荐度 |
|------|------|------|--------|
| **PGlite** | 3MB (gzipped) | PostgreSQL WASM，支持pgvector、全文搜索、JSON查询 | ⭐⭐⭐⭐⭐ |
| **sql.js** | 500KB | SQLite WASM，轻量但功能有限 | ⭐⭐⭐ |
| **absurd-sql** | 500KB + | SQLite + IndexedDB后端，持久化更好 | ⭐⭐⭐⭐ |
| **IndexedDB** | 原生 | 浏览器原生，但查询能力弱 | ⭐⭐ |

**推荐方案：PGlite**

理由：
- ✅ 完整的SQL支持（比IndexedDB强大太多）
- ✅ 支持全文搜索（可以快速搜索代码片段）
- ✅ 支持JSON字段（适合存储AST）
- ✅ 支持pgvector（未来可以做语义搜索）
- ✅ 只有3MB，对于单页应用完全可接受

### 2. AST解析方案对比

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **web-tree-sitter** | 精确的AST解析，支持查询语言 | 需要加载WASM文件（每种语言~200KB） | ⭐⭐⭐⭐⭐ |
| **DOMParser** | 浏览器原生，零依赖 | 只能解析HTML，无法处理内嵌的CSS/JS | ⭐⭐⭐ |
| **cheerio/parse5** | 轻量的HTML解析 | 功能有限，无AST查询能力 | ⭐⭐ |

**推荐方案：混合使用**
- HTML结构解析：DOMParser（快速、零依赖）
- 精确代码定位：web-tree-sitter（强大、可查询）
- 简单场景：直接用语义标记

### 3. 多文件代码搜索灵感来源

调研了 **ast-grep** 这个强大的工具，学习其核心思路：

```bash
# ast-grep可以做到：
ast-grep --pattern 'function $NAME() { $$$ }' --lang js

# 查找所有函数定义，并支持：
# 1. 模式匹配（$NAME是元变量）
# 2. 多文件搜索
# 3. AST-based重写
```

**核心启示：**
- 使用Tree-sitter Query Language进行AST查询
- 支持元变量匹配（$VAR, $$$等）
- 可以精确定位多个文件中的代码片段

---

## 🏗️ 改进后的系统架构

### 整体架构图（V2.0）

```
┌──────────────────────────────────────────────────────────────┐
│                    用户交互层 (UI Layer)                       │
├──────────────────────────────────────────────────────────────┤
│  • 需求输入框 (支持连续对话)                                    │
│  • 代码预览区 (支持多文件同时预览、diff对比)                     │
│  • 版本管理面板 (时光机式版本查看)                               │
│  • 影响分析面板 (可视化展示修改影响的文件和代码片段)              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                   核心处理层 (Core Layer)                      │
├──────────────────────────────────────────────────────────────┤
│  1. 🧠 意图识别引擎 (Intent Recognition Engine)                │
│     • LLM分析用户输入                                          │
│     • 提取关键信息：操作类型、目标元素、修改范围                 │
│     • 输出结构化指令                                           │
│                                                               │
│  2. 🔍 代码索引引擎 (Code Indexing Engine) ⭐新增              │
│     • 使用 PGlite 存储代码索引                                 │
│     • AST索引（每个节点的类型、位置、父子关系）                  │
│     • 全文索引（快速文本搜索）                                  │
│     • 语义标记索引（data-semantic-id映射）                     │
│                                                               │
│  3. 🎯 多文件代码定位引擎 (Multi-File Locator) ⭐改进          │
│     • 策略1: SQL查询（通过索引快速定位）                        │
│     • 策略2: Tree-sitter Query（AST模式匹配）                 │
│     • 策略3: LLM辅助（语义理解）                               │
│     • 输出：所有匹配的代码位置 (file:line:column)              │
│                                                               │
│  4. ✏️ 批量代码修改引擎 (Batch Modification Engine) ⭐改进     │
│     • 支持多文件多位置同时修改                                  │
│     • LLM生成每个位置的修改代码                                │
│     • 事务式应用（全部成功或全部回滚）                          │
│     • 冲突检测与解决                                           │
│                                                               │
│  5. 📊 影响分析引擎 (Impact Analysis Engine)                   │
│     • 依赖图分析（导航、链接、共享组件）                        │
│     • 变更影响预测                                             │
│     • 自动修复建议                                             │
│                                                               │
│  6. 📦 版本管理引擎 (Version Management Engine)                │
│     • 增量版本存储                                             │
│     • 版本对比与回滚                                           │
│     • 变更历史追踪                                             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                   数据存储层 (Storage Layer)                   │
├──────────────────────────────────────────────────────────────┤
│  • PGlite 数据库: 代码索引、AST、版本历史                       │
│  • IndexedDB: 大文件内容、静态资源                             │
│  • localStorage: 用户配置、API Key                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 核心功能改进：多文件多片段编辑

### 问题场景举例

**场景1：修改所有页面的导航栏样式**
```
用户输入: "把所有页面的导航栏背景色改成深蓝色，字体改成白色"

涉及文件: index.html, about.html, contact.html, blog.html (4个文件)
涉及代码: 每个文件中的 <nav> 元素的 style 或 class
```

**场景2：重命名一个共享组件**
```
用户输入: "把所有的 'primary-button' 类名改成 'btn-primary'"

涉及文件: 所有HTML文件
涉及代码:
  - HTML中的 class="primary-button"
  - CSS中的 .primary-button { ... }
  - JS中的 querySelector('.primary-button')
```

**场景3：删除页面后清理所有引用**
```
用户输入: "删除联系我们页面"

涉及文件: contact.html (删除) + 所有其他页面 (清理引用)
涉及代码:
  - 所有导航栏中的 <a href="contact.html">
  - 所有页面中指向contact.html的链接
```

---

### 解决方案：基于AST索引的多文件定位与编辑

#### 1. 代码索引系统（使用PGlite）

**数据库Schema设计：**

```sql
-- 文件表
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version_id, file_path)
);

-- AST节点表（存储解析后的AST节点）
CREATE TABLE ast_nodes (
  id SERIAL PRIMARY KEY,
  file_id INTEGER REFERENCES files(id),
  node_type TEXT NOT NULL,           -- 节点类型：element, attribute, text等
  tag_name TEXT,                     -- HTML标签名
  start_line INTEGER NOT NULL,
  start_column INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  end_column INTEGER NOT NULL,
  parent_id INTEGER REFERENCES ast_nodes(id),
  node_path TEXT,                    -- 节点路径如 "html>body>nav>a"
  attributes JSONB,                  -- 属性（如class, id, href等）
  semantic_id TEXT,                  -- 语义标记ID
  text_content TEXT,                 -- 文本内容
  INDEX idx_node_type (node_type),
  INDEX idx_tag_name (tag_name),
  INDEX idx_semantic_id (semantic_id),
  INDEX idx_node_path (node_path)
);

-- 代码片段索引表（用于快速全文搜索）
CREATE TABLE code_snippets (
  id SERIAL PRIMARY KEY,
  file_id INTEGER REFERENCES files(id),
  snippet_type TEXT NOT NULL,        -- 类型：html, css, javascript
  content TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  context JSONB                      -- 上下文信息
);

-- 全文搜索索引
CREATE INDEX idx_code_snippets_fts ON code_snippets
USING GIN (to_tsvector('english', content));

-- 依赖关系表
CREATE TABLE dependencies (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL,
  source_file TEXT NOT NULL,
  target_file TEXT,
  dependency_type TEXT NOT NULL,     -- navigation, link, component, resource
  source_location JSONB,             -- 源位置信息
  description TEXT
);

-- 语义标记映射表
CREATE TABLE semantic_markers (
  id SERIAL PRIMARY KEY,
  file_id INTEGER REFERENCES files(id),
  semantic_id TEXT NOT NULL,
  semantic_type TEXT NOT NULL,       -- navigation, button, header等
  semantic_role TEXT,                -- cta, submit, cancel等
  node_id INTEGER REFERENCES ast_nodes(id),
  UNIQUE(file_id, semantic_id)
);
```

#### 2. 索引构建流程

```javascript
/**
 * 使用 web-tree-sitter 和 PGlite 构建代码索引
 */
class CodeIndexBuilder {
  constructor(pglite, treeSitter) {
    this.db = pglite;
    this.parser = treeSitter;
  }

  async buildIndex(files, versionId) {
    await this.db.query('BEGIN TRANSACTION');

    try {
      for (const file of files) {
        // 1. 保存文件内容
        const fileId = await this.saveFile(file, versionId);

        // 2. 解析HTML结构（使用DOMParser快速解析）
        const doc = new DOMParser().parseFromString(file.content, 'text/html');
        await this.indexDOMTree(doc.documentElement, fileId, null);

        // 3. 提取并解析内嵌的CSS和JS（使用tree-sitter）
        await this.indexEmbeddedCode(file.content, fileId);

        // 4. 建立依赖关系
        await this.indexDependencies(doc, file.path, versionId);

        // 5. 索引语义标记
        await this.indexSemanticMarkers(doc, fileId);
      }

      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  async indexDOMTree(node, fileId, parentId, depth = 0, path = []) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const currentPath = [...path, node.tagName.toLowerCase()];
      const nodePath = currentPath.join('>');

      // 获取节点位置信息（需要记录原始HTML的行号）
      const location = this.getNodeLocation(node);

      // 提取属性
      const attributes = {};
      for (const attr of node.attributes) {
        attributes[attr.name] = attr.value;
      }

      // 插入AST节点
      const result = await this.db.query(`
        INSERT INTO ast_nodes (
          file_id, node_type, tag_name,
          start_line, start_column, end_line, end_column,
          parent_id, node_path, attributes, text_content
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        fileId, 'element', node.tagName.toLowerCase(),
        location.startLine, location.startColumn,
        location.endLine, location.endColumn,
        parentId, nodePath, JSON.stringify(attributes),
        node.textContent?.trim().substring(0, 500) // 限制长度
      ]);

      const nodeId = result.rows[0].id;

      // 递归索引子节点
      for (const child of node.children) {
        await this.indexDOMTree(child, fileId, nodeId, depth + 1, currentPath);
      }
    }
  }

  async indexEmbeddedCode(htmlContent, fileId) {
    // 提取<style>标签中的CSS
    const styleMatches = htmlContent.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const match of styleMatches) {
      const cssCode = match[1];
      const startLine = this.getLineNumber(htmlContent, match.index);

      // 使用tree-sitter解析CSS
      const tree = this.parser.parse(cssCode, 'css');
      await this.saveCSSSnippets(tree, fileId, startLine);
    }

    // 提取<script>标签中的JavaScript
    const scriptMatches = htmlContent.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of scriptMatches) {
      const jsCode = match[1];
      const startLine = this.getLineNumber(htmlContent, match.index);

      // 使用tree-sitter解析JavaScript
      const tree = this.parser.parse(jsCode, 'javascript');
      await this.saveJSSnippets(tree, fileId, startLine);
    }
  }

  getLineNumber(content, position) {
    return content.substring(0, position).split('\n').length;
  }
}
```

#### 3. 多文件代码定位

**基于SQL查询的快速定位：**

```javascript
class MultiFileLocator {
  constructor(pglite, llmClient) {
    this.db = pglite;
    this.llm = llmClient;
  }

  /**
   * 定位多个文件中的代码片段
   * @param {string} description - 用户描述，如"所有导航栏"
   * @param {string} versionId - 版本ID
   * @returns {Array} 匹配的代码位置列表
   */
  async locateCodeAcrossFiles(description, versionId) {
    // Step 1: 尝试SQL查询（最快）
    let matches = await this.queryBySQL(description, versionId);

    // Step 2: 如果SQL无法精确匹配，使用Tree-sitter Query
    if (matches.length === 0 || matches.some(m => m.confidence < 0.7)) {
      matches = await this.queryByTreeSitter(description, versionId);
    }

    // Step 3: 如果仍然不确定，使用LLM辅助
    if (matches.length === 0 || matches.some(m => m.confidence < 0.5)) {
      matches = await this.queryByLLM(description, versionId, matches);
    }

    return matches;
  }

  async queryBySQL(description, versionId) {
    // 解析描述中的关键词
    const keywords = this.extractKeywords(description);
    // "所有导航栏" -> keywords: ["nav", "navigation"]

    const query = `
      SELECT
        f.file_path,
        n.tag_name,
        n.start_line,
        n.end_line,
        n.attributes,
        n.semantic_id,
        n.node_path
      FROM ast_nodes n
      JOIN files f ON n.file_id = f.id
      WHERE f.version_id = $1
        AND (
          n.tag_name = ANY($2)  -- 匹配标签名
          OR n.semantic_id LIKE ANY($3)  -- 匹配语义ID
          OR n.node_path LIKE ANY($4)  -- 匹配节点路径
        )
      ORDER BY f.file_path, n.start_line
    `;

    const result = await this.db.query(query, [
      versionId,
      keywords.tags,        // ['nav']
      keywords.semanticIds, // ['%navigation%']
      keywords.paths        // ['%nav%']
    ]);

    return result.rows.map(row => ({
      file: row.file_path,
      startLine: row.start_line,
      endLine: row.end_line,
      tagName: row.tag_name,
      attributes: JSON.parse(row.attributes),
      semanticId: row.semantic_id,
      confidence: 0.9, // SQL查询结果置信度高
      locator: 'sql'
    }));
  }

  async queryByTreeSitter(description, versionId) {
    // 使用Tree-sitter Query Language
    // 例如：查找所有的导航栏
    const tsQuery = this.buildTreeSitterQuery(description);

    // Tree-sitter Query示例：
    // (element
    //   (start_tag (tag_name) @tag
    //     (#eq? @tag "nav")))

    // 获取所有文件
    const files = await this.db.query(`
      SELECT id, file_path, content
      FROM files
      WHERE version_id = $1
    `, [versionId]);

    const matches = [];

    for (const file of files.rows) {
      // 解析HTML
      const tree = await this.parseHTML(file.content);

      // 执行查询
      const queryMatches = tsQuery.matches(tree.rootNode);

      for (const match of queryMatches) {
        matches.push({
          file: file.file_path,
          startLine: match.captures[0].node.startPosition.row + 1,
          endLine: match.captures[0].node.endPosition.row + 1,
          node: match.captures[0].node,
          confidence: 0.8,
          locator: 'tree-sitter'
        });
      }
    }

    return matches;
  }

  async queryByLLM(description, versionId, previousMatches) {
    // 获取相关代码片段
    const codeSnippets = await this.getRelevantSnippets(description, versionId);

    const prompt = `
你是一个代码定位专家。用户想要修改：${description}

以下是可能相关的代码片段：
${codeSnippets.map((s, i) => `
[片段${i + 1}] 文件：${s.file}，行：${s.startLine}-${s.endLine}
\`\`\`html
${s.code}
\`\`\`
`).join('\n')}

请分析哪些代码片段是用户想要修改的。输出JSON格式：
{
  "matches": [
    {
      "snippet_index": 1,
      "confidence": 0.95,
      "reasoning": "这是主导航栏，符合用户描述"
    },
    ...
  ]
}
`;

    const response = await this.llm.chat(prompt);
    const result = JSON.parse(response);

    return result.matches.map(m => ({
      ...codeSnippets[m.snippet_index - 1],
      confidence: m.confidence,
      reasoning: m.reasoning,
      locator: 'llm'
    }));
  }

  extractKeywords(description) {
    // 简化版本，实际可以使用NLP或LLM
    const tagMap = {
      '导航': ['nav'],
      '按钮': ['button', 'a'],
      '标题': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      '链接': ['a'],
      '图片': ['img'],
      '表单': ['form'],
      '输入': ['input', 'textarea'],
    };

    const keywords = {
      tags: [],
      semanticIds: [],
      paths: []
    };

    for (const [key, tags] of Object.entries(tagMap)) {
      if (description.includes(key)) {
        keywords.tags.push(...tags);
        keywords.semanticIds.push(`%${key}%`);
        keywords.paths.push(`%${tags[0]}%`);
      }
    }

    return keywords;
  }
}
```

#### 4. 批量代码修改

```javascript
class BatchCodeModifier {
  constructor(pglite, llmClient) {
    this.db = pglite;
    this.llm = llmClient;
  }

  /**
   * 批量修改多个文件中的代码
   * @param {Array} locations - 代码位置列表
   * @param {string} modification - 修改描述
   * @param {string} versionId - 版本ID
   */
  async batchModify(locations, modification, versionId) {
    // 按文件分组
    const fileGroups = this.groupByFile(locations);

    // 为每个位置生成修改代码
    const modifications = [];

    for (const [filePath, locs] of Object.entries(fileGroups)) {
      // 获取文件内容
      const file = await this.db.query(`
        SELECT content FROM files
        WHERE version_id = $1 AND file_path = $2
      `, [versionId, filePath]);

      const originalContent = file.rows[0].content;

      // 为该文件的所有修改位置生成新代码
      const fileModifications = await this.generateModificationsForFile(
        originalContent,
        locs,
        modification
      );

      modifications.push({
        filePath,
        originalContent,
        modifications: fileModifications
      });
    }

    // 应用修改（事务式）
    return await this.applyModifications(modifications, versionId);
  }

  async generateModificationsForFile(content, locations, modification) {
    const lines = content.split('\n');
    const modifications = [];

    for (const loc of locations) {
      // 提取原始代码
      const originalCode = lines
        .slice(loc.startLine - 1, loc.endLine)
        .join('\n');

      // 使用LLM生成修改后的代码
      const prompt = `
你是一个代码修改专家。

原始代码（${loc.file}:${loc.startLine}-${loc.endLine}）：
\`\`\`html
${originalCode}
\`\`\`

修改要求: ${modification}

请输出修改后的完整代码，保持缩进和格式。只输出代码，不要其他说明。
`;

      const modifiedCode = await this.llm.chat(prompt);

      modifications.push({
        startLine: loc.startLine,
        endLine: loc.endLine,
        originalCode,
        modifiedCode,
        location: loc
      });
    }

    return modifications;
  }

  async applyModifications(modifications, versionId) {
    await this.db.query('BEGIN TRANSACTION');

    try {
      const updatedFiles = [];

      for (const fileMod of modifications) {
        let content = fileMod.originalContent;
        const lines = content.split('\n');

        // 按行号倒序应用修改（避免行号偏移）
        const sortedMods = fileMod.modifications.sort(
          (a, b) => b.startLine - a.startLine
        );

        for (const mod of sortedMods) {
          // 替换指定行
          const before = lines.slice(0, mod.startLine - 1);
          const after = lines.slice(mod.endLine);
          const newLines = mod.modifiedCode.split('\n');

          lines.splice(
            mod.startLine - 1,
            mod.endLine - mod.startLine + 1,
            ...newLines
          );
        }

        const newContent = lines.join('\n');

        // 更新文件内容
        await this.db.query(`
          UPDATE files
          SET content = $1, content_hash = $2
          WHERE version_id = $3 AND file_path = $4
        `, [
          newContent,
          this.hashContent(newContent),
          versionId,
          fileMod.filePath
        ]);

        updatedFiles.push({
          path: fileMod.filePath,
          content: newContent,
          modificationsCount: fileMod.modifications.length
        });
      }

      await this.db.query('COMMIT');

      // 重新构建索引
      await this.rebuildIndex(updatedFiles, versionId);

      return updatedFiles;
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  groupByFile(locations) {
    const groups = {};
    for (const loc of locations) {
      if (!groups[loc.file]) {
        groups[loc.file] = [];
      }
      groups[loc.file].push(loc);
    }
    return groups;
  }

  hashContent(content) {
    // 简单的hash实现，实际可以用crypto
    return content.length + '_' + content.substring(0, 100);
  }
}
```

#### 5. 完整流程示例

```javascript
/**
 * 完整的多文件编辑流程
 */
async function handleMultiFileEdit(userInput, versionId) {
  // 1. 意图识别
  const intent = await intentRecognizer.analyze(userInput, versionId);
  /*
  {
    intent_type: "edit",
    target_description: "所有导航栏",
    modification: "背景色改成深蓝色，字体改成白色",
    estimated_files: 4
  }
  */

  // 2. 多文件代码定位
  const locations = await locator.locateCodeAcrossFiles(
    intent.target_description,
    versionId
  );
  /*
  [
    { file: "index.html", startLine: 12, endLine: 18, confidence: 0.95 },
    { file: "about.html", startLine: 12, endLine: 18, confidence: 0.95 },
    { file: "contact.html", startLine: 12, endLine: 18, confidence: 0.95 },
    { file: "blog.html", startLine: 12, endLine: 18, confidence: 0.95 }
  ]
  */

  // 3. 向用户展示影响分析
  console.log(`将会修改 ${locations.length} 个位置：`);
  locations.forEach(loc => {
    console.log(`  • ${loc.file}:${loc.startLine}-${loc.endLine}`);
  });

  // 4. 用户确认
  const confirmed = await askUserConfirmation(locations);
  if (!confirmed) return;

  // 5. 批量修改
  const result = await modifier.batchModify(
    locations,
    intent.modification,
    versionId
  );

  // 6. 创建新版本快照
  const newVersionId = await createVersionSnapshot(
    result,
    `修改${intent.target_description}`,
    userInput
  );

  // 7. 返回结果
  return {
    success: true,
    newVersionId,
    filesModified: result.length,
    locationsModified: locations.length
  };
}
```

---

## 🎨 UI改进：多文件编辑的可视化

### 影响分析面板

```
┌─────────────────────────────────────────────────────────┐
│ 📊 影响分析                                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 用户需求: "把所有导航栏背景色改成深蓝色"                   │
│                                                          │
│ 检测到 4 个文件需要修改：                                  │
│                                                          │
│ ✓ index.html (第12-18行)                                │
│   <nav class="main-nav">  ← 将修改这个元素               │
│     <a href="index.html">首页</a>                        │
│     ...                                                  │
│   </nav>                                                 │
│   [查看完整代码] [预览修改效果]                           │
│                                                          │
│ ✓ about.html (第12-18行)                                │
│   <nav class="main-nav">  ← 将修改这个元素               │
│     ...                                                  │
│   [查看完整代码] [预览修改效果]                           │
│                                                          │
│ ✓ contact.html (第12-18行)                              │
│ ✓ blog.html (第12-18行)                                 │
│                                                          │
│ [全部应用] [逐个确认] [取消]                              │
└─────────────────────────────────────────────────────────┘
```

### 并排Diff预览

```
┌──────────────────────────────────────────────────────────────┐
│ 📝 修改预览: index.html (第12-18行)                           │
├─────────────────────────┬────────────────────────────────────┤
│ 修改前                   │ 修改后                              │
├─────────────────────────┼────────────────────────────────────┤
│ <nav class="main-nav">  │ <nav class="main-nav"              │
│                         │   style="background: #001f3f;      │
│                         │          color: white;">           │
│   <a href="index.html"> │   <a href="index.html"             │
│     首页                │     style="color: white;">         │
│   </a>                  │     首页                            │
│   ...                   │   </a>                              │
│ </nav>                  │   ...                               │
│                         │ </nav>                              │
├─────────────────────────┴────────────────────────────────────┤
│ [应用此修改] [跳过] [手动编辑]                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 技术栈最终选型

### 核心库

| 库 | 版本 | 大小 | 用途 |
|----|------|------|------|
| **PGlite** | latest | 3MB | 代码索引数据库 |
| **web-tree-sitter** | latest | ~100KB | AST解析引擎 |
| **tree-sitter-html.wasm** | latest | ~200KB | HTML解析器 |
| **tree-sitter-css.wasm** | latest | ~200KB | CSS解析器 |
| **tree-sitter-javascript.wasm** | latest | ~200KB | JavaScript解析器 |
| **LZ-String** | latest | ~5KB | 压缩存储 |

**总大小：** ~3.9MB (gzipped后约2MB)

### 加载策略

```javascript
// 按需懒加载
const loadCodeIndexing = async () => {
  if (!window.codeIndexing) {
    const [PGlite, TreeSitter] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite'),
      import('https://cdn.jsdelivr.net/npm/web-tree-sitter')
    ]);

    // 初始化Tree-sitter
    await TreeSitter.init();

    const parser = new TreeSitter();

    // 只在需要时加载特定语言的解析器
    const htmlLang = await TreeSitter.Language.load('/tree-sitter-html.wasm');
    parser.setLanguage(htmlLang);

    window.codeIndexing = {
      db: new PGlite.PGlite(),
      parser,
      TreeSitter
    };
  }

  return window.codeIndexing;
};
```

---

## 🔄 改进后的完整工作流程

### 场景：修改所有页面的导航栏样式

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: 用户输入
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 用户: "把所有页面的导航栏背景色改成深蓝色，字体改成白色"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 2: 意图识别
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 系统: 正在分析意图...

结果：
  • 操作类型: 编辑
  • 目标: 导航栏 (所有文件)
  • 修改内容: 样式 (背景色 + 字体颜色)
  • 预计影响: 4个文件

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 3: 代码定位（三级定位策略）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Level 1: SQL查询索引
   查询条件: tag_name='nav' OR semantic_id LIKE '%navigation%'
   ✓ 找到 4 个匹配 (置信度: 0.95)

定位结果:
  ✓ index.html:12-18 (confidence: 0.95)
  ✓ about.html:12-18 (confidence: 0.95)
  ✓ contact.html:12-18 (confidence: 0.95)
  ✓ blog.html:12-18 (confidence: 0.95)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 4: 影响分析
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 分析修改影响...

检测结果:
  • 直接修改: 4个文件中的导航栏样式
  • 间接影响: 无（纯样式修改，无结构变化）
  • 潜在冲突: 无

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 5: 用户预览与确认
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 显示并排diff预览...

[修改前]          [修改后]
<nav>            <nav style="background:#001f3f;color:white">
  <a>首页</a>     <a style="color:white">首页</a>
</nav>           </nav>

用户操作: [全部应用] ← 点击

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 6: 批量修改（事务式）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✏️ 开始批量修改...

BEGIN TRANSACTION
  ├─ 修改 index.html:12-18     ✓
  ├─ 修改 about.html:12-18     ✓
  ├─ 修改 contact.html:12-18   ✓
  └─ 修改 blog.html:12-18      ✓
COMMIT

重建索引...
  ├─ 更新 AST 索引    ✓
  ├─ 更新全文索引     ✓
  └─ 更新依赖图       ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 7: 创建版本快照
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 创建版本 v2...

版本信息:
  • 版本ID: v2
  • 父版本: v1
  • 描述: 修改所有导航栏样式
  • 修改文件: 4个
  • 修改位置: 4处

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 8: 完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 修改完成！

总结:
  • 修改文件数: 4
  • 修改位置数: 4
  • 总耗时: 3.2秒
  • 当前版本: v2

[查看修改] [下载文件] [继续修改]
```

---

## ⚡ 性能优化策略

### 1. 增量索引

只为修改的文件重建索引，未修改的文件保留原索引：

```javascript
async function incrementalRebuild(modifiedFiles, versionId) {
  // 只重建修改的文件的索引
  for (const file of modifiedFiles) {
    // 删除旧索引
    await db.query(`
      DELETE FROM ast_nodes
      WHERE file_id IN (
        SELECT id FROM files
        WHERE version_id = $1 AND file_path = $2
      )
    `, [versionId, file.path]);

    // 重建新索引
    await indexBuilder.buildIndexForFile(file, versionId);
  }
}
```

### 2. 查询优化

使用索引加速查询：

```sql
-- 为常用查询创建复合索引
CREATE INDEX idx_nodes_file_tag ON ast_nodes(file_id, tag_name);
CREATE INDEX idx_nodes_semantic ON ast_nodes(semantic_id) WHERE semantic_id IS NOT NULL;
CREATE INDEX idx_files_version ON files(version_id, file_path);

-- 使用物化视图加速复杂查询
CREATE MATERIALIZED VIEW nav_elements AS
SELECT
  f.version_id,
  f.file_path,
  n.id,
  n.start_line,
  n.end_line,
  n.attributes
FROM ast_nodes n
JOIN files f ON n.file_id = f.id
WHERE n.tag_name = 'nav'
  OR n.semantic_id LIKE '%navigation%';

-- 定期刷新物化视图
REFRESH MATERIALIZED VIEW nav_elements;
```

### 3. 懒加载策略

```javascript
// 只在需要时才加载tree-sitter
let treeSitterLoaded = false;

async function ensureTreeSitter() {
  if (!treeSitterLoaded) {
    await loadTreeSitter();
    treeSitterLoaded = true;
  }
}

// 优先使用SQL查询，只在必要时才使用tree-sitter
async function smartLocate(description, versionId) {
  // 先尝试SQL（快速）
  const sqlResults = await locator.queryBySQL(description, versionId);

  if (sqlResults.length > 0 && sqlResults[0].confidence > 0.8) {
    return sqlResults; // SQL足够精确，无需tree-sitter
  }

  // SQL不够精确，加载tree-sitter
  await ensureTreeSitter();
  return await locator.queryByTreeSitter(description, versionId);
}
```

---

## 📊 方案对比：V1 vs V2

| 功能 | V1方案 | V2方案 | 改进 |
|------|--------|--------|------|
| **多文件定位** | 需要遍历所有文件 | SQL索引查询，毫秒级 | ⚡ 100x faster |
| **代码定位精度** | 依赖语义标记 | 三级定位策略 | ⭐ 更精确 |
| **批量修改** | 不支持 | 支持事务式批量修改 | ✅ 新增 |
| **AST查询** | 无 | Tree-sitter Query | ✅ 新增 |
| **存储** | localStorage/IndexedDB | PGlite数据库 | ⚡ 更强大 |
| **全文搜索** | 字符串匹配 | PostgreSQL全文索引 | ⚡ 更快 |
| **依赖分析** | 基础实现 | 基于数据库关系图 | ⭐ 更准确 |
| **版本管理** | 完整快照 | 增量存储 | 💾 省空间 |

---

## 🎯 实施路线图（V2）

### Phase 1: 基础设施（2-3周）
- [ ] 集成PGlite数据库
- [ ] 设计并创建数据库Schema
- [ ] 实现基础的索引构建
- [ ] 集成web-tree-sitter
- [ ] 实现HTML/CSS/JS的AST解析

### Phase 2: 代码定位（2周）
- [ ] 实现SQL查询定位
- [ ] 实现Tree-sitter Query定位
- [ ] 实现LLM辅助定位
- [ ] 实现三级定位策略协调器

### Phase 3: 批量修改（2周）
- [ ] 实现多文件代码修改引擎
- [ ] 实现事务式修改应用
- [ ] 实现冲突检测
- [ ] 实现增量索引重建

### Phase 4: UI与交互（2周）
- [ ] 实现影响分析面板
- [ ] 实现并排Diff预览
- [ ] 实现批量确认流程
- [ ] 实现版本对比视图

### Phase 5: 优化与测试（1-2周）
- [ ] 性能优化（查询、索引）
- [ ] 大文件处理优化
- [ ] 完整流程测试
- [ ] 文档编写

---

## 💡 关键优势

### 1. 精确定位
✅ 基于AST的精确定位，不会误匹配
✅ 支持复杂的模式查询（如"所有包含特定class的按钮"）

### 2. 高性能
✅ SQL索引查询，毫秒级响应
✅ 增量索引更新，只处理变化的文件

### 3. 可扩展
✅ 可以轻松添加新的语言支持（加载对应的tree-sitter WASM）
✅ 可以添加语义搜索（使用pgvector）

### 4. 可靠性
✅ 事务式修改，全部成功或全部回滚
✅ 完整的版本历史，可以随时回滚

---

## 🤔 与V1方案的关系

V2方案是V1方案的**增强版**，而非替代：

- **保留V1的优点**：语义标记系统、版本管理、依赖分析
- **增强V1的弱点**：多文件定位、批量修改、存储性能
- **新增强大能力**：AST查询、全文搜索、SQL查询

**实施建议：**
- 如果项目规模小（<5个HTML页面），V1方案已经足够
- 如果需要处理复杂的多文件编辑，推荐V2方案
- 可以先实施V1，后续平滑升级到V2（只需添加PGlite和tree-sitter）

---

## 📝 总结

V2方案通过引入：
1. **PGlite数据库** - 提供强大的查询和索引能力
2. **web-tree-sitter** - 提供精确的AST解析和查询
3. **多级定位策略** - 平衡速度和精度

成功解决了：
- ✅ 多文件多代码片段的精确定位
- ✅ 批量修改的事务性和一致性
- ✅ 大规模代码搜索的性能问题

是一个**生产级**的解决方案，适合构建真正实用的AI驱动网站生成工具。
