# 自然语言处理与多匹配支持方案

> 详细解答：V2方案如何处理自然语言输入和多处匹配场景

---

## 问题1：自然语言 → 搜索查询的转换

### 核心挑战

用户输入的是自然语言：
```
❌ 不是这样：SELECT * FROM ast_nodes WHERE tag_name='nav'
✅ 而是这样："把所有页面的导航栏背景色改成深蓝色"
```

需要将自然语言转换为：
- SQL查询语句
- Tree-sitter Query模式
- 关键词提取

---

## 解决方案：LLM驱动的查询生成器

### 架构设计

```
用户自然语言输入
    ↓
┌─────────────────────────────────────────┐
│  NLP处理引擎 (LLM-Powered)               │
├─────────────────────────────────────────┤
│  1. 意图理解                             │
│     • 操作类型 (修改/新增/删除)           │
│     • 目标元素 (导航栏/按钮/链接)         │
│     • 修改内容 (样式/文本/属性)           │
│                                         │
│  2. 实体提取                             │
│     • 标签名: nav, button, a            │
│     • CSS类: .main-nav, .btn-primary    │
│     • 语义标记: navigation, cta-button  │
│                                         │
│  3. 查询策略选择                         │
│     • 简单匹配 → SQL查询                │
│     • 复杂模式 → Tree-sitter Query      │
│     • 模糊描述 → 关键词 + LLM辅助       │
└─────────────────────────────────────────┘
    ↓
生成多种查询策略（并行执行）
    ↓
合并结果 + 去重 + 置信度排序
```

---

## 完整实现

### 1. 自然语言理解引擎

```javascript
class NaturalLanguageQueryEngine {
  constructor(llmClient, db) {
    this.llm = llmClient;
    this.db = db;
  }

  /**
   * 将自然语言转换为可执行的查询策略
   */
  async parseNaturalLanguage(userInput, versionId) {
    // Step 1: LLM理解用户意图
    const intent = await this.extractIntent(userInput);

    // Step 2: 生成多种查询策略
    const strategies = await this.generateQueryStrategies(intent, versionId);

    // Step 3: 并行执行所有策略
    const results = await this.executeStrategies(strategies);

    // Step 4: 合并、去重、排序
    const finalResults = this.mergeAndRank(results);

    return {
      intent,
      strategies,
      results: finalResults
    };
  }

  /**
   * 提取用户意图（使用LLM）
   */
  async extractIntent(userInput) {
    const prompt = `
你是一个代码编辑意图分析专家。分析用户的自然语言需求，提取关键信息。

用户输入: "${userInput}"

请输出JSON格式（严格遵守格式）:
\`\`\`json
{
  "operation": "edit|add|delete|find",
  "target": {
    "description": "用户想要操作的目标元素的描述",
    "keywords": ["关键词1", "关键词2"],
    "possible_tags": ["可能的HTML标签"],
    "possible_classes": ["可能的CSS类名"],
    "possible_ids": ["可能的ID"],
    "semantic_roles": ["可能的语义角色"]
  },
  "modification": {
    "type": "style|content|attribute|structure",
    "description": "具体要做什么修改",
    "properties": {
      "property1": "value1"
    }
  },
  "scope": "single|multiple|all",
  "confidence": 0.0-1.0
}
\`\`\`

示例1：
输入: "把所有页面的导航栏背景色改成深蓝色"
输出:
\`\`\`json
{
  "operation": "edit",
  "target": {
    "description": "导航栏",
    "keywords": ["导航", "导航栏", "nav", "navigation"],
    "possible_tags": ["nav", "header"],
    "possible_classes": ["nav", "navigation", "navbar", "main-nav"],
    "possible_ids": ["nav", "main-nav", "navigation"],
    "semantic_roles": ["navigation", "main-navigation"]
  },
  "modification": {
    "type": "style",
    "description": "修改背景色为深蓝色",
    "properties": {
      "background": "#001f3f",
      "background-color": "#001f3f"
    }
  },
  "scope": "all",
  "confidence": 0.95
}
\`\`\`

示例2：
输入: "找到所有包含'联系我们'文字的按钮"
输出:
\`\`\`json
{
  "operation": "find",
  "target": {
    "description": "包含'联系我们'文字的按钮",
    "keywords": ["按钮", "联系我们", "button"],
    "possible_tags": ["button", "a"],
    "possible_classes": ["btn", "button"],
    "possible_ids": [],
    "semantic_roles": ["button", "cta-button"]
  },
  "modification": null,
  "scope": "multiple",
  "confidence": 0.9
}
\`\`\`

现在请分析用户的输入。
`;

    const response = await this.llm.chat(prompt, {
      temperature: 0.1, // 低温度，更确定性的输出
      response_format: { type: "json_object" }
    });

    // 解析并验证
    let intent;
    try {
      intent = JSON.parse(response);
    } catch (e) {
      // 尝试修复JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        intent = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('无法解析LLM输出的JSON');
      }
    }

    return intent;
  }

  /**
   * 基于意图生成多种查询策略
   */
  async generateQueryStrategies(intent, versionId) {
    const strategies = [];

    // 策略1: SQL标签名查询
    if (intent.target.possible_tags.length > 0) {
      strategies.push({
        type: 'sql_tag',
        priority: 1,
        query: this.buildSQLTagQuery(intent.target.possible_tags, versionId),
        confidence: 0.8
      });
    }

    // 策略2: SQL类名查询
    if (intent.target.possible_classes.length > 0) {
      strategies.push({
        type: 'sql_class',
        priority: 2,
        query: this.buildSQLClassQuery(intent.target.possible_classes, versionId),
        confidence: 0.7
      });
    }

    // 策略3: SQL语义标记查询
    if (intent.target.semantic_roles.length > 0) {
      strategies.push({
        type: 'sql_semantic',
        priority: 1,
        query: this.buildSQLSemanticQuery(intent.target.semantic_roles, versionId),
        confidence: 0.9
      });
    }

    // 策略4: 全文搜索
    if (intent.target.keywords.length > 0) {
      strategies.push({
        type: 'fulltext',
        priority: 3,
        query: this.buildFullTextQuery(intent.target.keywords, versionId),
        confidence: 0.6
      });
    }

    // 策略5: Tree-sitter Query（针对复杂模式）
    if (this.needsTreeSitterQuery(intent)) {
      const tsQuery = await this.generateTreeSitterQuery(intent);
      strategies.push({
        type: 'tree_sitter',
        priority: 1,
        query: tsQuery,
        confidence: 0.85
      });
    }

    return strategies;
  }

  /**
   * 构建SQL标签查询
   */
  buildSQLTagQuery(tags, versionId) {
    return {
      sql: `
        SELECT
          f.file_path,
          n.id as node_id,
          n.tag_name,
          n.start_line,
          n.end_line,
          n.attributes,
          n.semantic_id,
          n.text_content
        FROM ast_nodes n
        JOIN files f ON n.file_id = f.id
        WHERE f.version_id = $1
          AND n.tag_name = ANY($2)
        ORDER BY f.file_path, n.start_line
      `,
      params: [versionId, tags]
    };
  }

  /**
   * 构建SQL类名查询
   */
  buildSQLClassQuery(classes, versionId) {
    // 使用JSONB查询匹配class属性
    const classPatterns = classes.map(c => `%${c}%`);

    return {
      sql: `
        SELECT
          f.file_path,
          n.id as node_id,
          n.tag_name,
          n.start_line,
          n.end_line,
          n.attributes,
          n.semantic_id
        FROM ast_nodes n
        JOIN files f ON n.file_id = f.id
        WHERE f.version_id = $1
          AND (
            n.attributes->>'class' LIKE ANY($2)
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(
                CASE
                  WHEN jsonb_typeof(n.attributes->'class') = 'array'
                  THEN n.attributes->'class'
                  ELSE jsonb_build_array(n.attributes->'class')
                END
              ) AS class_value
              WHERE class_value LIKE ANY($2)
            )
          )
        ORDER BY f.file_path, n.start_line
      `,
      params: [versionId, classPatterns]
    };
  }

  /**
   * 构建SQL语义标记查询
   */
  buildSQLSemanticQuery(semanticRoles, versionId) {
    return {
      sql: `
        SELECT
          f.file_path,
          n.id as node_id,
          n.tag_name,
          n.start_line,
          n.end_line,
          n.attributes,
          sm.semantic_id,
          sm.semantic_type,
          sm.semantic_role
        FROM semantic_markers sm
        JOIN ast_nodes n ON sm.node_id = n.id
        JOIN files f ON n.file_id = f.id
        WHERE f.version_id = $1
          AND (
            sm.semantic_type = ANY($2)
            OR sm.semantic_role = ANY($2)
            OR sm.semantic_id LIKE ANY($3)
          )
        ORDER BY f.file_path, n.start_line
      `,
      params: [
        versionId,
        semanticRoles,
        semanticRoles.map(r => `%${r}%`)
      ]
    };
  }

  /**
   * 构建全文搜索查询
   */
  buildFullTextQuery(keywords, versionId) {
    const tsQuery = keywords.join(' | '); // OR搜索

    return {
      sql: `
        SELECT
          f.file_path,
          cs.snippet_type,
          cs.content,
          cs.start_line,
          cs.end_line,
          ts_rank(
            to_tsvector('simple', cs.content),
            to_tsquery('simple', $2)
          ) as rank
        FROM code_snippets cs
        JOIN files f ON cs.file_id = f.id
        WHERE f.version_id = $1
          AND to_tsvector('simple', cs.content) @@ to_tsquery('simple', $2)
        ORDER BY rank DESC, f.file_path, cs.start_line
        LIMIT 50
      `,
      params: [versionId, tsQuery]
    };
  }

  /**
   * 判断是否需要Tree-sitter Query
   */
  needsTreeSitterQuery(intent) {
    // 以下情况使用Tree-sitter:
    // 1. 需要匹配特定的代码结构
    // 2. 需要基于内容过滤（如"包含特定文字的按钮"）
    // 3. 需要父子关系匹配

    return (
      intent.target.description.includes('包含') ||
      intent.target.description.includes('里面的') ||
      intent.target.description.includes('中的') ||
      intent.operation === 'find'
    );
  }

  /**
   * 生成Tree-sitter Query（使用LLM）
   */
  async generateTreeSitterQuery(intent) {
    const prompt = `
你是一个Tree-sitter Query专家。基于用户意图生成Tree-sitter查询模式。

用户意图:
${JSON.stringify(intent, null, 2)}

Tree-sitter Query语法参考：
- 匹配标签: (element (start_tag (tag_name) @tag (#eq? @tag "nav")))
- 匹配属性: (attribute (attribute_name) @name (#eq? @name "class"))
- 匹配文本: (text) @content (#match? @content "联系我们")
- 父子关系: (element (start_tag (tag_name) @parent) (element))

请生成Tree-sitter Query模式，只输出查询字符串，不要其他说明。

示例：
输入意图: 找到所有包含"联系我们"文字的按钮
输出:
\`\`\`
(element
  (start_tag
    (tag_name) @tag
    (#match? @tag "^(button|a)$"))
  (text) @content
  (#match? @content "联系我们"))
\`\`\`

现在请生成查询模式。
`;

    const response = await this.llm.chat(prompt, {
      temperature: 0.1
    });

    // 提取代码块
    const match = response.match(/```\n?([\s\S]*?)\n?```/);
    return match ? match[1].trim() : response.trim();
  }

  /**
   * 执行所有查询策略
   */
  async executeStrategies(strategies) {
    const results = await Promise.all(
      strategies.map(async (strategy) => {
        try {
          let matches = [];

          switch (strategy.type) {
            case 'sql_tag':
            case 'sql_class':
            case 'sql_semantic':
            case 'fulltext':
              const sqlResult = await this.db.query(
                strategy.query.sql,
                strategy.query.params
              );
              matches = sqlResult.rows.map(row => ({
                ...row,
                source: strategy.type,
                confidence: strategy.confidence
              }));
              break;

            case 'tree_sitter':
              matches = await this.executeTreeSitterQuery(
                strategy.query,
                strategy.confidence
              );
              break;
          }

          return {
            strategy: strategy.type,
            matches,
            count: matches.length
          };
        } catch (error) {
          console.error(`策略 ${strategy.type} 执行失败:`, error);
          return {
            strategy: strategy.type,
            matches: [],
            count: 0,
            error: error.message
          };
        }
      })
    );

    return results;
  }

  /**
   * 执行Tree-sitter Query
   */
  async executeTreeSitterQuery(queryString, baseConfidence) {
    // 获取所有文件
    const filesResult = await this.db.query(`
      SELECT id, file_path, content
      FROM files
      WHERE version_id = $1
    `, [this.currentVersionId]);

    const matches = [];

    for (const file of filesResult.rows) {
      try {
        // 解析HTML
        const Parser = await this.getTreeSitterParser('html');
        const tree = Parser.parse(file.content);

        // 执行查询
        const query = Parser.language.query(queryString);
        const queryMatches = query.matches(tree.rootNode);

        for (const match of queryMatches) {
          matches.push({
            file_path: file.file_path,
            start_line: match.captures[0].node.startPosition.row + 1,
            end_line: match.captures[0].node.endPosition.row + 1,
            tag_name: match.captures.find(c => c.name === 'tag')?.node.text,
            content: match.captures[0].node.text,
            source: 'tree_sitter',
            confidence: baseConfidence
          });
        }
      } catch (error) {
        console.error(`Tree-sitter查询文件 ${file.file_path} 失败:`, error);
      }
    }

    return matches;
  }

  /**
   * 合并、去重、排序结果
   */
  mergeAndRank(strategyResults) {
    // 收集所有匹配
    const allMatches = [];
    for (const result of strategyResults) {
      allMatches.push(...result.matches);
    }

    // 去重（基于file_path + start_line + end_line）
    const uniqueMatches = new Map();

    for (const match of allMatches) {
      const key = `${match.file_path}:${match.start_line}:${match.end_line}`;

      if (!uniqueMatches.has(key)) {
        uniqueMatches.set(key, match);
      } else {
        // 如果已存在，取置信度更高的
        const existing = uniqueMatches.get(key);
        if (match.confidence > existing.confidence) {
          uniqueMatches.set(key, match);
        }
      }
    }

    // 转为数组并排序
    const results = Array.from(uniqueMatches.values());
    results.sort((a, b) => {
      // 先按置信度降序
      if (Math.abs(a.confidence - b.confidence) > 0.01) {
        return b.confidence - a.confidence;
      }
      // 再按文件路径
      if (a.file_path !== b.file_path) {
        return a.file_path.localeCompare(b.file_path);
      }
      // 最后按行号
      return a.start_line - b.start_line;
    });

    return results;
  }
}
```

---

## 问题2：多处匹配的支持

### 场景分析

当搜索返回多个匹配时，有以下几种处理策略：

| 用户意图 | 匹配数量 | 处理策略 |
|---------|---------|---------|
| "修改**所有**导航栏" | 4个 | ✅ 全部修改（批量） |
| "修改**首页的**按钮" | 1个 | ✅ 直接修改 |
| "修改按钮" | 10个 | ⚠️ 让用户选择 |
| "找到联系我们按钮" | 2个 | ⚠️ 让用户确认 |

---

## 完整实现：多匹配处理器

```javascript
class MultiMatchHandler {
  constructor(llmClient) {
    this.llm = llmClient;
  }

  /**
   * 处理多处匹配
   */
  async handleMultipleMatches(matches, intent, userInput) {
    // Step 1: 分析用户意图中的范围
    const scope = this.analyzeScope(intent, userInput);

    // Step 2: 根据范围决定处理策略
    let strategy;

    if (scope.type === 'all') {
      // 用户明确说"所有"，直接批量处理
      strategy = {
        type: 'batch_all',
        matches: matches,
        needsConfirmation: matches.length > 5 // 超过5个需要确认
      };
    } else if (scope.type === 'specific' && matches.length === 1) {
      // 只有一个匹配，直接处理
      strategy = {
        type: 'single',
        matches: matches,
        needsConfirmation: false
      };
    } else if (scope.type === 'specific' && matches.length > 1) {
      // 多个匹配，需要消歧
      strategy = await this.disambiguate(matches, intent, userInput);
    } else {
      // 默认：让用户选择
      strategy = {
        type: 'user_select',
        matches: matches,
        needsConfirmation: true
      };
    }

    return strategy;
  }

  /**
   * 分析用户意图中的范围
   */
  analyzeScope(intent, userInput) {
    // 检查用户是否明确说了"所有"
    const allKeywords = ['所有', '全部', 'all', 'every', '每个'];
    const hasAllKeyword = allKeywords.some(kw =>
      userInput.toLowerCase().includes(kw.toLowerCase())
    );

    // 检查用户是否指定了特定位置
    const specificKeywords = ['首页', '主页', 'index', '第一个', 'first'];
    const hasSpecificKeyword = specificKeywords.some(kw =>
      userInput.toLowerCase().includes(kw.toLowerCase())
    );

    if (hasAllKeyword) {
      return { type: 'all', confidence: 0.9 };
    } else if (hasSpecificKeyword) {
      return { type: 'specific', confidence: 0.8 };
    } else {
      return { type: 'ambiguous', confidence: 0.5 };
    }
  }

  /**
   * 消歧：从多个匹配中确定用户真正想要的
   */
  async disambiguate(matches, intent, userInput) {
    // 使用LLM分析用户意图，从匹配中选择最相关的

    const prompt = `
你是一个代码匹配消歧专家。用户的需求可能匹配到多处代码，你需要判断用户真正想要修改的是哪些。

用户输入: "${userInput}"

找到的匹配:
${matches.map((m, i) => `
[匹配${i + 1}]
文件: ${m.file_path}
位置: 第${m.start_line}-${m.end_line}行
标签: ${m.tag_name || 'unknown'}
类名: ${m.attributes?.class || 'none'}
内容预览: ${m.text_content?.substring(0, 100) || 'N/A'}
`).join('\n')}

请分析用户最可能想要修改哪些匹配。输出JSON:
\`\`\`json
{
  "analysis": "分析过程",
  "selected_indices": [1, 3],  // 从1开始的索引
  "confidence": 0.85,
  "reasoning": "选择理由",
  "suggest_user_confirmation": true  // 是否建议让用户确认
}
\`\`\`
`;

    const response = await this.llm.chat(prompt, {
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response);

    // 根据LLM的建议构建策略
    const selectedMatches = result.selected_indices.map(i => matches[i - 1]);

    return {
      type: result.suggest_user_confirmation ? 'user_confirm' : 'auto_select',
      matches: selectedMatches,
      allMatches: matches,
      reasoning: result.reasoning,
      confidence: result.confidence,
      needsConfirmation: result.suggest_user_confirmation
    };
  }

  /**
   * 生成用户确认界面数据
   */
  generateConfirmationUI(strategy, intent) {
    if (strategy.type === 'batch_all') {
      return {
        title: '批量修改确认',
        message: `将修改 ${strategy.matches.length} 个位置`,
        matches: strategy.matches.map(m => ({
          file: m.file_path,
          location: `${m.start_line}-${m.end_line}行`,
          preview: this.generatePreview(m),
          selected: true // 默认全选
        })),
        actions: [
          { type: 'apply_all', label: '全部应用' },
          { type: 'select', label: '让我选择' },
          { type: 'cancel', label: '取消' }
        ]
      };
    } else if (strategy.type === 'user_confirm') {
      return {
        title: '请确认要修改的位置',
        message: `找到 ${strategy.allMatches.length} 个匹配，建议修改以下 ${strategy.matches.length} 个：`,
        reasoning: strategy.reasoning,
        matches: strategy.allMatches.map(m => ({
          file: m.file_path,
          location: `${m.start_line}-${m.end_line}行`,
          preview: this.generatePreview(m),
          selected: strategy.matches.includes(m), // 根据LLM建议预选
          confidence: m.confidence
        })),
        actions: [
          { type: 'apply_selected', label: '应用已选择的' },
          { type: 'apply_all', label: '全部应用' },
          { type: 'cancel', label: '取消' }
        ]
      };
    } else if (strategy.type === 'user_select') {
      return {
        title: '选择要修改的位置',
        message: `找到 ${strategy.matches.length} 个匹配：`,
        matches: strategy.matches.map(m => ({
          file: m.file_path,
          location: `${m.start_line}-${m.end_line}行`,
          preview: this.generatePreview(m),
          selected: false, // 默认不选
          confidence: m.confidence
        })),
        actions: [
          { type: 'apply_selected', label: '应用已选择的' },
          { type: 'cancel', label: '取消' }
        ]
      };
    }
  }

  generatePreview(match) {
    // 生成代码预览
    return {
      code: match.content || match.text_content,
      language: 'html',
      highlights: [
        { line: match.start_line, type: 'target' }
      ]
    };
  }
}
```

---

## 完整流程示例

### 示例1：明确的"所有"操作

```javascript
// 用户输入
const userInput = "把所有页面的导航栏背景色改成深蓝色";

// ====== Step 1: 解析自然语言 ======
const nlpEngine = new NaturalLanguageQueryEngine(llmClient, db);
const parseResult = await nlpEngine.parseNaturalLanguage(userInput, 'v1');

console.log('意图分析:', parseResult.intent);
/*
{
  operation: "edit",
  target: {
    description: "导航栏",
    keywords: ["导航", "导航栏", "nav"],
    possible_tags: ["nav"],
    possible_classes: ["nav", "navigation", "navbar"],
    semantic_roles: ["navigation", "main-navigation"]
  },
  modification: {
    type: "style",
    properties: { background: "#001f3f" }
  },
  scope: "all",
  confidence: 0.95
}
*/

console.log('查询策略:', parseResult.strategies);
/*
[
  { type: 'sql_tag', query: "SELECT ... WHERE tag_name='nav'" },
  { type: 'sql_semantic', query: "SELECT ... WHERE semantic_id LIKE '%navigation%'" },
  { type: 'sql_class', query: "SELECT ... WHERE class LIKE '%nav%'" }
]
*/

console.log('匹配结果:', parseResult.results);
/*
[
  { file_path: 'index.html', start_line: 12, end_line: 18, confidence: 0.95 },
  { file_path: 'about.html', start_line: 12, end_line: 18, confidence: 0.95 },
  { file_path: 'contact.html', start_line: 12, end_line: 18, confidence: 0.95 },
  { file_path: 'blog.html', start_line: 12, end_line: 18, confidence: 0.95 }
]
*/

// ====== Step 2: 处理多匹配 ======
const multiMatchHandler = new MultiMatchHandler(llmClient);
const strategy = await multiMatchHandler.handleMultipleMatches(
  parseResult.results,
  parseResult.intent,
  userInput
);

console.log('处理策略:', strategy);
/*
{
  type: 'batch_all',
  matches: [4个匹配],
  needsConfirmation: false  // 用户说了"所有"，不需要确认
}
*/

// ====== Step 3: 执行修改 ======
if (!strategy.needsConfirmation) {
  // 直接批量修改
  const result = await batchModifier.batchModify(
    strategy.matches,
    parseResult.intent.modification.description,
    'v1'
  );

  console.log('修改完成:', result);
  /*
  {
    filesModified: 4,
    locationsModified: 4,
    newVersionId: 'v2'
  }
  */
}
```

---

### 示例2：模糊匹配，需要用户确认

```javascript
// 用户输入（没有明确说"所有"）
const userInput = "把按钮改成红色";

// ====== Step 1: 解析自然语言 ======
const parseResult = await nlpEngine.parseNaturalLanguage(userInput, 'v1');

console.log('匹配结果:', parseResult.results);
/*
找到10个按钮:
[
  { file_path: 'index.html', start_line: 25, tag_name: 'button', class: 'btn-primary' },
  { file_path: 'index.html', start_line: 45, tag_name: 'button', class: 'btn-secondary' },
  { file_path: 'about.html', start_line: 30, tag_name: 'a', class: 'btn' },
  ...
]
*/

// ====== Step 2: 消歧 ======
const strategy = await multiMatchHandler.handleMultipleMatches(
  parseResult.results,
  parseResult.intent,
  userInput
);

console.log('处理策略:', strategy);
/*
{
  type: 'user_confirm',
  matches: [建议修改其中3个],
  allMatches: [全部10个],
  reasoning: "用户可能想修改主要的CTA按钮，而不是所有按钮",
  confidence: 0.75,
  needsConfirmation: true
}
*/

// ====== Step 3: 显示确认界面 ======
const uiData = multiMatchHandler.generateConfirmationUI(strategy, parseResult.intent);

// 渲染UI（伪代码）
showConfirmationDialog({
  title: uiData.title,
  message: uiData.message,
  reasoning: uiData.reasoning,
  matches: uiData.matches.map(m => ({
    label: `${m.file} (${m.location})`,
    preview: m.preview,
    checked: m.selected  // 根据LLM建议预选
  })),
  onConfirm: async (selectedMatches) => {
    // 用户确认后执行修改
    await batchModifier.batchModify(selectedMatches, ...);
  }
});
```

---

### 示例3：包含文本内容的复杂查询

```javascript
// 用户输入
const userInput = "找到所有包含'联系我们'文字的按钮，把它们改成绿色";

// ====== Step 1: 解析 - 会使用Tree-sitter Query ======
const parseResult = await nlpEngine.parseNaturalLanguage(userInput, 'v1');

console.log('查询策略:', parseResult.strategies);
/*
[
  {
    type: 'tree_sitter',
    query: `
      (element
        (start_tag
          (tag_name) @tag
          (#match? @tag "^(button|a)$"))
        (text) @content
        (#match? @content "联系我们"))
    `
  },
  { type: 'fulltext', query: "联系我们 & button" }
]
*/

console.log('匹配结果:', parseResult.results);
/*
[
  {
    file_path: 'index.html',
    start_line: 45,
    tag_name: 'button',
    text_content: '联系我们',
    confidence: 0.9,
    source: 'tree_sitter'
  },
  {
    file_path: 'about.html',
    start_line: 50,
    tag_name: 'a',
    text_content: '联系我们',
    confidence: 0.9,
    source: 'tree_sitter'
  }
]
*/

// ====== Step 2: 处理（2个匹配，需要确认） ======
const strategy = await multiMatchHandler.handleMultipleMatches(...);

// 用户确认后执行修改
```

---

## UI界面设计

### 多匹配确认弹窗

```
┌──────────────────────────────────────────────────────┐
│ 📋 请确认要修改的位置                                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│ 找到 10 个匹配，建议修改以下 3 个：                     │
│                                                       │
│ 💡 LLM分析: 用户可能想修改主要的CTA按钮               │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ ✅ index.html (第25行)                           │  │
│ │    <button class="btn-primary">立即购买</button> │  │
│ │    置信度: 95%                                   │  │
│ │    [预览] [查看代码]                              │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ ✅ about.html (第30行)                           │  │
│ │    <button class="btn-primary">联系我们</button> │  │
│ │    置信度: 92%                                   │  │
│ │    [预览] [查看代码]                              │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ ☐ index.html (第45行)                           │  │
│ │    <button class="btn-secondary">了解更多</button>│ │
│ │    置信度: 65%                                   │  │
│ │    [预览] [查看代码]                              │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ [显示全部10个匹配]                                    │
│                                                       │
│ [应用已选择的 3 个] [全部应用] [取消]                   │
└──────────────────────────────────────────────────────┘
```

---

## 性能优化

### 1. 缓存LLM结果

```javascript
class NLPCache {
  constructor() {
    this.cache = new Map();
  }

  getCacheKey(userInput) {
    // 简化输入作为key（去除空格、统一大小写）
    return userInput.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  async get(userInput) {
    const key = this.getCacheKey(userInput);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      // 5分钟内的缓存有效
      return cached.result;
    }

    return null;
  }

  set(userInput, result) {
    const key = this.getCacheKey(userInput);
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
}
```

### 2. 并行执行查询

```javascript
async executeStrategies(strategies) {
  // 所有策略并行执行
  const results = await Promise.all(
    strategies.map(s => this.executeStrategy(s))
  );

  // 一旦有高置信度结果，可以提前返回
  const highConfidenceResults = results.filter(r =>
    r.matches.length > 0 && r.matches[0].confidence > 0.9
  );

  if (highConfidenceResults.length > 0) {
    return highConfidenceResults;
  }

  return results;
}
```

---

## 总结

### V2方案完全支持你提出的两个场景：

#### ✅ 场景1：自然语言转搜索查询

**方案：**
1. 使用LLM提取意图和关键信息
2. 生成多种查询策略（SQL、Tree-sitter、全文搜索）
3. 并行执行，合并结果
4. 自动去重和排序

**优势：**
- 用户可以用自然语言描述需求
- 系统自动转换为精确的查询
- 多策略并行，速度快且准确

---

#### ✅ 场景2：多处匹配支持

**方案：**
1. 分析用户意图范围（所有/特定/模糊）
2. 智能消歧（使用LLM）
3. 生成确认界面
4. 支持批量修改

**优势：**
- 明确的"所有"操作 → 自动批量处理
- 模糊的操作 → LLM辅助消歧 + 用户确认
- 灵活的确认机制（预选、全选、手动选择）

---

**V2方案不仅支持这两个场景，而且实现得非常优雅和智能！** 🚀
