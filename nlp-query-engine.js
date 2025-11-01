// ============================================================================
// Prompty V2 - Natural Language Query Engine
// 自然语言查询引擎
// ============================================================================

// ============================================================================
// 1. NLP Query Engine - 自然语言查询引擎
// ============================================================================

class NaturalLanguageQueryEngine {
  constructor(db, llmClient, tsQueryExecutor = null, intentTranslator = null, llmIntentExtractor = null) {
    this.db = db;
    this.llm = llmClient;
    this.tsQuery = tsQueryExecutor; // Tree-sitter Query 执行器
    this.translator = intentTranslator; // 意图到查询转换器
    this.llmIntentExtractor = llmIntentExtractor; // LLM 意图提取器
    this.cache = new Map();
  }

  /**
   * 解析自然语言并执行查询
   */
  async parseAndQuery(userInput, versionId) {
    console.log(`[NLP] 解析用户输入: "${userInput}"`);

    // Step 1: 提取意图
    const intent = await this.extractIntent(userInput);
    console.log(`[NLP] 意图识别结果:`, intent);

    // Step 2: 生成查询策略
    const strategies = this.generateQueryStrategies(intent, versionId);
    console.log(`[NLP] 生成了 ${strategies.length} 个查询策略`);

    // Step 3: 执行所有策略
    const results = await this.executeStrategies(strategies);

    // Step 4: 合并和排序
    const finalResults = this.mergeAndRank(results);
    console.log(`[NLP] 最终找到 ${finalResults.length} 个匹配`);

    return {
      intent,
      strategies,
      results: finalResults
    };
  }

  /**
   * 提取用户意图（使用规则或LLM）
   */
  async extractIntent(userInput) {
    // 先尝试使用规则匹配（快速）
    const rulesIntent = this.extractIntentByRules(userInput);

    if (rulesIntent.confidence > 0.7) {
      return rulesIntent;
    }

    // 规则匹配不够精确，使用LLM
    if (this.llm) {
      return await this.extractIntentByLLM(userInput);
    }

    // 没有LLM，返回规则结果
    return rulesIntent;
  }

  /**
   * 基于规则的意图提取
   */
  extractIntentByRules(userInput) {
    const input = userInput.toLowerCase();

    const intent = {
      operation: 'find', // find, edit, add, delete
      target: {
        description: '',
        keywords: [],
        possible_tags: [],
        possible_classes: [],
        possible_ids: [],
        semantic_roles: []
      },
      modification: null,
      scope: 'multiple', // single, multiple, all
      confidence: 0.5
    };

    // 识别操作类型
    if (input.includes('修改') || input.includes('改成') || input.includes('change')) {
      intent.operation = 'edit';
    } else if (input.includes('新增') || input.includes('添加') || input.includes('add')) {
      intent.operation = 'add';
    } else if (input.includes('删除') || input.includes('移除') || input.includes('delete')) {
      intent.operation = 'delete';
    } else if (input.includes('找') || input.includes('查找') || input.includes('find')) {
      intent.operation = 'find';
    }

    // 识别范围
    if (input.includes('所有') || input.includes('全部') || input.includes('all') || input.includes('every')) {
      intent.scope = 'all';
      intent.confidence += 0.2;
    } else if (input.includes('首页') || input.includes('主页') || input.includes('index') || input.includes('第一个')) {
      intent.scope = 'single';
      intent.confidence += 0.1;
    }

    // 识别目标元素
    const elementMap = {
      '导航': { tags: ['nav'], classes: ['nav', 'navigation', 'navbar'], roles: ['navigation'] },
      '按钮': { tags: ['button', 'a'], classes: ['btn', 'button'], roles: ['button', 'cta'] },
      '标题': { tags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], classes: ['title', 'heading'], roles: ['heading'] },
      '链接': { tags: ['a'], classes: ['link'], roles: ['link'] },
      '图片': { tags: ['img'], classes: [], roles: [] },
      '表单': { tags: ['form'], classes: ['form'], roles: [] },
      '输入框': { tags: ['input', 'textarea'], classes: ['input'], roles: ['form-input'] }
    };

    for (const [keyword, config] of Object.entries(elementMap)) {
      if (input.includes(keyword)) {
        intent.target.description = keyword;
        intent.target.keywords.push(keyword);
        intent.target.possible_tags.push(...config.tags);
        intent.target.possible_classes.push(...config.classes);
        intent.target.semantic_roles.push(...config.roles);
        intent.confidence += 0.3;
        break;
      }
    }

    // 识别修改内容
    if (intent.operation === 'edit') {
      intent.modification = {
        type: 'style',
        description: '',
        properties: {}
      };

      // 颜色相关
      const colorMap = {
        '红色': '#ff0000',
        '蓝色': '#0000ff',
        '绿色': '#00ff00',
        '黄色': '#ffff00',
        '黑色': '#000000',
        '白色': '#ffffff',
        '深蓝': '#001f3f',
        '浅蓝': '#7fdbff'
      };

      for (const [colorName, colorValue] of Object.entries(colorMap)) {
        if (input.includes(colorName)) {
          if (input.includes('背景')) {
            intent.modification.properties.background = colorValue;
            intent.modification.description = `背景色改成${colorName}`;
          } else if (input.includes('字体') || input.includes('文字')) {
            intent.modification.properties.color = colorValue;
            intent.modification.description = `字体颜色改成${colorName}`;
          }
          intent.confidence += 0.2;
        }
      }
    }

    return intent;
  }

  /**
   * 基于LLM的意图提取
   */
  async extractIntentByLLM(userInput) {
    // 检查缓存
    const cacheKey = `intent:${userInput}`;
    if (this.cache.has(cacheKey)) {
      console.log('[NLP] 使用缓存的意图结果');
      return this.cache.get(cacheKey);
    }

    try {
      // 使用新的 LLM 意图提取器
      if (this.llmIntentExtractor) {
        const intent = await this.llmIntentExtractor.extractIntent(userInput);

        // 缓存结果
        this.cache.set(cacheKey, intent);

        return intent;
      }

      // 降级到旧的实现
      const prompt = `
你是一个代码编辑意图分析专家。分析用户的自然语言需求，提取关键信息。

用户输入: "${userInput}"

请输出JSON格式:
{
  "operation": "edit|add|delete|find",
  "target": {
    "description": "用户想要操作的目标元素",
    "keywords": ["关键词"],
    "possible_tags": ["HTML标签"],
    "possible_classes": ["CSS类名"],
    "possible_ids": ["ID"],
    "semantic_roles": ["语义角色"]
  },
  "modification": {
    "type": "style|content|attribute|structure",
    "description": "具体修改",
    "properties": {}
  },
  "scope": "single|multiple|all",
  "confidence": 0.95
}
`;

      const response = await this.llm.chat(prompt);
      const intent = JSON.parse(response);

      // 缓存结果
      this.cache.set(cacheKey, intent);

      return intent;
    } catch (error) {
      console.error('[NLP] LLM意图提取失败:', error);
      // Fallback到规则
      return this.extractIntentByRules(userInput);
    }
  }

  /**
   * 生成查询策略
   */
  generateQueryStrategies(intent, versionId) {
    const strategies = [];

    // === SQL 查询策略 ===

    // 策略1: SQL标签查询
    if (intent.target.possible_tags.length > 0) {
      strategies.push({
        type: 'sql_tag',
        priority: 1,
        sql: `
          SELECT
            f.file_path,
            n.id as node_id,
            n.tag_name,
            n.start_line,
            n.end_line,
            n.attributes,
            n.text_content
          FROM ast_nodes n
          JOIN files f ON n.file_id = f.id
          WHERE f.version_id = $1
            AND n.tag_name = ANY($2)
          ORDER BY f.file_path, n.start_line
        `,
        params: [versionId, intent.target.possible_tags],
        confidence: 0.8
      });
    }

    // 策略2: SQL类名查询
    if (intent.target.possible_classes.length > 0) {
      const classPatterns = intent.target.possible_classes.map(c => `%${c}%`);

      strategies.push({
        type: 'sql_class',
        priority: 2,
        sql: `
          SELECT
            f.file_path,
            n.id as node_id,
            n.tag_name,
            n.start_line,
            n.end_line,
            n.attributes,
            n.text_content
          FROM ast_nodes n
          JOIN files f ON n.file_id = f.id
          WHERE f.version_id = $1
            AND n.attributes->>'class' LIKE ANY($2)
          ORDER BY f.file_path, n.start_line
        `,
        params: [versionId, classPatterns],
        confidence: 0.7
      });
    }

    // 策略3: SQL语义标记查询
    if (intent.target.semantic_roles.length > 0) {
      strategies.push({
        type: 'sql_semantic',
        priority: 1,
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
            )
          ORDER BY f.file_path, n.start_line
        `,
        params: [versionId, intent.target.semantic_roles],
        confidence: 0.9
      });
    }

    // 策略4: 全文搜索
    if (intent.target.keywords.length > 0) {
      const tsQuery = intent.target.keywords.join(' | ');

      strategies.push({
        type: 'fulltext',
        priority: 3,
        sql: `
          SELECT
            f.file_path,
            cs.snippet_type,
            cs.content,
            cs.start_line,
            cs.end_line
          FROM code_snippets cs
          JOIN files f ON cs.file_id = f.id
          WHERE f.version_id = $1
            AND to_tsvector('simple', cs.content) @@ to_tsquery('simple', $2)
          ORDER BY f.file_path, cs.start_line
          LIMIT 50
        `,
        params: [versionId, tsQuery],
        confidence: 0.6
      });
    }

    // === Tree-sitter Query 策略 ===
    // 如果有 Tree-sitter Query 执行器，生成 Tree-sitter 查询
    if (this.tsQuery && this.translator) {
      try {
        const tsQueries = this.translator.translateIntent(intent);

        for (const tsQuery of tsQueries) {
          strategies.push({
            type: 'tree-sitter',
            priority: 1, // Tree-sitter 查询优先级较高
            language: tsQuery.language,
            query: tsQuery.query,
            params: [versionId],
            confidence: tsQuery.confidence,
            description: tsQuery.description
          });
        }

        console.log(`[NLP] 生成了 ${tsQueries.length} 个 Tree-sitter 查询策略`);
      } catch (error) {
        console.warn('[NLP] Tree-sitter 查询生成失败:', error);
      }
    }

    return strategies;
  }

  /**
   * 执行所有查询策略
   */
  async executeStrategies(strategies) {
    const results = [];

    for (const strategy of strategies) {
      try {
        console.log(`[NLP] 执行策略: ${strategy.type}`);

        let matches = [];

        // SQL 查询策略
        if (strategy.type.startsWith('sql_') || strategy.type === 'fulltext') {
          const result = await this.db.query(strategy.sql, strategy.params);

          matches = result.rows.map(row => ({
            ...row,
            source: strategy.type,
            confidence: strategy.confidence
          }));
        }
        // Tree-sitter 查询策略
        else if (strategy.type === 'tree-sitter') {
          const versionId = strategy.params[0];
          const tsResults = await this.tsQuery.executeQueryOnVersion(
            versionId,
            strategy.query,
            strategy.language
          );

          // 转换 Tree-sitter 结果为统一格式
          for (const fileResult of tsResults) {
            for (const match of fileResult.matches) {
              matches.push({
                file_path: fileResult.file_path,
                node_type: match.node_type,
                start_line: match.start_line,
                end_line: match.end_line,
                text_content: match.text,
                source: strategy.type,
                confidence: strategy.confidence
              });
            }
          }
        }

        results.push({
          strategy: strategy.type,
          matches,
          count: matches.length
        });

        console.log(`[NLP] 策略 ${strategy.type} 找到 ${matches.length} 个匹配`);
      } catch (error) {
        console.error(`[NLP] 策略 ${strategy.type} 执行失败:`, error);
        results.push({
          strategy: strategy.type,
          matches: [],
          count: 0,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 合并和排序结果
   */
  mergeAndRank(strategyResults) {
    const allMatches = [];

    for (const result of strategyResults) {
      allMatches.push(...result.matches);
    }

    // 去重（基于file_path + node_id）
    const uniqueMatches = new Map();

    for (const match of allMatches) {
      const key = `${match.file_path}:${match.node_id || match.start_line}`;

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
      return (a.start_line || 0) - (b.start_line || 0);
    });

    return results;
  }
}

// ============================================================================
// 2. Multi-Match Handler - 多匹配处理器
// ============================================================================

class MultiMatchHandler {
  constructor(llmClient, llmDisambiguator = null) {
    this.llm = llmClient;
    this.disambiguator = llmDisambiguator; // LLM 消歧器
  }

  /**
   * 处理多个匹配
   */
  async handleMultipleMatches(matches, intent, userInput) {
    console.log(`[MultiMatch] 处理 ${matches.length} 个匹配`);

    // Step 1: 分析范围
    const scope = this.analyzeScope(intent, userInput);

    // Step 2: 决定策略
    let strategy;

    if (scope.type === 'all') {
      // 用户明确说"所有"
      strategy = {
        type: 'batch_all',
        selectedMatches: matches,
        needsConfirmation: matches.length > 5
      };
    } else if (scope.type === 'single' && matches.length === 1) {
      // 只有一个匹配
      strategy = {
        type: 'single',
        selectedMatches: matches,
        needsConfirmation: false
      };
    } else if (matches.length > 1) {
      // 多个匹配，需要用户选择或LLM消歧
      if (this.llm || this.disambiguator) {
        strategy = await this.disambiguateWithLLM(matches, intent, userInput);
      } else {
        strategy = {
          type: 'user_select',
          selectedMatches: matches,
          needsConfirmation: true
        };
      }
    } else {
      // 默认策略
      strategy = {
        type: 'user_select',
        selectedMatches: matches,
        needsConfirmation: true
      };
    }

    return strategy;
  }

  /**
   * 分析用户意图中的范围
   */
  analyzeScope(intent, userInput) {
    if (intent.scope === 'all') {
      return { type: 'all', confidence: 0.9 };
    } else if (intent.scope === 'single') {
      return { type: 'specific', confidence: 0.8 };
    } else {
      return { type: 'ambiguous', confidence: 0.5 };
    }
  }

  /**
   * 使用LLM消歧
   */
  async disambiguateWithLLM(matches, intent, userInput) {
    // 使用新的 LLM 消歧器
    if (this.disambiguator) {
      try {
        return await this.disambiguator.disambiguate(matches, intent, userInput);
      } catch (error) {
        console.error('[MultiMatch] LLM 消歧失败:', error);
      }
    }

    // 降级策略
    console.log('[MultiMatch] 使用默认消歧策略');

    return {
      type: 'user_confirm',
      selectedMatches: matches.slice(0, 3), // 建议前3个
      allMatches: matches,
      reasoning: '根据规则分析，建议修改以下元素',
      confidence: 0.7,
      needsConfirmation: true
    };
  }
}

// ============================================================================
// 3. Simple LLM Client - 简单的LLM客户端（用于测试）
// ============================================================================

class SimpleLLMClient {
  constructor(apiKey, apiUrl = 'https://openrouter.ai/api/v1/chat/completions') {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async chat(prompt, options = {}) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000
      })
    });

    if (!response.ok) {
      throw new Error(`LLM请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.NaturalLanguageQueryEngine = NaturalLanguageQueryEngine;
  window.MultiMatchHandler = MultiMatchHandler;
  window.SimpleLLMClient = SimpleLLMClient;
}
