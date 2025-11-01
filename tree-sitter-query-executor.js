// ============================================================================
// Prompty V2 - Tree-sitter Query Executor
// Tree-sitter 查询执行器 - 使用 Tree-sitter Query Language 进行精确代码匹配
// ============================================================================

// ============================================================================
// 1. Tree-sitter Query Executor - 查询执行器
// ============================================================================

class TreeSitterQueryExecutor {
  constructor(parserManager, db) {
    this.parser = parserManager;
    this.db = db;
    this.queryCache = new Map();
  }

  /**
   * 执行 Tree-sitter Query 在指定文件上
   * @param {string} fileId - 文件ID
   * @param {string} queryString - Tree-sitter Query 字符串
   * @param {string} language - 语言类型 (html, css, javascript)
   * @returns {Array} 匹配结果
   */
  async executeQuery(fileId, queryString, language = 'html') {
    console.log(`[TSQuery] 执行查询: ${queryString.substring(0, 50)}...`);

    try {
      // 1. 获取文件内容
      const fileResult = await this.db.query(`
        SELECT content FROM files WHERE id = $1
      `, [fileId]);

      if (fileResult.rows.length === 0) {
        throw new Error(`文件 ${fileId} 不存在`);
      }

      const content = fileResult.rows[0].content;

      // 2. 解析代码
      const tree = await this.parser.parse(content, language);

      // 3. 创建查询
      const Language = await this.parser.loadLanguage(language);
      const query = Language.query(queryString);

      // 4. 执行查询
      const captures = query.captures(tree.rootNode);

      // 5. 转换结果
      const matches = captures.map(capture => ({
        name: capture.name,
        node_type: capture.node.type,
        text: capture.node.text,
        start_position: capture.node.startPosition,
        end_position: capture.node.endPosition,
        start_line: capture.node.startPosition.row + 1,
        end_line: capture.node.endPosition.row + 1,
        start_column: capture.node.startPosition.column,
        end_column: capture.node.endPosition.column
      }));

      console.log(`[TSQuery] 找到 ${matches.length} 个匹配`);
      return matches;

    } catch (error) {
      console.error(`[TSQuery] 查询执行失败:`, error);
      throw error;
    }
  }

  /**
   * 在多个文件上执行查询
   */
  async executeQueryOnFiles(fileIds, queryString, language = 'html') {
    console.log(`[TSQuery] 在 ${fileIds.length} 个文件上执行查询`);

    const results = [];

    for (const fileId of fileIds) {
      try {
        const matches = await this.executeQuery(fileId, queryString, language);

        // 获取文件路径
        const fileInfo = await this.db.query(`
          SELECT file_path FROM files WHERE id = $1
        `, [fileId]);

        results.push({
          file_id: fileId,
          file_path: fileInfo.rows[0].file_path,
          matches,
          count: matches.length
        });
      } catch (error) {
        console.error(`[TSQuery] 文件 ${fileId} 查询失败:`, error);
        results.push({
          file_id: fileId,
          matches: [],
          count: 0,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 在版本的所有文件上执行查询
   */
  async executeQueryOnVersion(versionId, queryString, language = 'html') {
    console.log(`[TSQuery] 在版本 ${versionId} 的所有文件上执行查询`);

    // 获取版本的所有文件
    const filesResult = await this.db.query(`
      SELECT id FROM files WHERE version_id = $1
    `, [versionId]);

    const fileIds = filesResult.rows.map(row => row.id);

    return await this.executeQueryOnFiles(fileIds, queryString, language);
  }
}

// ============================================================================
// 2. Query Pattern Library - 预定义查询模式库
// ============================================================================

class QueryPatternLibrary {
  constructor() {
    this.patterns = this.buildPatterns();
  }

  /**
   * 构建预定义查询模式
   */
  buildPatterns() {
    return {
      // HTML 查询模式
      html: {
        // 查找所有按钮
        all_buttons: `
          (element
            (start_tag
              (tag_name) @tag
              (#match? @tag "^(button|a)$")))
        `,

        // 查找带有特定 class 的元素
        elements_with_class: (className) => `
          (element
            (start_tag
              (attribute
                (attribute_name) @attr_name
                (quoted_attribute_value
                  (attribute_value) @attr_value))
              (#eq? @attr_name "class")
              (#match? @attr_value "${className}")))
        `,

        // 查找导航元素
        navigation: `
          (element
            (start_tag
              (tag_name) @tag
              (#eq? @tag "nav")))
        `,

        // 查找表单
        forms: `
          (element
            (start_tag
              (tag_name) @tag
              (#eq? @tag "form")))
        `,

        // 查找标题 (h1-h6)
        headings: `
          (element
            (start_tag
              (tag_name) @tag
              (#match? @tag "^h[1-6]$")))
        `,

        // 查找链接
        links: `
          (element
            (start_tag
              (tag_name) @tag
              (#eq? @tag "a")))
        `,

        // 查找图片
        images: `
          (element
            (start_tag
              (tag_name) @tag
              (#eq? @tag "img")))
        `,

        // 查找带有特定属性的元素
        elements_with_attribute: (attrName, attrValue = null) => {
          if (attrValue) {
            return `
              (element
                (start_tag
                  (attribute
                    (attribute_name) @attr_name
                    (quoted_attribute_value
                      (attribute_value) @attr_value))
                  (#eq? @attr_name "${attrName}")
                  (#eq? @attr_value "${attrValue}")))
            `;
          } else {
            return `
              (element
                (start_tag
                  (attribute
                    (attribute_name) @attr_name)
                  (#eq? @attr_name "${attrName}")))
            `;
          }
        }
      },

      // CSS 查询模式
      css: {
        // 查找特定选择器的规则
        rules_by_selector: (selector) => `
          (rule_set
            (selectors) @selector
            (#match? @selector "${selector}"))
        `,

        // 查找所有 class 选择器
        class_selectors: `
          (class_selector) @class
        `,

        // 查找颜色值
        color_values: `
          [
            (color_value) @color
            (plain_value) @color
            (#match? @color "^#[0-9a-fA-F]{3,6}$")
          ]
        `
      },

      // JavaScript 查询模式
      javascript: {
        // 查找函数定义
        function_definitions: `
          [
            (function_declaration
              name: (identifier) @func_name)
            (function
              name: (identifier) @func_name)
          ]
        `,

        // 查找事件监听器
        event_listeners: `
          (call_expression
            function: (member_expression
              property: (property_identifier) @method)
            (#eq? @method "addEventListener"))
        `,

        // 查找变量声明
        variable_declarations: `
          (variable_declarator
            name: (identifier) @var_name)
        `
      }
    };
  }

  /**
   * 获取预定义查询模式
   */
  getPattern(language, patternName, ...args) {
    if (!this.patterns[language]) {
      throw new Error(`不支持的语言: ${language}`);
    }

    const pattern = this.patterns[language][patternName];

    if (!pattern) {
      throw new Error(`未找到模式: ${language}.${patternName}`);
    }

    // 如果是函数，调用并传入参数
    if (typeof pattern === 'function') {
      return pattern(...args);
    }

    return pattern;
  }

  /**
   * 列出所有可用的模式
   */
  listPatterns(language = null) {
    if (language) {
      return Object.keys(this.patterns[language] || {});
    }

    const allPatterns = {};
    for (const lang in this.patterns) {
      allPatterns[lang] = Object.keys(this.patterns[lang]);
    }
    return allPatterns;
  }
}

// ============================================================================
// 3. Intent to Query Translator - 意图到查询转换器
// ============================================================================

class IntentToQueryTranslator {
  constructor(patternLibrary) {
    this.library = patternLibrary;
  }

  /**
   * 将用户意图转换为 Tree-sitter 查询
   */
  translateIntent(intent) {
    console.log('[Translator] 转换意图为 Tree-sitter Query');

    const queries = [];

    // 基于目标元素生成查询
    if (intent.target) {
      const target = intent.target;

      // 1. 标签查询
      if (target.possible_tags && target.possible_tags.length > 0) {
        for (const tag of target.possible_tags) {
          queries.push({
            type: 'tree-sitter',
            language: 'html',
            query: this.buildTagQuery(tag),
            confidence: 0.8,
            description: `查找所有 <${tag}> 元素`
          });
        }
      }

      // 2. Class 查询
      if (target.possible_classes && target.possible_classes.length > 0) {
        for (const className of target.possible_classes) {
          try {
            queries.push({
              type: 'tree-sitter',
              language: 'html',
              query: this.library.getPattern('html', 'elements_with_class', className),
              confidence: 0.7,
              description: `查找 class 包含 "${className}" 的元素`
            });
          } catch (error) {
            console.warn(`[Translator] 生成 class 查询失败: ${className}`, error);
          }
        }
      }

      // 3. 语义角色查询
      if (target.semantic_roles && target.semantic_roles.length > 0) {
        for (const role of target.semantic_roles) {
          const patternName = this.getRolePatternName(role);
          if (patternName) {
            try {
              queries.push({
                type: 'tree-sitter',
                language: 'html',
                query: this.library.getPattern('html', patternName),
                confidence: 0.9,
                description: `查找语义角色为 "${role}" 的元素`
              });
            } catch (error) {
              console.warn(`[Translator] 生成语义查询失败: ${role}`, error);
            }
          }
        }
      }
    }

    console.log(`[Translator] 生成了 ${queries.length} 个 Tree-sitter 查询`);
    return queries;
  }

  /**
   * 构建标签查询
   */
  buildTagQuery(tagName) {
    return `
      (element
        (start_tag
          (tag_name) @tag
          (#eq? @tag "${tagName}")))
    `;
  }

  /**
   * 将语义角色映射到预定义模式
   */
  getRolePatternName(role) {
    const roleMap = {
      'navigation': 'navigation',
      'button': 'all_buttons',
      'heading': 'headings',
      'link': 'links',
      'form': 'forms',
      'image': 'images'
    };

    return roleMap[role] || null;
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.TreeSitterQueryExecutor = TreeSitterQueryExecutor;
  window.QueryPatternLibrary = QueryPatternLibrary;
  window.IntentToQueryTranslator = IntentToQueryTranslator;
}
