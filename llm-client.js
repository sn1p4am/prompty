// ============================================================================
// Prompty V2 - LLM Client
// LLM API 客户端 - 支持 OpenRouter API 和本地缓存
// ============================================================================

// ============================================================================
// 1. LLM Client - 增强的 LLM 客户端
// ============================================================================

class LLMClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.apiUrl = options.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
    this.defaultModel = options.defaultModel || 'anthropic/claude-3.5-sonnet';
    this.cache = options.enableCache !== false ? new Map() : null;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 30000;
    this.requestCount = 0;
    this.cacheHits = 0;
  }

  /**
   * 发送聊天请求
   */
  async chat(prompt, options = {}) {
    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens || 2000;
    const stream = options.stream || false;

    // 检查缓存
    if (this.cache && !stream) {
      const cacheKey = this.getCacheKey(prompt, model, temperature);
      if (this.cache.has(cacheKey)) {
        console.log('[LLM] 使用缓存响应');
        this.cacheHits++;
        return this.cache.get(cacheKey);
      }
    }

    this.requestCount++;
    console.log(`[LLM] 发送请求 #${this.requestCount} (model: ${model})`);

    try {
      const response = await this.sendRequestWithRetry({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: maxTokens,
        stream
      }, this.maxRetries);

      if (stream) {
        return response; // 返回 Response 对象用于流式读取
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // 存入缓存
      if (this.cache) {
        const cacheKey = this.getCacheKey(prompt, model, temperature);
        this.cache.set(cacheKey, content);
      }

      return content;

    } catch (error) {
      console.error('[LLM] 请求失败:', error);
      throw error;
    }
  }

  /**
   * 带重试的请求发送
   */
  async sendRequestWithRetry(payload, retries) {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'Prompty V2'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API 错误 (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        return response;

      } catch (error) {
        lastError = error;
        console.warn(`[LLM] 请求失败 (尝试 ${i + 1}/${retries}):`, error.message);

        if (i < retries - 1) {
          // 指数退避
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          console.log(`[LLM] ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * 生成缓存键
   */
  getCacheKey(prompt, model, temperature) {
    const key = `${model}:${temperature}:${prompt}`;
    return this.hashString(key);
  }

  /**
   * 简单的字符串哈希函数
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * 清空缓存
   */
  clearCache() {
    if (this.cache) {
      this.cache.clear();
      console.log('[LLM] 缓存已清空');
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      cacheHits: this.cacheHits,
      cacheSize: this.cache ? this.cache.size : 0,
      cacheHitRate: this.requestCount > 0
        ? (this.cacheHits / this.requestCount * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

// ============================================================================
// 2. Intent Extractor - LLM 意图提取器
// ============================================================================

class LLMIntentExtractor {
  constructor(llmClient) {
    this.llm = llmClient;
  }

  /**
   * 使用 LLM 提取用户意图
   */
  async extractIntent(userInput) {
    console.log('[LLM Intent] 提取意图:', userInput);

    const prompt = `你是一个代码编辑意图分析专家。分析用户的自然语言需求，提取关键信息。

用户输入: "${userInput}"

请输出 JSON 格式（只输出 JSON，不要其他内容）:
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

示例:
输入: "把所有页面的导航背景色改成深蓝"
输出:
{
  "operation": "edit",
  "target": {
    "description": "导航栏",
    "keywords": ["导航"],
    "possible_tags": ["nav"],
    "possible_classes": ["navigation", "navbar", "nav"],
    "possible_ids": [],
    "semantic_roles": ["navigation"]
  },
  "modification": {
    "type": "style",
    "description": "背景色改成深蓝",
    "properties": {
      "background": "#001f3f"
    }
  },
  "scope": "all",
  "confidence": 0.95
}`;

    try {
      const response = await this.llm.chat(prompt, {
        temperature: 0.3, // 低温度保证稳定性
        maxTokens: 1000
      });

      // 提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM 响应中未找到 JSON');
      }

      const intent = JSON.parse(jsonMatch[0]);
      console.log('[LLM Intent] 意图提取成功:', intent);

      return intent;

    } catch (error) {
      console.error('[LLM Intent] 意图提取失败:', error);
      throw error;
    }
  }
}

// ============================================================================
// 3. Disambiguator - LLM 消歧器
// ============================================================================

class LLMDisambiguator {
  constructor(llmClient) {
    this.llm = llmClient;
  }

  /**
   * 使用 LLM 从多个匹配中选择最相关的
   */
  async disambiguate(matches, intent, userInput) {
    console.log(`[LLM Disambiguator] 消歧 ${matches.length} 个匹配`);

    // 如果匹配太少，直接返回
    if (matches.length <= 1) {
      return {
        type: 'single',
        selectedMatches: matches,
        reasoning: '只有一个匹配'
      };
    }

    // 如果匹配太多，截取前 10 个
    const matchesToAnalyze = matches.slice(0, 10);

    // 构建匹配描述
    const matchesDescription = matchesToAnalyze.map((match, idx) => {
      return `匹配 ${idx + 1}:
  文件: ${match.file_path}
  位置: 第 ${match.start_line} 行
  类型: ${match.tag_name || match.node_type}
  内容: ${(match.text_content || match.text || '').substring(0, 100)}`;
    }).join('\n\n');

    const prompt = `你是一个代码匹配分析专家。用户想要修改代码，系统找到了多个可能的匹配，请帮助选择最相关的匹配项。

用户输入: "${userInput}"

用户意图:
- 操作类型: ${intent.operation}
- 目标描述: ${intent.target.description}
- 范围: ${intent.scope}

找到的匹配项:
${matchesDescription}

请分析并输出 JSON（只输出 JSON，不要其他内容）:
{
  "strategy": "all|top3|single",
  "selectedIndices": [0, 1, 2],
  "reasoning": "选择理由",
  "confidence": 0.85
}

说明:
- strategy: "all" 表示所有匹配都相关，"top3" 表示推荐前3个，"single" 表示只推荐1个
- selectedIndices: 选中的匹配索引（从0开始）
- reasoning: 简短说明为什么选择这些匹配
- confidence: 置信度 (0-1)`;

    try {
      const response = await this.llm.chat(prompt, {
        temperature: 0.3,
        maxTokens: 500
      });

      // 提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM 响应中未找到 JSON');
      }

      const result = JSON.parse(jsonMatch[0]);

      // 根据选中的索引获取匹配
      const selectedMatches = result.selectedIndices.map(idx => matchesToAnalyze[idx]);

      console.log(`[LLM Disambiguator] 消歧成功，选择了 ${selectedMatches.length} 个匹配`);

      return {
        type: result.strategy,
        selectedMatches,
        allMatches: matches,
        reasoning: result.reasoning,
        confidence: result.confidence,
        needsConfirmation: selectedMatches.length > 3
      };

    } catch (error) {
      console.error('[LLM Disambiguator] 消歧失败:', error);

      // 降级策略：返回所有匹配
      return {
        type: 'user_confirm',
        selectedMatches: matchesToAnalyze,
        allMatches: matches,
        reasoning: 'LLM 消歧失败，需要用户确认',
        confidence: 0.5,
        needsConfirmation: true
      };
    }
  }
}

// ============================================================================
// 4. Code Generator - LLM 代码生成器
// ============================================================================

class LLMCodeGenerator {
  constructor(llmClient) {
    this.llm = llmClient;
  }

  /**
   * 使用 LLM 生成代码修改方案
   */
  async generateModification(match, intent) {
    console.log('[LLM CodeGen] 生成修改方案');

    const prompt = `你是一个 HTML/CSS/JavaScript 代码编辑专家。根据用户意图生成具体的代码修改方案。

用户意图:
- 操作: ${intent.operation}
- 目标: ${intent.target.description}
- 修改描述: ${intent.modification?.description || ''}

当前代码:
文件: ${match.file_path}
位置: 第 ${match.start_line} 行
内容:
\`\`\`html
${match.text_content || match.text || ''}
\`\`\`

请输出 JSON 格式的修改方案（只输出 JSON，不要其他内容）:
{
  "modificationType": "replace|insert|delete|setAttribute|setStyle",
  "target": "具体要修改的元素",
  "changes": {
    "// 根据 modificationType 的不同，这里的字段会不同": ""
  },
  "preview": "修改后的代码预览",
  "explanation": "修改说明"
}

示例（设置样式）:
{
  "modificationType": "setStyle",
  "target": "nav 元素",
  "changes": {
    "background": "#001f3f",
    "color": "#ffffff"
  },
  "preview": "<nav style=\\"background: #001f3f; color: #ffffff;\\">...</nav>",
  "explanation": "将导航栏背景设置为深蓝色，文字设置为白色"
}`;

    try {
      const response = await this.llm.chat(prompt, {
        temperature: 0.5,
        maxTokens: 1500
      });

      // 提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM 响应中未找到 JSON');
      }

      const modification = JSON.parse(jsonMatch[0]);
      console.log('[LLM CodeGen] 修改方案生成成功');

      return modification;

    } catch (error) {
      console.error('[LLM CodeGen] 代码生成失败:', error);
      throw error;
    }
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.LLMClient = LLMClient;
  window.LLMIntentExtractor = LLMIntentExtractor;
  window.LLMDisambiguator = LLMDisambiguator;
  window.LLMCodeGenerator = LLMCodeGenerator;
}
