// ============================================================================
// Prompty V2 - Indexer Modules
// 索引构建模块
// ============================================================================

// ============================================================================
// 1. HTML Indexer - HTML结构索引器
// ============================================================================

class HTMLIndexer {
  constructor(db) {
    this.db = db;
  }

  /**
   * 索引HTML文件
   * @param {number} fileId - 文件ID
   * @param {string} htmlContent - HTML内容
   */
  async indexHTML(fileId, htmlContent) {
    console.log(`[HTMLIndexer] 开始索引文件 ${fileId}...`);

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 使用事务确保数据一致性
    await this.db.beginTransaction();

    try {
      // 删除该文件的旧索引
      await this.db.query(`
        DELETE FROM ast_nodes WHERE file_id = $1
      `, [fileId]);

      await this.db.query(`
        DELETE FROM semantic_markers WHERE file_id = $1
      `, [fileId]);

      // 索引DOM树
      await this.indexDOMTree(doc.documentElement, fileId, null, 0, []);

      await this.db.commit();
      console.log(`[HTMLIndexer] 文件 ${fileId} 索引完成`);
    } catch (error) {
      await this.db.rollback();
      console.error(`[HTMLIndexer] 索引失败:`, error);
      throw error;
    }
  }

  /**
   * 递归索引DOM树
   */
  async indexDOMTree(node, fileId, parentId, depth, pathArray) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const currentPath = [...pathArray, tagName];
      const nodePath = currentPath.join('>');

      // 提取属性
      const attributes = {};
      for (const attr of node.attributes) {
        attributes[attr.name] = attr.value;
      }

      // 获取文本内容（只取直接子文本节点）
      let textContent = '';
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          textContent += child.textContent;
        }
      }
      textContent = textContent.trim();

      // 估算行号（简化版本，实际应该在解析时记录）
      const startLine = depth + 1;
      const endLine = depth + 1;

      // 插入AST节点
      const result = await this.db.query(`
        INSERT INTO ast_nodes (
          file_id, node_type, tag_name,
          start_line, start_column, end_line, end_column,
          parent_id, node_path, attributes, text_content, depth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        fileId,
        'element',
        tagName,
        startLine,
        0,
        endLine,
        0,
        parentId,
        nodePath,
        JSON.stringify(attributes),
        textContent.substring(0, 500),
        depth
      ]);

      const nodeId = result.rows[0].id;

      // 如果有语义标记，保存到semantic_markers表
      const semanticId = attributes['data-semantic-id'];
      const semanticType = attributes['data-semantic-type'];
      const semanticRole = attributes['data-semantic-role'];

      if (semanticId) {
        await this.db.query(`
          INSERT INTO semantic_markers (
            file_id, node_id, semantic_id, semantic_type, semantic_role
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (file_id, semantic_id) DO UPDATE
          SET node_id = $2, semantic_type = $3, semantic_role = $4
        `, [fileId, nodeId, semanticId, semanticType || 'unknown', semanticRole]);
      }

      // 递归索引子元素
      for (const child of node.children) {
        await this.indexDOMTree(child, fileId, nodeId, depth + 1, currentPath);
      }
    }
  }

  /**
   * 索引代码片段（用于全文搜索）
   */
  async indexCodeSnippets(fileId, htmlContent) {
    console.log(`[HTMLIndexer] 索引代码片段 ${fileId}...`);

    // 删除旧的代码片段
    await this.db.query(`
      DELETE FROM code_snippets WHERE file_id = $1
    `, [fileId]);

    // 提取并索引<style>标签
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = styleRegex.exec(htmlContent)) !== null) {
      const cssCode = match[1];
      if (cssCode.trim()) {
        await this.db.query(`
          INSERT INTO code_snippets (file_id, snippet_type, content, start_line, end_line)
          VALUES ($1, $2, $3, $4, $5)
        `, [fileId, 'css', cssCode, 0, 0]);
      }
    }

    // 提取并索引<script>标签
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      const jsCode = match[1];
      if (jsCode.trim()) {
        await this.db.query(`
          INSERT INTO code_snippets (file_id, snippet_type, content, start_line, end_line)
          VALUES ($1, $2, $3, $4, $5)
        `, [fileId, 'javascript', jsCode, 0, 0]);
      }
    }

    // 索引HTML本身
    await this.db.query(`
      INSERT INTO code_snippets (file_id, snippet_type, content, start_line, end_line)
      VALUES ($1, $2, $3, $4, $5)
    `, [fileId, 'html', htmlContent, 0, htmlContent.split('\n').length]);

    console.log(`[HTMLIndexer] 代码片段索引完成`);
  }
}

// ============================================================================
// 2. Dependency Analyzer - 依赖关系分析器
// ============================================================================

class DependencyAnalyzer {
  constructor(db) {
    this.db = db;
  }

  /**
   * 分析文件的依赖关系
   */
  async analyzeDependencies(versionId, filePath, htmlContent) {
    console.log(`[DependencyAnalyzer] 分析 ${filePath} 的依赖关系...`);

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 删除该文件的旧依赖关系
    await this.db.query(`
      DELETE FROM dependencies
      WHERE version_id = $1 AND source_file = $2
    `, [versionId, filePath]);

    // 分析导航链接
    await this.analyzeNavigationLinks(versionId, filePath, doc);

    // 分析普通链接
    await this.analyzeHyperlinks(versionId, filePath, doc);

    // 分析资源引用（图片、CSS、JS）
    await this.analyzeResources(versionId, filePath, doc);

    console.log(`[DependencyAnalyzer] 依赖分析完成`);
  }

  /**
   * 分析导航链接
   */
  async analyzeNavigationLinks(versionId, filePath, doc) {
    const navLinks = doc.querySelectorAll('nav a[href], [role="navigation"] a[href]');

    for (const link of navLinks) {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.html')) {
        await this.db.query(`
          INSERT INTO dependencies (
            version_id, source_file, target_file, dependency_type, description
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          versionId,
          filePath,
          href,
          'navigation',
          `导航链接: ${link.textContent.trim()}`
        ]);
      }
    }
  }

  /**
   * 分析普通超链接
   */
  async analyzeHyperlinks(versionId, filePath, doc) {
    const links = doc.querySelectorAll('a[href]');

    for (const link of links) {
      const href = link.getAttribute('href');

      if (href && href.endsWith('.html')) {
        // 检查是否已经作为导航链接记录
        const isNavLink = link.closest('nav, [role="navigation"]');
        if (!isNavLink) {
          await this.db.query(`
            INSERT INTO dependencies (
              version_id, source_file, target_file, dependency_type, description
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            versionId,
            filePath,
            href,
            'link',
            `超链接: ${link.textContent.trim()}`
          ]);
        }
      }
    }
  }

  /**
   * 分析资源引用
   */
  async analyzeResources(versionId, filePath, doc) {
    // 分析图片
    const images = doc.querySelectorAll('img[src]');
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        await this.db.query(`
          INSERT INTO dependencies (
            version_id, source_file, target_file, dependency_type, description
          ) VALUES ($1, $2, $3, $4, $5)
        `, [versionId, filePath, src, 'resource', `图片: ${src}`]);
      }
    }

    // 分析CSS链接
    const cssLinks = doc.querySelectorAll('link[rel="stylesheet"][href]');
    for (const link of cssLinks) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http')) {
        await this.db.query(`
          INSERT INTO dependencies (
            version_id, source_file, target_file, dependency_type, description
          ) VALUES ($1, $2, $3, $4, $5)
        `, [versionId, filePath, href, 'resource', `样式表: ${href}`]);
      }
    }

    // 分析JS链接
    const jsLinks = doc.querySelectorAll('script[src]');
    for (const link of jsLinks) {
      const src = link.getAttribute('src');
      if (src && !src.startsWith('http')) {
        await this.db.query(`
          INSERT INTO dependencies (
            version_id, source_file, target_file, dependency_type, description
          ) VALUES ($1, $2, $3, $4, $5)
        `, [versionId, filePath, src, 'resource', `脚本: ${src}`]);
      }
    }
  }
}

// ============================================================================
// 3. Index Builder - 索引构建协调器
// ============================================================================

class IndexBuilder {
  constructor(db) {
    this.db = db;
    this.htmlIndexer = new HTMLIndexer(db);
    this.dependencyAnalyzer = new DependencyAnalyzer(db);
    this.markerInjector = new SemanticMarkerInjector();
  }

  /**
   * 为一组文件构建完整索引
   */
  async buildIndex(files, versionId) {
    console.log(`[IndexBuilder] 开始为版本 ${versionId} 构建索引...`);
    console.log(`[IndexBuilder] 共 ${files.length} 个文件需要索引`);

    const startTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[IndexBuilder] [${i + 1}/${files.length}] 处理文件: ${file.file_path}`);

      await this.indexFile(file, versionId);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[IndexBuilder] 索引构建完成，耗时 ${duration} 秒`);

    return {
      filesIndexed: files.length,
      duration: duration
    };
  }

  /**
   * 索引单个文件
   */
  async indexFile(file, versionId) {
    const { id: fileId, file_path: filePath, content } = file;

    try {
      // Step 1: 注入语义标记
      console.log(`[IndexBuilder]   -> 注入语义标记...`);
      const markedContent = this.markerInjector.injectMarkers(content);

      // Step 2: 更新文件内容（如果有变化）
      if (markedContent !== content) {
        await this.db.query(`
          UPDATE files
          SET content = $1
          WHERE id = $2
        `, [markedContent, fileId]);
      }

      // Step 3: 索引HTML结构
      console.log(`[IndexBuilder]   -> 索引HTML结构...`);
      await this.htmlIndexer.indexHTML(fileId, markedContent);

      // Step 4: 索引代码片段
      console.log(`[IndexBuilder]   -> 索引代码片段...`);
      await this.htmlIndexer.indexCodeSnippets(fileId, markedContent);

      // Step 5: 分析依赖关系
      console.log(`[IndexBuilder]   -> 分析依赖关系...`);
      await this.dependencyAnalyzer.analyzeDependencies(versionId, filePath, markedContent);

      console.log(`[IndexBuilder]   ✓ ${filePath} 索引完成`);
    } catch (error) {
      console.error(`[IndexBuilder]   ✗ ${filePath} 索引失败:`, error);
      throw error;
    }
  }

  /**
   * 增量更新索引（只更新变化的文件）
   */
  async updateIndex(modifiedFiles, versionId) {
    console.log(`[IndexBuilder] 增量更新索引，${modifiedFiles.length} 个文件已修改`);

    for (const file of modifiedFiles) {
      await this.indexFile(file, versionId);
    }

    console.log(`[IndexBuilder] 增量更新完成`);
  }

  /**
   * 重建整个版本的索引
   */
  async rebuildIndex(versionId) {
    console.log(`[IndexBuilder] 重建版本 ${versionId} 的索引...`);

    // 获取该版本的所有文件
    const filesResult = await this.db.query(`
      SELECT * FROM files WHERE version_id = $1
    `, [versionId]);

    const files = filesResult.rows;

    // 清空旧索引
    await this.clearIndex(versionId);

    // 重新构建
    await this.buildIndex(files, versionId);

    console.log(`[IndexBuilder] 索引重建完成`);
  }

  /**
   * 清空指定版本的索引
   */
  async clearIndex(versionId) {
    console.log(`[IndexBuilder] 清空版本 ${versionId} 的索引...`);

    await this.db.beginTransaction();

    try {
      // 清空AST节点
      await this.db.query(`
        DELETE FROM ast_nodes
        WHERE file_id IN (
          SELECT id FROM files WHERE version_id = $1
        )
      `, [versionId]);

      // 清空语义标记
      await this.db.query(`
        DELETE FROM semantic_markers
        WHERE file_id IN (
          SELECT id FROM files WHERE version_id = $1
        )
      `, [versionId]);

      // 清空代码片段
      await this.db.query(`
        DELETE FROM code_snippets
        WHERE file_id IN (
          SELECT id FROM files WHERE version_id = $1
        )
      `, [versionId]);

      // 清空依赖关系
      await this.db.query(`
        DELETE FROM dependencies WHERE version_id = $1
      `, [versionId]);

      await this.db.commit();
      console.log(`[IndexBuilder] 索引清空完成`);
    } catch (error) {
      await this.db.rollback();
      console.error(`[IndexBuilder] 清空索引失败:`, error);
      throw error;
    }
  }

  /**
   * 获取索引统计信息
   */
  async getIndexStats(versionId) {
    const stats = {};

    // 文件数量
    const filesResult = await this.db.query(`
      SELECT COUNT(*) as count FROM files WHERE version_id = $1
    `, [versionId]);
    stats.files = parseInt(filesResult.rows[0].count);

    // AST节点数量
    const nodesResult = await this.db.query(`
      SELECT COUNT(*) as count FROM ast_nodes
      WHERE file_id IN (SELECT id FROM files WHERE version_id = $1)
    `, [versionId]);
    stats.astNodes = parseInt(nodesResult.rows[0].count);

    // 语义标记数量
    const markersResult = await this.db.query(`
      SELECT COUNT(*) as count FROM semantic_markers
      WHERE file_id IN (SELECT id FROM files WHERE version_id = $1)
    `, [versionId]);
    stats.semanticMarkers = parseInt(markersResult.rows[0].count);

    // 依赖关系数量
    const depsResult = await this.db.query(`
      SELECT COUNT(*) as count FROM dependencies WHERE version_id = $1
    `, [versionId]);
    stats.dependencies = parseInt(depsResult.rows[0].count);

    return stats;
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.HTMLIndexer = HTMLIndexer;
  window.DependencyAnalyzer = DependencyAnalyzer;
  window.IndexBuilder = IndexBuilder;
}
