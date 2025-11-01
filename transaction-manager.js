// ============================================================================
// Prompty V2 - Transaction Manager & Dependency Resolver
// 事务管理器和依赖解析器
// ============================================================================

// ============================================================================
// 1. Transaction Manager - 事务管理器
// ============================================================================

class TransactionManager {
  constructor(db, indexBuilder) {
    this.db = db;
    this.indexBuilder = indexBuilder;
    this.transactions = [];
    this.currentTransaction = null;
  }

  /**
   * 开始新事务
   */
  async beginTransaction(description) {
    console.log(`[Transaction] 开始新事务: ${description}`);

    const transaction = {
      id: this.generateTransactionId(),
      description,
      status: 'active',
      modifications: [],
      snapshots: new Map(), // file_id -> original_content
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    this.currentTransaction = transaction;
    this.transactions.push(transaction);

    // 开始数据库事务
    await this.db.beginTransaction();

    return transaction;
  }

  /**
   * 生成事务 ID
   */
  generateTransactionId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录文件快照（用于回滚）
   */
  async captureFileSnapshot(fileId) {
    if (!this.currentTransaction) {
      throw new Error('没有活动的事务');
    }

    // 如果已经记录过，跳过
    if (this.currentTransaction.snapshots.has(fileId)) {
      return;
    }

    console.log(`[Transaction] 记录文件快照: ${fileId}`);

    const result = await this.db.query(`
      SELECT content FROM files WHERE id = $1
    `, [fileId]);

    if (result.rows.length > 0) {
      this.currentTransaction.snapshots.set(fileId, result.rows[0].content);
    }
  }

  /**
   * 添加修改到当前事务
   */
  addModification(modification) {
    if (!this.currentTransaction) {
      throw new Error('没有活动的事务');
    }

    this.currentTransaction.modifications.push(modification);
  }

  /**
   * 提交事务
   */
  async commit() {
    if (!this.currentTransaction) {
      throw new Error('没有活动的事务');
    }

    console.log(`[Transaction] 提交事务: ${this.currentTransaction.id}`);

    try {
      // 提交数据库事务
      await this.db.commit();

      // 标记为已完成
      this.currentTransaction.status = 'committed';
      this.currentTransaction.completedAt = new Date().toISOString();

      console.log(`[Transaction] 事务提交成功，修改了 ${this.currentTransaction.modifications.length} 处`);

      const transaction = this.currentTransaction;
      this.currentTransaction = null;

      return transaction;

    } catch (error) {
      console.error('[Transaction] 提交失败:', error);
      await this.rollback();
      throw error;
    }
  }

  /**
   * 回滚事务
   */
  async rollback() {
    if (!this.currentTransaction) {
      throw new Error('没有活动的事务');
    }

    console.log(`[Transaction] 回滚事务: ${this.currentTransaction.id}`);

    try {
      // 回滚数据库事务
      await this.db.rollback();

      // 恢复文件内容
      for (const [fileId, originalContent] of this.currentTransaction.snapshots) {
        console.log(`[Transaction] 恢复文件: ${fileId}`);
        await this.db.query(`
          UPDATE files SET content = $1 WHERE id = $2
        `, [originalContent, fileId]);
      }

      // 标记为已回滚
      this.currentTransaction.status = 'rolled_back';
      this.currentTransaction.completedAt = new Date().toISOString();

      console.log('[Transaction] 事务回滚成功');

      this.currentTransaction = null;

    } catch (error) {
      console.error('[Transaction] 回滚失败:', error);
      throw error;
    }
  }

  /**
   * 获取事务历史
   */
  getHistory() {
    return this.transactions;
  }

  /**
   * 获取当前事务
   */
  getCurrentTransaction() {
    return this.currentTransaction;
  }
}

// ============================================================================
// 2. Dependency Resolver - 依赖解析器
// ============================================================================

class DependencyResolver {
  constructor(db) {
    this.db = db;
  }

  /**
   * 解析修改的影响范围
   */
  async resolveImpact(modifications, versionId) {
    console.log(`[DependencyResolver] 分析 ${modifications.length} 个修改的影响范围`);

    const impact = {
      directFiles: new Set(),
      dependentFiles: new Set(),
      affectedDependencies: [],
      suggestions: []
    };

    // 收集直接影响的文件
    for (const mod of modifications) {
      impact.directFiles.add(mod.target.file_path);
    }

    // 分析依赖关系
    for (const filePath of impact.directFiles) {
      const deps = await this.getFileDependencies(versionId, filePath);

      for (const dep of deps) {
        impact.dependentFiles.add(dep.source_file);
        impact.affectedDependencies.push(dep);
      }
    }

    // 生成建议
    impact.suggestions = await this.generateSuggestions(modifications, impact, versionId);

    console.log(`[DependencyResolver] 影响分析完成:`);
    console.log(`  - 直接影响文件: ${impact.directFiles.size}`);
    console.log(`  - 间接影响文件: ${impact.dependentFiles.size}`);
    console.log(`  - 建议操作: ${impact.suggestions.length}`);

    return impact;
  }

  /**
   * 获取文件的依赖关系
   */
  async getFileDependencies(versionId, filePath) {
    const result = await this.db.query(`
      SELECT * FROM dependencies
      WHERE version_id = $1 AND target_file = $2
    `, [versionId, filePath]);

    return result.rows;
  }

  /**
   * 生成修改建议
   */
  async generateSuggestions(modifications, impact, versionId) {
    const suggestions = [];

    // 检查是否需要更新导航
    const hasNavModification = modifications.some(mod =>
      mod.target.tag_name === 'nav' ||
      mod.target.semantic_type === 'navigation'
    );

    if (hasNavModification && impact.dependentFiles.size > 0) {
      suggestions.push({
        type: 'update_navigation',
        description: '检测到导航修改，建议同步更新所有页面的导航',
        affectedFiles: Array.from(impact.dependentFiles),
        priority: 'high'
      });
    }

    // 检查是否有删除操作
    const hasDeleteModification = modifications.some(mod => mod.type === 'delete');

    if (hasDeleteModification) {
      suggestions.push({
        type: 'check_broken_links',
        description: '检测到删除操作，建议检查是否有断开的链接',
        priority: 'medium'
      });
    }

    // 检查样式修改
    const hasStyleModification = modifications.some(mod => mod.type === 'setStyle');

    if (hasStyleModification && impact.dependentFiles.size > 1) {
      suggestions.push({
        type: 'consider_css_class',
        description: '检测到多文件样式修改，建议考虑使用 CSS class 统一管理',
        priority: 'low'
      });
    }

    return suggestions;
  }

  /**
   * 自动解决导航更新
   */
  async autoUpdateNavigation(versionId, newNavHTML) {
    console.log('[DependencyResolver] 自动更新所有页面的导航');

    // 获取所有文件
    const filesResult = await this.db.query(`
      SELECT id, file_path, content FROM files
      WHERE version_id = $1
    `, [versionId]);

    const modifications = [];

    for (const file of filesResult.rows) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(file.content, 'text/html');

      // 查找导航元素
      const navElements = doc.querySelectorAll('nav, [role="navigation"]');

      if (navElements.length > 0) {
        modifications.push({
          type: 'replace',
          target: {
            file_path: file.file_path,
            selector: 'nav, [role="navigation"]'
          },
          changes: {
            newHTML: newNavHTML
          }
        });
      }
    }

    console.log(`[DependencyResolver] 生成了 ${modifications.length} 个导航更新操作`);
    return modifications;
  }

  /**
   * 检查断开的链接
   */
  async checkBrokenLinks(versionId, deletedFiles) {
    console.log('[DependencyResolver] 检查断开的链接');

    const brokenLinks = [];

    for (const deletedFile of deletedFiles) {
      const deps = await this.db.query(`
        SELECT * FROM dependencies
        WHERE version_id = $1
          AND target_file = $2
          AND dependency_type IN ('navigation', 'link')
      `, [versionId, deletedFile]);

      for (const dep of deps.rows) {
        brokenLinks.push({
          sourceFile: dep.source_file,
          targetFile: dep.target_file,
          type: dep.dependency_type,
          description: dep.description
        });
      }
    }

    console.log(`[DependencyResolver] 发现 ${brokenLinks.length} 个断开的链接`);
    return brokenLinks;
  }
}

// ============================================================================
// 3. Modification Validator - 修改验证器
// ============================================================================

class ModificationValidator {
  constructor(db) {
    this.db = db;
  }

  /**
   * 验证修改操作
   */
  async validateModifications(modifications, versionId) {
    console.log(`[Validator] 验证 ${modifications.length} 个修改操作`);

    const issues = [];

    for (const mod of modifications) {
      // 验证目标文件存在
      const fileExists = await this.checkFileExists(versionId, mod.target.file_path);

      if (!fileExists) {
        issues.push({
          modification: mod.id,
          severity: 'error',
          message: `目标文件不存在: ${mod.target.file_path}`
        });
      }

      // 验证修改类型特定的规则
      const typeIssues = await this.validateModificationType(mod);
      issues.push(...typeIssues);
    }

    console.log(`[Validator] 发现 ${issues.length} 个问题`);
    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  /**
   * 检查文件是否存在
   */
  async checkFileExists(versionId, filePath) {
    const result = await this.db.query(`
      SELECT id FROM files
      WHERE version_id = $1 AND file_path = $2
    `, [versionId, filePath]);

    return result.rows.length > 0;
  }

  /**
   * 验证特定类型的修改
   */
  async validateModificationType(modification) {
    const issues = [];

    switch (modification.type) {
      case 'setStyle':
        if (!modification.changes || Object.keys(modification.changes).length === 0) {
          issues.push({
            modification: modification.id,
            severity: 'error',
            message: '样式修改缺少 changes 字段'
          });
        }
        break;

      case 'setAttribute':
        if (!modification.changes || Object.keys(modification.changes).length === 0) {
          issues.push({
            modification: modification.id,
            severity: 'error',
            message: '属性修改缺少 changes 字段'
          });
        }
        break;

      case 'replace':
        if (!modification.changes?.newHTML) {
          issues.push({
            modification: modification.id,
            severity: 'error',
            message: '替换修改缺少 newHTML 字段'
          });
        }
        break;
    }

    return issues;
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.TransactionManager = TransactionManager;
  window.DependencyResolver = DependencyResolver;
  window.ModificationValidator = ModificationValidator;
}
