// ============================================================================
// Prompty V2 - Code Modification Engine
// 代码修改引擎 - 支持批量、事务性的代码修改
// ============================================================================

// ============================================================================
// 1. Code Modification Engine - 代码修改引擎
// ============================================================================

class CodeModificationEngine {
  constructor(db, parserManager) {
    this.db = db;
    this.parser = parserManager;
    this.pendingModifications = [];
    this.appliedModifications = [];
  }

  /**
   * 添加修改操作到队列
   */
  addModification(modification) {
    console.log('[ModEngine] 添加修改操作:', modification.type);

    // 验证修改操作
    this.validateModification(modification);

    this.pendingModifications.push({
      ...modification,
      id: this.generateModificationId(),
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return this.pendingModifications[this.pendingModifications.length - 1];
  }

  /**
   * 验证修改操作
   */
  validateModification(modification) {
    const required = ['type', 'target'];

    for (const field of required) {
      if (!modification[field]) {
        throw new Error(`修改操作缺少必需字段: ${field}`);
      }
    }

    const validTypes = ['replace', 'insert', 'delete', 'setAttribute', 'setStyle', 'setContent'];
    if (!validTypes.includes(modification.type)) {
      throw new Error(`无效的修改类型: ${modification.type}`);
    }

    return true;
  }

  /**
   * 生成修改操作 ID
   */
  generateModificationId() {
    return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 执行所有待处理的修改
   */
  async applyModifications(versionId) {
    console.log(`[ModEngine] 开始应用 ${this.pendingModifications.length} 个修改操作`);

    if (this.pendingModifications.length === 0) {
      throw new Error('没有待处理的修改操作');
    }

    const results = [];

    // 按文件分组
    const modsByFile = this.groupModificationsByFile(this.pendingModifications);

    for (const [filePath, mods] of Object.entries(modsByFile)) {
      console.log(`[ModEngine] 处理文件: ${filePath}，${mods.length} 个修改`);

      try {
        const result = await this.applyFileModifications(versionId, filePath, mods);
        results.push(result);
      } catch (error) {
        console.error(`[ModEngine] 文件 ${filePath} 修改失败:`, error);
        throw error;
      }
    }

    // 标记为已应用
    this.appliedModifications.push(...this.pendingModifications);
    this.pendingModifications = [];

    console.log(`[ModEngine] 所有修改应用完成`);
    return results;
  }

  /**
   * 按文件分组修改操作
   */
  groupModificationsByFile(modifications) {
    const grouped = {};

    for (const mod of modifications) {
      const filePath = mod.target.file_path;

      if (!grouped[filePath]) {
        grouped[filePath] = [];
      }

      grouped[filePath].push(mod);
    }

    return grouped;
  }

  /**
   * 应用单个文件的所有修改
   */
  async applyFileModifications(versionId, filePath, modifications) {
    console.log(`[ModEngine] 应用 ${filePath} 的 ${modifications.length} 个修改`);

    // 1. 获取文件内容
    const fileResult = await this.db.query(`
      SELECT id, content FROM files
      WHERE version_id = $1 AND file_path = $2
    `, [versionId, filePath]);

    if (fileResult.rows.length === 0) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const fileId = fileResult.rows[0].id;
    let content = fileResult.rows[0].content;
    const originalContent = content;

    // 2. 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // 3. 应用每个修改
    for (const mod of modifications) {
      try {
        this.applyModificationToDOM(doc, mod);
      } catch (error) {
        console.error(`[ModEngine] 修改 ${mod.id} 失败:`, error);
        throw error;
      }
    }

    // 4. 序列化回 HTML
    const modifiedContent = this.serializeDOM(doc);

    // 5. 更新数据库
    await this.db.query(`
      UPDATE files
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [modifiedContent, fileId]);

    console.log(`[ModEngine] 文件 ${filePath} 更新成功`);

    return {
      filePath,
      fileId,
      modificationsCount: modifications.length,
      originalSize: originalContent.length,
      modifiedSize: modifiedContent.length,
      success: true
    };
  }

  /**
   * 应用单个修改到 DOM
   */
  applyModificationToDOM(doc, modification) {
    const { type, target, changes } = modification;

    // 查找目标元素
    const element = this.findTargetElement(doc, target);

    if (!element) {
      throw new Error(`未找到目标元素: ${JSON.stringify(target)}`);
    }

    console.log(`[ModEngine] 应用修改 ${type} 到 ${element.tagName}`);

    // 根据类型应用修改
    switch (type) {
      case 'setStyle':
        this.applyStyleModification(element, changes);
        break;

      case 'setAttribute':
        this.applyAttributeModification(element, changes);
        break;

      case 'setContent':
        this.applyContentModification(element, changes);
        break;

      case 'replace':
        this.applyReplaceModification(element, changes);
        break;

      case 'insert':
        this.applyInsertModification(element, changes);
        break;

      case 'delete':
        this.applyDeleteModification(element);
        break;

      default:
        throw new Error(`未实现的修改类型: ${type}`);
    }
  }

  /**
   * 查找目标元素
   */
  findTargetElement(doc, target) {
    // 1. 尝试通过 semantic_id 查找
    if (target.semantic_id) {
      const element = doc.querySelector(`[data-semantic-id="${target.semantic_id}"]`);
      if (element) return element;
    }

    // 2. 尝试通过 node_id 查找（需要之前注入的标记）
    if (target.node_id) {
      const element = doc.querySelector(`[data-node-id="${target.node_id}"]`);
      if (element) return element;
    }

    // 3. 尝试通过 CSS 选择器查找
    if (target.selector) {
      const element = doc.querySelector(target.selector);
      if (element) return element;
    }

    // 4. 尝试通过位置查找（标签名 + 索引）
    if (target.tag_name && target.index !== undefined) {
      const elements = doc.querySelectorAll(target.tag_name);
      return elements[target.index];
    }

    return null;
  }

  /**
   * 应用样式修改
   */
  applyStyleModification(element, changes) {
    console.log('[ModEngine] 应用样式修改:', changes);

    for (const [property, value] of Object.entries(changes)) {
      // 转换 CSS 属性名（background -> background）
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      element.style[property] = value;
    }
  }

  /**
   * 应用属性修改
   */
  applyAttributeModification(element, changes) {
    console.log('[ModEngine] 应用属性修改:', changes);

    for (const [attr, value] of Object.entries(changes)) {
      if (value === null || value === undefined) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, value);
      }
    }
  }

  /**
   * 应用内容修改
   */
  applyContentModification(element, changes) {
    console.log('[ModEngine] 应用内容修改');

    if (changes.textContent !== undefined) {
      element.textContent = changes.textContent;
    }

    if (changes.innerHTML !== undefined) {
      element.innerHTML = changes.innerHTML;
    }
  }

  /**
   * 应用替换修改
   */
  applyReplaceModification(element, changes) {
    console.log('[ModEngine] 应用替换修改');

    if (changes.newHTML) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = changes.newHTML;
      const newElement = tempDiv.firstElementChild;

      if (newElement) {
        element.parentNode.replaceChild(newElement, element);
      }
    }
  }

  /**
   * 应用插入修改
   */
  applyInsertModification(element, changes) {
    console.log('[ModEngine] 应用插入修改');

    const { position = 'beforeend', html } = changes;

    if (html) {
      element.insertAdjacentHTML(position, html);
    }
  }

  /**
   * 应用删除修改
   */
  applyDeleteModification(element) {
    console.log('[ModEngine] 应用删除修改');

    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * 序列化 DOM 回 HTML
   */
  serializeDOM(doc) {
    // 清理临时属性
    const elementsWithNodeId = doc.querySelectorAll('[data-node-id]');
    for (const el of elementsWithNodeId) {
      el.removeAttribute('data-node-id');
    }

    // 返回格式化的 HTML
    return this.formatHTML(doc.documentElement.outerHTML);
  }

  /**
   * 格式化 HTML
   */
  formatHTML(html) {
    // 简单的格式化，实际项目可以使用专门的库
    return html
      .replace(/>\s+</g, '>\n<')
      .replace(/(<\/[^>]+>)(<[^\/])/g, '$1\n$2');
  }

  /**
   * 清空待处理的修改
   */
  clearPendingModifications() {
    this.pendingModifications = [];
    console.log('[ModEngine] 已清空待处理的修改');
  }

  /**
   * 获取修改统计
   */
  getStats() {
    return {
      pending: this.pendingModifications.length,
      applied: this.appliedModifications.length,
      total: this.pendingModifications.length + this.appliedModifications.length
    };
  }
}

// ============================================================================
// 2. Modification Builder - 修改构建器（辅助类）
// ============================================================================

class ModificationBuilder {
  constructor() {
    this.modification = {
      type: null,
      target: {},
      changes: {}
    };
  }

  /**
   * 设置修改类型
   */
  type(type) {
    this.modification.type = type;
    return this;
  }

  /**
   * 设置目标（通过文件路径和选择器）
   */
  target(filePath, selector) {
    this.modification.target = {
      file_path: filePath,
      selector: selector
    };
    return this;
  }

  /**
   * 设置目标（通过匹配对象）
   */
  targetFromMatch(match) {
    this.modification.target = {
      file_path: match.file_path,
      node_id: match.node_id,
      semantic_id: match.semantic_id,
      tag_name: match.tag_name,
      start_line: match.start_line
    };
    return this;
  }

  /**
   * 设置样式修改
   */
  setStyle(styles) {
    this.modification.type = 'setStyle';
    this.modification.changes = styles;
    return this;
  }

  /**
   * 设置属性修改
   */
  setAttribute(attributes) {
    this.modification.type = 'setAttribute';
    this.modification.changes = attributes;
    return this;
  }

  /**
   * 设置内容修改
   */
  setContent(content) {
    this.modification.type = 'setContent';
    this.modification.changes = content;
    return this;
  }

  /**
   * 设置删除操作
   */
  delete() {
    this.modification.type = 'delete';
    this.modification.changes = {};
    return this;
  }

  /**
   * 构建修改对象
   */
  build() {
    return { ...this.modification };
  }
}

// ============================================================================
// 3. Batch Modification Helper - 批量修改辅助器
// ============================================================================

class BatchModificationHelper {
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * 从查询结果创建批量修改
   */
  async createBatchModifications(matches, modificationType, changes) {
    console.log(`[BatchHelper] 为 ${matches.length} 个匹配创建批量修改`);

    const modifications = [];

    for (const match of matches) {
      const builder = new ModificationBuilder()
        .targetFromMatch(match)
        .type(modificationType);

      // 设置修改内容
      builder.modification.changes = changes;

      const mod = builder.build();
      this.engine.addModification(mod);
      modifications.push(mod);
    }

    console.log(`[BatchHelper] 创建了 ${modifications.length} 个修改操作`);
    return modifications;
  }

  /**
   * 应用样式到所有匹配
   */
  async applyStyleToAll(matches, styles) {
    return await this.createBatchModifications(matches, 'setStyle', styles);
  }

  /**
   * 应用属性到所有匹配
   */
  async applyAttributeToAll(matches, attributes) {
    return await this.createBatchModifications(matches, 'setAttribute', attributes);
  }

  /**
   * 应用内容到所有匹配
   */
  async applyContentToAll(matches, content) {
    return await this.createBatchModifications(matches, 'setContent', content);
  }

  /**
   * 删除所有匹配
   */
  async deleteAll(matches) {
    return await this.createBatchModifications(matches, 'delete', {});
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.CodeModificationEngine = CodeModificationEngine;
  window.ModificationBuilder = ModificationBuilder;
  window.BatchModificationHelper = BatchModificationHelper;
}
