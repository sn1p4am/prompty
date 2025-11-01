-- Prompty V2 Database Schema
-- PostgreSQL (PGlite) Schema Definition

-- ============================================================================
-- 版本表 (Versions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS versions (
  id SERIAL PRIMARY KEY,
  version_id TEXT NOT NULL UNIQUE,
  parent_version_id TEXT,
  description TEXT NOT NULL,
  user_prompt TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_versions_version_id ON versions(version_id);
CREATE INDEX idx_versions_created_at ON versions(created_at DESC);

-- ============================================================================
-- 文件表 (Files)
-- ============================================================================
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES versions(version_id) ON DELETE CASCADE,
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

CREATE INDEX idx_files_version_id ON files(version_id);
CREATE INDEX idx_files_file_path ON files(file_path);
CREATE INDEX idx_files_content_hash ON files(content_hash);

-- ============================================================================
-- AST节点表 (AST Nodes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ast_nodes (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL,        -- element, text, comment, etc.
  tag_name TEXT,                  -- HTML标签名
  start_line INTEGER NOT NULL,
  start_column INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  end_column INTEGER NOT NULL,
  parent_id INTEGER REFERENCES ast_nodes(id) ON DELETE CASCADE,
  node_path TEXT,                 -- 节点路径 如 "html>body>nav>a"
  attributes JSONB DEFAULT '{}'::jsonb,
  text_content TEXT,
  depth INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ast_nodes_file_id ON ast_nodes(file_id);
CREATE INDEX idx_ast_nodes_node_type ON ast_nodes(node_type);
CREATE INDEX idx_ast_nodes_tag_name ON ast_nodes(tag_name);
CREATE INDEX idx_ast_nodes_parent_id ON ast_nodes(parent_id);
CREATE INDEX idx_ast_nodes_node_path ON ast_nodes(node_path);
CREATE INDEX idx_ast_nodes_position ON ast_nodes(file_id, start_line, start_column);

-- 为attributes的class属性创建索引
CREATE INDEX idx_ast_nodes_class ON ast_nodes
  USING gin ((attributes->'class') jsonb_path_ops);

-- 为attributes的id属性创建索引
CREATE INDEX idx_ast_nodes_id ON ast_nodes
  USING gin ((attributes->'id') jsonb_path_ops);

-- ============================================================================
-- 代码片段表 (Code Snippets) - 用于全文搜索
-- ============================================================================
CREATE TABLE IF NOT EXISTS code_snippets (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  snippet_type TEXT NOT NULL,     -- html, css, javascript
  content TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_code_snippets_file_id ON code_snippets(file_id);
CREATE INDEX idx_code_snippets_type ON code_snippets(snippet_type);
CREATE INDEX idx_code_snippets_lines ON code_snippets(file_id, start_line, end_line);

-- 全文搜索索引（使用 GIN）
CREATE INDEX idx_code_snippets_fts ON code_snippets
  USING gin (to_tsvector('simple', content));

-- ============================================================================
-- 依赖关系表 (Dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dependencies (
  id SERIAL PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES versions(version_id) ON DELETE CASCADE,
  source_file TEXT NOT NULL,
  target_file TEXT,
  dependency_type TEXT NOT NULL,  -- navigation, link, component, resource, semantic
  source_location JSONB,          -- {file, line, column, length}
  target_location JSONB,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dependencies_version_id ON dependencies(version_id);
CREATE INDEX idx_dependencies_source_file ON dependencies(source_file);
CREATE INDEX idx_dependencies_target_file ON dependencies(target_file);
CREATE INDEX idx_dependencies_type ON dependencies(dependency_type);

-- ============================================================================
-- 语义标记表 (Semantic Markers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS semantic_markers (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  node_id INTEGER REFERENCES ast_nodes(id) ON DELETE CASCADE,
  semantic_id TEXT NOT NULL,
  semantic_type TEXT NOT NULL,    -- navigation, button, header, footer, etc.
  semantic_role TEXT,             -- cta, submit, cancel, etc.
  confidence REAL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(file_id, semantic_id)
);

CREATE INDEX idx_semantic_markers_file_id ON semantic_markers(file_id);
CREATE INDEX idx_semantic_markers_node_id ON semantic_markers(node_id);
CREATE INDEX idx_semantic_markers_semantic_id ON semantic_markers(semantic_id);
CREATE INDEX idx_semantic_markers_semantic_type ON semantic_markers(semantic_type);
CREATE INDEX idx_semantic_markers_semantic_role ON semantic_markers(semantic_role);

-- ============================================================================
-- 查询缓存表 (Query Cache) - 缓存LLM查询结果
-- ============================================================================
CREATE TABLE IF NOT EXISTS query_cache (
  id SERIAL PRIMARY KEY,
  query_key TEXT NOT NULL UNIQUE,
  query_type TEXT NOT NULL,       -- intent, tsquery, disambiguation, etc.
  query_input TEXT NOT NULL,
  query_result JSONB NOT NULL,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_query_cache_key ON query_cache(query_key);
CREATE INDEX idx_query_cache_type ON query_cache(query_type);
CREATE INDEX idx_query_cache_expires ON query_cache(expires_at);

-- ============================================================================
-- 物化视图 (Materialized Views) - 用于性能优化
-- ============================================================================

-- 导航元素视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_navigation_elements AS
SELECT
  f.version_id,
  f.file_path,
  n.id as node_id,
  n.tag_name,
  n.start_line,
  n.end_line,
  n.attributes,
  n.text_content,
  sm.semantic_id,
  sm.semantic_type,
  sm.semantic_role
FROM ast_nodes n
JOIN files f ON n.file_id = f.id
LEFT JOIN semantic_markers sm ON n.id = sm.node_id
WHERE n.tag_name = 'nav'
   OR sm.semantic_type IN ('navigation', 'main-navigation')
   OR n.attributes->>'class' LIKE '%nav%'
   OR n.attributes->>'class' LIKE '%navigation%';

CREATE INDEX idx_mv_nav_version ON mv_navigation_elements(version_id);
CREATE INDEX idx_mv_nav_file ON mv_navigation_elements(file_path);

-- 按钮元素视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_button_elements AS
SELECT
  f.version_id,
  f.file_path,
  n.id as node_id,
  n.tag_name,
  n.start_line,
  n.end_line,
  n.attributes,
  n.text_content,
  sm.semantic_id,
  sm.semantic_type,
  sm.semantic_role
FROM ast_nodes n
JOIN files f ON n.file_id = f.id
LEFT JOIN semantic_markers sm ON n.id = sm.node_id
WHERE n.tag_name IN ('button', 'a')
   OR sm.semantic_type = 'button'
   OR n.attributes->>'role' = 'button';

CREATE INDEX idx_mv_btn_version ON mv_button_elements(version_id);
CREATE INDEX idx_mv_btn_file ON mv_button_elements(file_path);
CREATE INDEX idx_mv_btn_role ON mv_button_elements(semantic_role);

-- ============================================================================
-- 辅助函数 (Helper Functions)
-- ============================================================================

-- 刷新所有物化视图
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_navigation_elements;
  REFRESH MATERIALIZED VIEW mv_button_elements;
END;
$$ LANGUAGE plpgsql;

-- 计算文件内容的简单哈希
CREATE OR REPLACE FUNCTION calculate_content_hash(content TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN md5(content);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 清理过期的查询缓存
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM query_cache
  WHERE expires_at IS NOT NULL
    AND expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 触发器 (Triggers)
-- ============================================================================

-- 自动更新文件的 updated_at
CREATE OR REPLACE FUNCTION update_file_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_file_timestamp
BEFORE UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION update_file_timestamp();

-- 自动计算文件哈希
CREATE OR REPLACE FUNCTION auto_calculate_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_hash = calculate_content_hash(NEW.content);
  NEW.file_size = length(NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_hash
BEFORE INSERT OR UPDATE ON files
FOR EACH ROW
WHEN (NEW.content IS NOT NULL)
EXECUTE FUNCTION auto_calculate_hash();

-- ============================================================================
-- 初始数据 (Initial Data)
-- ============================================================================

-- 插入默认版本
INSERT INTO versions (version_id, description, user_prompt)
VALUES ('v0', '初始版本（空项目）', 'system_init')
ON CONFLICT (version_id) DO NOTHING;

-- ============================================================================
-- 注释说明
-- ============================================================================

COMMENT ON TABLE versions IS '版本管理表，存储每个版本的元数据';
COMMENT ON TABLE files IS '文件表，存储每个版本中的文件内容';
COMMENT ON TABLE ast_nodes IS 'AST节点表，存储解析后的HTML/CSS/JS语法树';
COMMENT ON TABLE code_snippets IS '代码片段表，用于全文搜索';
COMMENT ON TABLE dependencies IS '依赖关系表，存储文件间的引用关系';
COMMENT ON TABLE semantic_markers IS '语义标记表，存储元素的语义信息';
COMMENT ON TABLE query_cache IS '查询缓存表，缓存LLM查询结果以提高性能';

COMMENT ON COLUMN ast_nodes.node_path IS '节点路径，如 html>body>div>nav';
COMMENT ON COLUMN ast_nodes.attributes IS 'JSON格式存储所有HTML属性';
COMMENT ON COLUMN semantic_markers.semantic_type IS '语义类型：navigation, button, header等';
COMMENT ON COLUMN semantic_markers.semantic_role IS '语义角色：cta, submit, cancel等';
COMMENT ON COLUMN dependencies.dependency_type IS '依赖类型：navigation, link, component, resource, semantic';
