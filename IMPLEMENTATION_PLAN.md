# Prompty V2 实施计划

> 基于V2方案的详细开发计划

---

## 📅 总体时间规划

**预计总工期：9-10周**

| 阶段 | 时间 | 任务 | 优先级 |
|------|------|------|--------|
| **Phase 1** | 2-3周 | 基础设施搭建 | 🔴 P0 |
| **Phase 2** | 2周 | 代码定位引擎 | 🔴 P0 |
| **Phase 3** | 2周 | 批量修改引擎 | 🔴 P0 |
| **Phase 4** | 2周 | UI与交互 | 🟡 P1 |
| **Phase 5** | 1-2周 | 优化与测试 | 🟢 P2 |

---

## 🏗️ Phase 1: 基础设施（2-3周）

### 目标
搭建V2方案的核心基础设施，包括数据库、AST解析器、基础索引系统。

### 任务清单

#### 1.1 项目结构改造 (2天)
- [ ] 创建新的目录结构
- [ ] 设置模块化架构
- [ ] 配置构建工具（如果需要）
- [ ] 保留原有功能的兼容性

**产出：**
```
prompty-v2/
├── index.html (主入口，保持单文件)
├── lib/
│   ├── database/      # 数据库相关
│   ├── parser/        # AST解析相关
│   ├── indexer/       # 索引构建相关
│   ├── locator/       # 代码定位相关
│   ├── modifier/      # 代码修改相关
│   └── ui/            # UI组件相关
└── assets/
    └── wasm/          # Tree-sitter WASM文件
```

#### 1.2 集成 PGlite (3天)
- [ ] 引入PGlite库（CDN或本地）
- [ ] 封装数据库操作类 `DatabaseManager`
- [ ] 实现数据库初始化
- [ ] 实现持久化存储（IndexedDB后端）
- [ ] 编写单元测试

**核心代码：**
```javascript
class DatabaseManager {
  async init() {
    // 初始化PGlite
    this.db = new PGlite('idb://prompty-v2-db');
    await this.createSchema();
  }

  async createSchema() {
    // 创建所有表
  }

  async query(sql, params) {
    // 执行查询
  }
}
```

#### 1.3 设计数据库Schema (2天)
- [ ] 设计文件表 (files)
- [ ] 设计AST节点表 (ast_nodes)
- [ ] 设计代码片段表 (code_snippets)
- [ ] 设计依赖关系表 (dependencies)
- [ ] 设计语义标记表 (semantic_markers)
- [ ] 设计版本表 (versions)
- [ ] 创建索引和约束
- [ ] 编写migration脚本

**产出：** `schema.sql`

#### 1.4 集成 web-tree-sitter (3天)
- [ ] 引入web-tree-sitter库
- [ ] 下载HTML/CSS/JavaScript解析器WASM
- [ ] 封装解析器类 `TreeSitterParser`
- [ ] 实现懒加载机制
- [ ] 实现解析器缓存
- [ ] 编写测试用例

**核心代码：**
```javascript
class TreeSitterParser {
  async init() {
    await Parser.init();
    this.parser = new Parser();
  }

  async loadLanguage(lang) {
    // 懒加载特定语言
  }

  async parse(code, language) {
    // 解析代码返回AST
  }
}
```

#### 1.5 实现基础索引构建 (4天)
- [ ] 实现HTML结构索引 `HTMLIndexer`
- [ ] 实现内嵌CSS索引 `CSSIndexer`
- [ ] 实现内嵌JS索引 `JSIndexer`
- [ ] 实现语义标记注入 `SemanticMarkerInjector`
- [ ] 实现索引构建协调器 `IndexBuilder`
- [ ] 支持增量索引更新
- [ ] 编写测试用例

**核心代码：**
```javascript
class IndexBuilder {
  async buildIndex(files, versionId) {
    for (const file of files) {
      await this.indexFile(file, versionId);
    }
  }

  async indexFile(file, versionId) {
    // 索引单个文件
  }
}
```

#### 1.6 迁移现有功能 (3天)
- [ ] 迁移API Key管理
- [ ] 迁移模型选择
- [ ] 保持原有UI不变
- [ ] 确保向后兼容

### Phase 1 验收标准
- [x] PGlite数据库成功初始化
- [x] 可以解析HTML/CSS/JS文件
- [x] 可以将解析结果存入数据库
- [x] 可以查询数据库获取AST节点
- [x] 原有功能不受影响

---

## 🎯 Phase 2: 代码定位引擎（2周）

### 目标
实现自然语言到代码定位的完整流程。

### 任务清单

#### 2.1 自然语言理解引擎 (4天)
- [ ] 实现意图提取 `IntentExtractor`
- [ ] 实现关键词提取
- [ ] 实现查询策略生成器
- [ ] 集成LLM API调用
- [ ] 实现结果缓存
- [ ] 编写测试用例

**核心代码：**
```javascript
class NaturalLanguageQueryEngine {
  async parseNaturalLanguage(userInput, versionId) {
    const intent = await this.extractIntent(userInput);
    const strategies = await this.generateQueryStrategies(intent);
    const results = await this.executeStrategies(strategies);
    return this.mergeAndRank(results);
  }
}
```

#### 2.2 SQL查询定位器 (2天)
- [ ] 实现标签名查询
- [ ] 实现类名查询
- [ ] 实现语义标记查询
- [ ] 实现全文搜索
- [ ] 优化查询性能
- [ ] 编写测试用例

#### 2.3 Tree-sitter Query定位器 (3天)
- [ ] 实现Tree-sitter Query生成器
- [ ] 实现Query执行器
- [ ] 支持复杂模式匹配
- [ ] 实现结果格式化
- [ ] 编写测试用例

#### 2.4 多匹配处理器 (2天)
- [ ] 实现范围分析
- [ ] 实现LLM消歧
- [ ] 实现确认策略生成
- [ ] 编写测试用例

#### 2.5 三级定位协调器 (1天)
- [ ] 实现定位策略选择
- [ ] 实现降级机制
- [ ] 实现结果合并

### Phase 2 验收标准
- [x] 可以将自然语言转换为查询
- [x] SQL查询可以找到代码位置
- [x] Tree-sitter Query可以精确匹配
- [x] 多匹配场景可以正确处理
- [x] 整体准确率 > 90%

---

## ✏️ Phase 3: 批量修改引擎（2周）

### 目标
实现多文件多位置的批量代码修改。

### 任务清单

#### 3.1 代码修改生成器 (3天)
- [ ] 实现单个位置修改生成
- [ ] 实现批量修改生成
- [ ] 集成LLM代码生成
- [ ] 实现代码格式保持
- [ ] 编写测试用例

#### 3.2 批量修改应用器 (3天)
- [ ] 实现事务式修改
- [ ] 实现冲突检测
- [ ] 实现回滚机制
- [ ] 实现文件内容更新
- [ ] 编写测试用例

#### 3.3 增量索引更新 (2天)
- [ ] 实现修改文件的索引重建
- [ ] 优化索引更新性能
- [ ] 确保索引一致性

#### 3.4 依赖分析引擎 (3天)
- [ ] 实现依赖图构建
- [ ] 实现影响分析
- [ ] 实现自动修复建议
- [ ] 编写测试用例

#### 3.5 版本管理增强 (1天)
- [ ] 实现版本快照创建
- [ ] 实现版本对比
- [ ] 实现版本回滚

### Phase 3 验收标准
- [x] 可以批量修改多个文件
- [x] 修改是事务性的（全部成功或全部失败）
- [x] 索引可以增量更新
- [x] 依赖关系可以正确分析
- [x] 版本管理功能正常

---

## 🎨 Phase 4: UI与交互（2周）

### 目标
实现用户友好的交互界面。

### 任务清单

#### 4.1 主界面改造 (3天)
- [ ] 设计新的布局
- [ ] 添加需求输入框
- [ ] 添加页面列表面板
- [ ] 添加预览区域
- [ ] 添加版本历史面板

#### 4.2 影响分析面板 (2天)
- [ ] 显示修改影响的文件
- [ ] 显示具体修改位置
- [ ] 支持展开/折叠
- [ ] 支持单独查看

#### 4.3 Diff预览功能 (3天)
- [ ] 实现并排diff显示
- [ ] 支持语法高亮
- [ ] 支持单个应用/跳过
- [ ] 实现实时预览

#### 4.4 多匹配确认界面 (2天)
- [ ] 实现匹配列表显示
- [ ] 支持单选/多选
- [ ] 显示LLM推荐
- [ ] 显示置信度

#### 4.5 版本管理UI (2天)
- [ ] 实现版本列表
- [ ] 实现版本对比视图
- [ ] 实现版本切换
- [ ] 实现版本回滚确认

### Phase 4 验收标准
- [x] UI界面美观易用
- [x] 影响分析清晰直观
- [x] Diff预览功能正常
- [x] 多匹配确认流程顺畅
- [x] 版本管理UI完善

---

## 🚀 Phase 5: 优化与测试（1-2周）

### 目标
优化性能，完善测试，准备发布。

### 任务清单

#### 5.1 性能优化 (3天)
- [ ] 数据库查询优化
- [ ] 索引构建优化
- [ ] LLM调用优化（缓存）
- [ ] 大文件处理优化
- [ ] 懒加载优化

#### 5.2 错误处理 (2天)
- [ ] 完善错误提示
- [ ] 实现错误恢复
- [ ] 添加日志系统
- [ ] 实现用户反馈机制

#### 5.3 完整流程测试 (3天)
- [ ] 测试从0到1生成
- [ ] 测试单文件编辑
- [ ] 测试多文件批量编辑
- [ ] 测试新增页面
- [ ] 测试删除页面
- [ ] 测试版本回滚
- [ ] 测试边界情况

#### 5.4 文档编写 (2天)
- [ ] 更新README
- [ ] 编写用户手册
- [ ] 编写开发文档
- [ ] 编写API文档

#### 5.5 发布准备 (1天)
- [ ] 代码审查
- [ ] 性能测试
- [ ] 创建Release
- [ ] 部署到GitHub Pages

### Phase 5 验收标准
- [x] 所有核心功能性能达标
- [x] 错误处理完善
- [x] 测试覆盖率 > 80%
- [x] 文档完整
- [x] 成功发布

---

## 📊 里程碑

| 里程碑 | 日期 | 标志 |
|--------|------|------|
| **M1: 基础设施就绪** | Week 3 | 数据库+解析器集成完成 |
| **M2: 核心功能完成** | Week 7 | 定位+修改引擎完成 |
| **M3: UI完成** | Week 9 | 界面开发完成 |
| **M4: 正式发布** | Week 10 | v2.0.0发布 |

---

## 🎯 当前优先级

### 立即开始 (本周)
1. ✅ 创建新的目录结构
2. ✅ 集成PGlite
3. ✅ 创建数据库Schema
4. ✅ 集成web-tree-sitter

### 下周
1. 实现基础索引构建
2. 开始自然语言查询引擎

---

## 🔧 技术债务管理

### 需要注意的点
- [ ] 保持单文件HTML的优势（便于部署）
- [ ] 确保向后兼容（用户数据不丢失）
- [ ] 性能监控（大文件处理）
- [ ] 错误处理（网络失败、LLM失败）

---

## 📝 开发规范

### 代码风格
- 使用ES6+语法
- 函数命名：驼峰命名法
- 类命名：大驼峰
- 常量：全大写下划线

### 注释规范
```javascript
/**
 * 函数描述
 * @param {string} param1 - 参数1描述
 * @returns {Promise<object>} 返回值描述
 */
async function example(param1) {
  // 实现
}
```

### Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
refactor: 重构
test: 测试
chore: 构建/工具
```

---

## 🚨 风险管理

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| PGlite性能不足 | 高 | 提前性能测试，准备降级方案 |
| LLM成本过高 | 中 | 实现缓存，优化prompt |
| 开发时间超期 | 中 | MVP优先，非核心功能后置 |
| 浏览器兼容性 | 低 | 只支持现代浏览器 |

---

## 📞 沟通计划

- 每周同步进度
- 遇到技术难题及时沟通
- 重要决策点需要确认

---

现在开始Phase 1开发！ 🚀
