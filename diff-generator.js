// ============================================================================
// Prompty V2 - Diff Generator & Preview
// 差异生成器和预览功能
// ============================================================================

// ============================================================================
// 1. Diff Generator - 差异生成器
// ============================================================================

class DiffGenerator {
  constructor(db) {
    this.db = db;
  }

  /**
   * 生成修改前后的差异
   */
  async generateDiff(versionId, modifications) {
    console.log(`[DiffGen] 生成 ${modifications.length} 个修改的差异`);

    const diffs = [];

    // 按文件分组
    const modsByFile = this.groupByFile(modifications);

    for (const [filePath, mods] of Object.entries(modsByFile)) {
      const diff = await this.generateFileDiff(versionId, filePath, mods);
      diffs.push(diff);
    }

    return diffs;
  }

  /**
   * 按文件分组修改
   */
  groupByFile(modifications) {
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
   * 生成单个文件的差异
   */
  async generateFileDiff(versionId, filePath, modifications) {
    console.log(`[DiffGen] 生成 ${filePath} 的差异`);

    // 获取原始内容
    const fileResult = await this.db.query(`
      SELECT id, content FROM files
      WHERE version_id = $1 AND file_path = $2
    `, [versionId, filePath]);

    if (fileResult.rows.length === 0) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const originalContent = fileResult.rows[0].content;

    // 模拟应用修改（不保存到数据库）
    const modifiedContent = await this.simulateModifications(originalContent, modifications);

    // 计算差异
    const lineDiff = this.computeLineDiff(originalContent, modifiedContent);

    return {
      filePath,
      originalContent,
      modifiedContent,
      modificationsCount: modifications.length,
      lineDiff,
      stats: {
        linesAdded: lineDiff.filter(d => d.type === 'added').length,
        linesRemoved: lineDiff.filter(d => d.type === 'removed').length,
        linesModified: lineDiff.filter(d => d.type === 'modified').length
      }
    };
  }

  /**
   * 模拟应用修改（不保存）
   */
  async simulateModifications(originalContent, modifications) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(originalContent, 'text/html');

    // 应用每个修改（简化版，实际应该使用 CodeModificationEngine）
    for (const mod of modifications) {
      try {
        this.applyModificationToDOM(doc, mod);
      } catch (error) {
        console.warn('[DiffGen] 模拟修改失败:', error);
      }
    }

    return doc.documentElement.outerHTML;
  }

  /**
   * 应用修改到 DOM（简化版）
   */
  applyModificationToDOM(doc, modification) {
    const { type, target, changes } = modification;

    let element = null;

    // 查找元素
    if (target.selector) {
      element = doc.querySelector(target.selector);
    } else if (target.semantic_id) {
      element = doc.querySelector(`[data-semantic-id="${target.semantic_id}"]`);
    }

    if (!element) return;

    // 应用修改
    switch (type) {
      case 'setStyle':
        for (const [prop, value] of Object.entries(changes)) {
          element.style[prop] = value;
        }
        break;

      case 'setAttribute':
        for (const [attr, value] of Object.entries(changes)) {
          element.setAttribute(attr, value);
        }
        break;

      case 'setContent':
        if (changes.textContent !== undefined) {
          element.textContent = changes.textContent;
        }
        break;

      case 'delete':
        element.remove();
        break;
    }
  }

  /**
   * 计算行级差异
   */
  computeLineDiff(original, modified) {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    const diff = [];
    let i = 0, j = 0;

    while (i < originalLines.length || j < modifiedLines.length) {
      const origLine = originalLines[i] || '';
      const modLine = modifiedLines[j] || '';

      if (i >= originalLines.length) {
        // 新增行
        diff.push({
          type: 'added',
          line: j + 1,
          content: modLine
        });
        j++;
      } else if (j >= modifiedLines.length) {
        // 删除行
        diff.push({
          type: 'removed',
          line: i + 1,
          content: origLine
        });
        i++;
      } else if (origLine === modLine) {
        // 相同行
        diff.push({
          type: 'unchanged',
          line: i + 1,
          content: origLine
        });
        i++;
        j++;
      } else {
        // 修改的行
        diff.push({
          type: 'modified',
          line: i + 1,
          oldContent: origLine,
          newContent: modLine
        });
        i++;
        j++;
      }
    }

    return diff;
  }

  /**
   * 生成统一差异格式（类似 git diff）
   */
  generateUnifiedDiff(original, modified, filePath = 'file') {
    let unifiedDiff = `--- a/${filePath}\n`;
    unifiedDiff += `+++ b/${filePath}\n`;

    const diff = this.computeLineDiff(original, modified);

    let currentChunk = [];
    let chunkStart = 0;

    for (let i = 0; i < diff.length; i++) {
      const item = diff[i];

      if (item.type !== 'unchanged') {
        if (currentChunk.length === 0) {
          chunkStart = item.line;
        }
        currentChunk.push(item);
      } else if (currentChunk.length > 0) {
        // 输出当前块
        unifiedDiff += this.formatChunk(currentChunk, chunkStart);
        currentChunk = [];
      }
    }

    // 输出最后一块
    if (currentChunk.length > 0) {
      unifiedDiff += this.formatChunk(currentChunk, chunkStart);
    }

    return unifiedDiff;
  }

  /**
   * 格式化差异块
   */
  formatChunk(chunk, start) {
    let output = `@@ -${start},${chunk.length} +${start},${chunk.length} @@\n`;

    for (const item of chunk) {
      if (item.type === 'added') {
        output += `+ ${item.content}\n`;
      } else if (item.type === 'removed') {
        output += `- ${item.content}\n`;
      } else if (item.type === 'modified') {
        output += `- ${item.oldContent}\n`;
        output += `+ ${item.newContent}\n`;
      } else {
        output += `  ${item.content}\n`;
      }
    }

    return output;
  }
}

// ============================================================================
// 2. Preview Generator - 预览生成器
// ============================================================================

class PreviewGenerator {
  constructor(diffGenerator) {
    this.diffGen = diffGenerator;
  }

  /**
   * 生成 HTML 预览
   */
  async generateHTMLPreview(versionId, modifications) {
    console.log('[PreviewGen] 生成 HTML 预览');

    const diffs = await this.diffGen.generateDiff(versionId, modifications);

    let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>修改预览</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        .header h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .stats {
            color: #666;
            font-size: 14px;
        }
        .stats span {
            margin-right: 20px;
        }
        .stats .added { color: #22863a; }
        .stats .removed { color: #cb2431; }
        .stats .modified { color: #e36209; }
        .file-diff {
            border-bottom: 1px solid #e0e0e0;
        }
        .file-header {
            padding: 15px 20px;
            background: #f6f8fa;
            font-weight: 600;
            color: #24292e;
        }
        .diff-viewer {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
        }
        .diff-line {
            padding: 2px 10px;
            white-space: pre-wrap;
            line-height: 1.5;
        }
        .diff-line.added {
            background: #e6ffed;
            color: #22863a;
        }
        .diff-line.removed {
            background: #ffeef0;
            color: #cb2431;
        }
        .diff-line.modified {
            background: #fff5e6;
            color: #e36209;
        }
        .diff-line.unchanged {
            background: white;
            color: #586069;
        }
        .line-number {
            display: inline-block;
            width: 50px;
            color: #999;
            user-select: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 修改预览</h1>
            <div class="stats">
                <span>共 ${diffs.length} 个文件</span>
                <span class="added">+ ${this.getTotalStats(diffs).added} 行新增</span>
                <span class="removed">- ${this.getTotalStats(diffs).removed} 行删除</span>
                <span class="modified">~ ${this.getTotalStats(diffs).modified} 行修改</span>
            </div>
        </div>
`;

    for (const diff of diffs) {
      html += this.generateFileDiffHTML(diff);
    }

    html += `
    </div>
</body>
</html>
`;

    return html;
  }

  /**
   * 生成单个文件的差异 HTML
   */
  generateFileDiffHTML(diff) {
    let html = `
        <div class="file-diff">
            <div class="file-header">
                📄 ${diff.filePath}
                <span style="color: #666; font-weight: normal; margin-left: 10px;">
                    +${diff.stats.linesAdded} -${diff.stats.linesRemoved} ~${diff.stats.linesModified}
                </span>
            </div>
            <div class="diff-viewer">
`;

    for (const line of diff.lineDiff) {
      if (line.type === 'modified') {
        html += `
                <div class="diff-line removed">
                    <span class="line-number">${line.line}</span>
                    <span>- ${this.escapeHTML(line.oldContent)}</span>
                </div>
                <div class="diff-line added">
                    <span class="line-number">${line.line}</span>
                    <span>+ ${this.escapeHTML(line.newContent)}</span>
                </div>
`;
      } else {
        const prefix = line.type === 'added' ? '+ ' :
                      line.type === 'removed' ? '- ' : '  ';

        html += `
                <div class="diff-line ${line.type}">
                    <span class="line-number">${line.line || ''}</span>
                    <span>${prefix}${this.escapeHTML(line.content || line.oldContent || '')}</span>
                </div>
`;
      }
    }

    html += `
            </div>
        </div>
`;

    return html;
  }

  /**
   * 转义 HTML
   */
  escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 计算总体统计
   */
  getTotalStats(diffs) {
    return diffs.reduce((acc, diff) => {
      acc.added += diff.stats.linesAdded;
      acc.removed += diff.stats.linesRemoved;
      acc.modified += diff.stats.linesModified;
      return acc;
    }, { added: 0, removed: 0, modified: 0 });
  }

  /**
   * 生成简化的文本预览
   */
  generateTextPreview(versionId, modifications) {
    let preview = '修改预览\n';
    preview += '='.repeat(60) + '\n\n';

    preview += `共 ${modifications.length} 个修改操作:\n\n`;

    for (let i = 0; i < modifications.length; i++) {
      const mod = modifications[i];
      preview += `${i + 1}. ${mod.type} - ${mod.target.file_path}\n`;

      if (mod.type === 'setStyle') {
        preview += `   样式: ${JSON.stringify(mod.changes)}\n`;
      } else if (mod.type === 'setAttribute') {
        preview += `   属性: ${JSON.stringify(mod.changes)}\n`;
      }

      preview += '\n';
    }

    return preview;
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.DiffGenerator = DiffGenerator;
  window.PreviewGenerator = PreviewGenerator;
}
