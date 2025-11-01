// ============================================================================
// Prompty V2 - Core Modules
// ============================================================================

// ============================================================================
// 1. Database Manager - PGlite数据库管理
// ============================================================================

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.schema = null;
  }

  /**
   * 初始化数据库
   */
  async init() {
    if (this.isInitialized) {
      return this.db;
    }

    console.log('[DB] 正在初始化PGlite数据库...');

    try {
      // 导入PGlite
      const module = await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js');
      const PGlite = module.PGlite || module.default?.PGlite || module;

      // 创建数据库实例（持久化到IndexedDB）
      this.db = new PGlite('idb://prompty-v2-db');

      console.log('[DB] PGlite数据库实例创建成功');

      // 加载并执行Schema
      await this.createSchema();

      this.isInitialized = true;
      console.log('[DB] 数据库初始化完成');

      return this.db;
    } catch (error) {
      console.error('[DB] 数据库初始化失败:', error);
      throw new Error(`数据库初始化失败: ${error.message}`);
    }
  }

  /**
   * 创建数据库Schema
   */
  async createSchema() {
    console.log('[DB] 正在创建数据库Schema...');

    // Schema SQL（从database-schema.sql复制）
    const schemaSql = `
      -- 版本表
      CREATE TABLE IF NOT EXISTS versions (
        id SERIAL PRIMARY KEY,
        version_id TEXT NOT NULL UNIQUE,
        parent_version_id TEXT,
        description TEXT NOT NULL,
        user_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_versions_version_id ON versions(version_id);

      -- 文件表
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        version_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        file_type TEXT DEFAULT 'html',
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb,
        UNIQUE(version_id, file_path)
      );

      CREATE INDEX IF NOT EXISTS idx_files_version_id ON files(version_id);
      CREATE INDEX IF NOT EXISTS idx_files_file_path ON files(file_path);

      -- AST节点表
      CREATE TABLE IF NOT EXISTS ast_nodes (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL,
        node_type TEXT NOT NULL,
        tag_name TEXT,
        start_line INTEGER NOT NULL,
        start_column INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        end_column INTEGER NOT NULL,
        parent_id INTEGER,
        node_path TEXT,
        attributes JSONB DEFAULT '{}'::jsonb,
        text_content TEXT,
        depth INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ast_nodes_file_id ON ast_nodes(file_id);
      CREATE INDEX IF NOT EXISTS idx_ast_nodes_tag_name ON ast_nodes(tag_name);
      CREATE INDEX IF NOT EXISTS idx_ast_nodes_node_path ON ast_nodes(node_path);

      -- 语义标记表
      CREATE TABLE IF NOT EXISTS semantic_markers (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL,
        node_id INTEGER,
        semantic_id TEXT NOT NULL,
        semantic_type TEXT NOT NULL,
        semantic_role TEXT,
        confidence REAL DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(file_id, semantic_id)
      );

      CREATE INDEX IF NOT EXISTS idx_semantic_markers_semantic_id ON semantic_markers(semantic_id);
      CREATE INDEX IF NOT EXISTS idx_semantic_markers_semantic_type ON semantic_markers(semantic_type);

      -- 代码片段表
      CREATE TABLE IF NOT EXISTS code_snippets (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL,
        snippet_type TEXT NOT NULL,
        content TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        context JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_code_snippets_file_id ON code_snippets(file_id);

      -- 依赖关系表
      CREATE TABLE IF NOT EXISTS dependencies (
        id SERIAL PRIMARY KEY,
        version_id TEXT NOT NULL,
        source_file TEXT NOT NULL,
        target_file TEXT,
        dependency_type TEXT NOT NULL,
        source_location JSONB,
        target_location JSONB,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_dependencies_version_id ON dependencies(version_id);

      -- 查询缓存表
      CREATE TABLE IF NOT EXISTS query_cache (
        id SERIAL PRIMARY KEY,
        query_key TEXT NOT NULL UNIQUE,
        query_type TEXT NOT NULL,
        query_input TEXT NOT NULL,
        query_result JSONB NOT NULL,
        hit_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_query_cache_key ON query_cache(query_key);

      -- 插入初始版本
      INSERT INTO versions (version_id, description, user_prompt)
      VALUES ('v0', '初始版本（空项目）', 'system_init')
      ON CONFLICT (version_id) DO NOTHING;
    `;

    try {
      await this.db.exec(schemaSql);
      console.log('[DB] Schema创建成功');
    } catch (error) {
      console.error('[DB] Schema创建失败:', error);
      throw error;
    }
  }

  /**
   * 执行查询
   */
  async query(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('数据库未初始化，请先调用 init()');
    }

    try {
      const result = await this.db.query(sql, params);
      return result;
    } catch (error) {
      console.error('[DB] 查询失败:', { sql, params, error });
      throw error;
    }
  }

  /**
   * 执行SQL（无返回值）
   */
  async exec(sql) {
    if (!this.isInitialized) {
      throw new Error('数据库未初始化，请先调用 init()');
    }

    try {
      await this.db.exec(sql);
    } catch (error) {
      console.error('[DB] 执行失败:', { sql, error });
      throw error;
    }
  }

  /**
   * 开始事务
   */
  async beginTransaction() {
    await this.exec('BEGIN TRANSACTION');
  }

  /**
   * 提交事务
   */
  async commit() {
    await this.exec('COMMIT');
  }

  /**
   * 回滚事务
   */
  async rollback() {
    await this.exec('ROLLBACK');
  }

  /**
   * 清理过期缓存
   */
  async cleanupCache() {
    const result = await this.query(`
      DELETE FROM query_cache
      WHERE expires_at IS NOT NULL
        AND expires_at < CURRENT_TIMESTAMP
    `);

    console.log(`[DB] 清理了 ${result.affectedRows || 0} 条过期缓存`);
  }
}

// ============================================================================
// 2. Tree-sitter Parser - AST解析器
// ============================================================================

class TreeSitterParser {
  constructor() {
    this.parser = null;
    this.languages = new Map();
    this.isInitialized = false;
  }

  /**
   * 初始化解析器
   */
  async init() {
    if (this.isInitialized) {
      return;
    }

    console.log('[Parser] 正在初始化Tree-sitter...');

    try {
      // 动态导入web-tree-sitter (使用 default 导出)
      const module = await import('https://cdn.jsdelivr.net/npm/web-tree-sitter@0.20.8/tree-sitter.js');
      const Parser = module.default || module;

      // 初始化WASM
      await Parser.init({
        locateFile(scriptName) {
          return `https://cdn.jsdelivr.net/npm/web-tree-sitter@0.20.8/${scriptName}`;
        }
      });

      this.Parser = Parser;
      this.parser = new Parser();

      this.isInitialized = true;
      console.log('[Parser] Tree-sitter初始化成功');
    } catch (error) {
      console.error('[Parser] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载语言解析器
   */
  async loadLanguage(language) {
    if (this.languages.has(language)) {
      return this.languages.get(language);
    }

    console.log(`[Parser] 正在加载 ${language} 解析器...`);

    try {
      let wasmUrl;
      switch (language) {
        case 'html':
          wasmUrl = 'https://cdn.jsdelivr.net/npm/tree-sitter-html@0.19.0/tree-sitter-html.wasm';
          break;
        case 'css':
          wasmUrl = 'https://cdn.jsdelivr.net/npm/tree-sitter-css@0.19.0/tree-sitter-css.wasm';
          break;
        case 'javascript':
          wasmUrl = 'https://cdn.jsdelivr.net/npm/tree-sitter-javascript@0.20.1/tree-sitter-javascript.wasm';
          break;
        default:
          throw new Error(`不支持的语言: ${language}`);
      }

      const Lang = await this.Parser.Language.load(wasmUrl);
      this.languages.set(language, Lang);

      console.log(`[Parser] ${language} 解析器加载成功`);
      return Lang;
    } catch (error) {
      console.error(`[Parser] 加载 ${language} 失败:`, error);
      throw error;
    }
  }

  /**
   * 解析代码
   */
  async parse(code, language) {
    if (!this.isInitialized) {
      await this.init();
    }

    // 加载语言
    const lang = await this.loadLanguage(language);
    this.parser.setLanguage(lang);

    // 解析
    const tree = this.parser.parse(code);
    return tree;
  }

  /**
   * 执行Tree-sitter Query
   */
  async executeQuery(tree, queryString, language) {
    const lang = await this.loadLanguage(language);
    const query = lang.query(queryString);
    const matches = query.matches(tree.rootNode);
    return matches;
  }
}

// ============================================================================
// 3. Semantic Marker Injector - 语义标记注入器
// ============================================================================

class SemanticMarkerInjector {
  constructor() {
    this.markerCounter = 0;
  }

  /**
   * 为HTML元素注入语义标记
   */
  injectMarkers(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 注入各种语义标记
    this.markNavigationElements(doc);
    this.markButtonElements(doc);
    this.markHeadingElements(doc);
    this.markLinkElements(doc);
    this.markFormElements(doc);

    return doc.documentElement.outerHTML;
  }

  /**
   * 标记导航元素
   */
  markNavigationElements(doc) {
    const navElements = doc.querySelectorAll('nav, [role="navigation"], .nav, .navigation, .navbar');

    navElements.forEach((el, index) => {
      if (!el.hasAttribute('data-semantic-id')) {
        el.setAttribute('data-semantic-id', `navigation-${index}`);
        el.setAttribute('data-semantic-type', 'navigation');
      }

      // 标记导航链接
      const links = el.querySelectorAll('a');
      links.forEach((link, linkIndex) => {
        if (!link.hasAttribute('data-semantic-id')) {
          link.setAttribute('data-semantic-id', `nav-link-${index}-${linkIndex}`);
          link.setAttribute('data-semantic-role', 'nav-link');

          const href = link.getAttribute('href');
          if (href && href.endsWith('.html')) {
            link.setAttribute('data-target-page', href);
          }
        }
      });
    });
  }

  /**
   * 标记按钮元素
   */
  markButtonElements(doc) {
    const buttons = doc.querySelectorAll('button, [role="button"], .btn, .button');

    buttons.forEach((btn, index) => {
      if (!btn.hasAttribute('data-semantic-id')) {
        const purpose = this.inferButtonPurpose(btn);
        btn.setAttribute('data-semantic-id', `button-${purpose}-${index}`);
        btn.setAttribute('data-semantic-type', 'button');
        btn.setAttribute('data-semantic-role', purpose);
      }
    });
  }

  /**
   * 推断按钮用途
   */
  inferButtonPurpose(btn) {
    const text = btn.textContent.toLowerCase();
    const classes = btn.className.toLowerCase();

    if (text.includes('提交') || text.includes('submit') || classes.includes('submit')) {
      return 'submit';
    } else if (text.includes('取消') || text.includes('cancel') || classes.includes('cancel')) {
      return 'cancel';
    } else if (text.includes('购买') || text.includes('联系') || text.includes('立即') || classes.includes('cta') || classes.includes('primary')) {
      return 'cta';
    } else if (text.includes('删除') || text.includes('delete') || classes.includes('delete')) {
      return 'delete';
    } else if (text.includes('确认') || text.includes('confirm') || classes.includes('confirm')) {
      return 'confirm';
    }

    return 'action';
  }

  /**
   * 标记标题元素
   */
  markHeadingElements(doc) {
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach((h, index) => {
      if (!h.hasAttribute('data-semantic-id')) {
        h.setAttribute('data-semantic-id', `heading-${h.tagName.toLowerCase()}-${index}`);
        h.setAttribute('data-semantic-type', 'heading');
        h.setAttribute('data-semantic-level', h.tagName.substring(1));
      }
    });
  }

  /**
   * 标记链接元素
   */
  markLinkElements(doc) {
    const links = doc.querySelectorAll('a[href]');

    links.forEach((link, index) => {
      if (!link.hasAttribute('data-semantic-id')) {
        const href = link.getAttribute('href');

        if (href.startsWith('http') || href.startsWith('//')) {
          link.setAttribute('data-semantic-type', 'external-link');
        } else if (href.endsWith('.html')) {
          link.setAttribute('data-semantic-type', 'internal-link');
          link.setAttribute('data-target-page', href);
        } else if (href.startsWith('#')) {
          link.setAttribute('data-semantic-type', 'anchor-link');
          link.setAttribute('data-target-anchor', href.substring(1));
        }
      }
    });
  }

  /**
   * 标记表单元素
   */
  markFormElements(doc) {
    const forms = doc.querySelectorAll('form');

    forms.forEach((form, formIndex) => {
      if (!form.hasAttribute('data-semantic-id')) {
        form.setAttribute('data-semantic-id', `form-${formIndex}`);
        form.setAttribute('data-semantic-type', 'form');
      }

      // 标记表单输入
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach((input, inputIndex) => {
        if (!input.hasAttribute('data-semantic-id')) {
          const type = input.type || 'text';
          input.setAttribute('data-semantic-id', `form-${formIndex}-input-${type}-${inputIndex}`);
          input.setAttribute('data-semantic-type', 'form-input');
          input.setAttribute('data-input-type', type);
        }
      });
    });
  }

  /**
   * 提取已注入的语义标记
   */
  extractMarkers(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const markers = [];

    const elementsWithMarkers = doc.querySelectorAll('[data-semantic-id]');
    elementsWithMarkers.forEach(el => {
      markers.push({
        semantic_id: el.getAttribute('data-semantic-id'),
        semantic_type: el.getAttribute('data-semantic-type'),
        semantic_role: el.getAttribute('data-semantic-role'),
        tag_name: el.tagName.toLowerCase(),
        text_content: el.textContent?.trim().substring(0, 100)
      });
    });

    return markers;
  }
}

// ============================================================================
// 4. Version Manager - 版本管理器
// ============================================================================

class VersionManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * 创建新版本
   */
  async createVersion(description, userPrompt, parentVersionId = null) {
    // 生成版本ID
    const versionId = await this.generateVersionId();

    const result = await this.db.query(`
      INSERT INTO versions (version_id, parent_version_id, description, user_prompt)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [versionId, parentVersionId, description, userPrompt]);

    console.log(`[Version] 创建新版本: ${versionId}`);
    return result.rows[0];
  }

  /**
   * 生成版本ID
   */
  async generateVersionId() {
    const result = await this.db.query(`
      SELECT COUNT(*) as count FROM versions
    `);

    const count = parseInt(result.rows[0].count);
    return `v${count}`;
  }

  /**
   * 获取当前版本
   */
  async getCurrentVersion() {
    const result = await this.db.query(`
      SELECT * FROM versions
      ORDER BY created_at DESC
      LIMIT 1
    `);

    return result.rows[0];
  }

  /**
   * 获取所有版本
   */
  async getAllVersions() {
    const result = await this.db.query(`
      SELECT * FROM versions
      ORDER BY created_at DESC
    `);

    return result.rows;
  }

  /**
   * 获取版本的文件列表
   */
  async getVersionFiles(versionId) {
    const result = await this.db.query(`
      SELECT * FROM files
      WHERE version_id = $1
      ORDER BY file_path
    `, [versionId]);

    return result.rows;
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.DatabaseManager = DatabaseManager;
  window.TreeSitterParser = TreeSitterParser;
  window.SemanticMarkerInjector = SemanticMarkerInjector;
  window.VersionManager = VersionManager;
}
