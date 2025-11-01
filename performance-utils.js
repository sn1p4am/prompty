// ============================================================================
// Prompty V2 - Performance Utilities & Optimizations
// 性能优化工具和辅助函数
// ============================================================================

// ============================================================================
// 1. Cache Manager - 缓存管理器
// ============================================================================

class CacheManager {
  constructor(maxSize = 100, ttl = 3600000) { // 默认 1 小时 TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 生成缓存键
   */
  generateKey(prefix, params) {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  /**
   * 获取缓存
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * 设置缓存
   */
  set(key, value) {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%'
    };
  }
}

// ============================================================================
// 2. Debounce & Throttle - 防抖和节流
// ============================================================================

class PerformanceUtils {
  /**
   * 防抖函数 - 延迟执行
   */
  static debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 节流函数 - 限制执行频率
   */
  static throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 批量处理 - 分批执行大量任务
   */
  static async batchProcess(items, processor, batchSize = 10) {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);

      // 让出主线程，避免阻塞 UI
      await this.sleep(0);
    }

    return results;
  }

  /**
   * 延迟执行
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 性能测量
   */
  static async measurePerformance(name, func) {
    const start = performance.now();
    const result = await func();
    const end = performance.now();
    const duration = end - start;

    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

    return {
      result,
      duration
    };
  }

  /**
   * 内存使用监控（如果可用）
   */
  static getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      };
    }
    return null;
  }
}

// ============================================================================
// 3. DOM Utils - DOM 优化工具
// ============================================================================

class DOMUtils {
  /**
   * 批量 DOM 操作 - 使用 DocumentFragment
   */
  static batchInsert(container, elements) {
    const fragment = document.createDocumentFragment();

    for (const element of elements) {
      fragment.appendChild(element);
    }

    container.appendChild(fragment);
  }

  /**
   * 虚拟滚动 - 只渲染可见区域
   */
  static createVirtualScroller(container, items, itemHeight, renderItem) {
    const visibleCount = Math.ceil(container.clientHeight / itemHeight);
    let scrollTop = 0;

    const render = () => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

      // 清空容器
      container.innerHTML = '';

      // 创建占位空间
      const spacer = document.createElement('div');
      spacer.style.height = (items.length * itemHeight) + 'px';
      spacer.style.position = 'relative';
      container.appendChild(spacer);

      // 渲染可见项
      for (let i = startIndex; i < endIndex; i++) {
        const element = renderItem(items[i], i);
        element.style.position = 'absolute';
        element.style.top = (i * itemHeight) + 'px';
        element.style.height = itemHeight + 'px';
        spacer.appendChild(element);
      }
    };

    container.addEventListener('scroll', PerformanceUtils.throttle(() => {
      scrollTop = container.scrollTop;
      render();
    }, 16)); // 60fps

    render();
  }

  /**
   * 懒加载图片
   */
  static lazyLoadImages(selector = 'img[data-src]') {
    const images = document.querySelectorAll(selector);

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  /**
   * 安全的 innerHTML 设置（防止内存泄漏）
   */
  static safeSetInnerHTML(element, html) {
    // 清除事件监听器
    const clone = element.cloneNode(false);
    clone.innerHTML = html;
    element.parentNode.replaceChild(clone, element);
    return clone;
  }
}

// ============================================================================
// 4. Query Optimizer - 查询优化器
// ============================================================================

class QueryOptimizer {
  constructor() {
    this.queryCache = new CacheManager(50, 600000); // 10 分钟缓存
    this.indexCache = new Map();
  }

  /**
   * 优化 SQL 查询 - 添加缓存层
   */
  async optimizedQuery(db, sql, params, cacheKey) {
    // 尝试从缓存获取
    if (cacheKey) {
      const cached = this.queryCache.get(cacheKey);
      if (cached) {
        console.log('[QueryOptimizer] 缓存命中:', cacheKey);
        return cached;
      }
    }

    // 执行查询
    const result = await db.query(sql, params);

    // 缓存结果
    if (cacheKey) {
      this.queryCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 批量查询优化 - 合并多个查询
   */
  async batchQuery(db, queries) {
    const results = await Promise.all(
      queries.map(({ sql, params }) => db.query(sql, params))
    );
    return results;
  }

  /**
   * 预加载索引到内存
   */
  async preloadIndex(db, versionId) {
    const key = `index_${versionId}`;

    if (this.indexCache.has(key)) {
      return this.indexCache.get(key);
    }

    console.log('[QueryOptimizer] 预加载索引...');

    const [files, nodes, markers] = await Promise.all([
      db.query('SELECT * FROM files WHERE version_id = $1', [versionId]),
      db.query('SELECT * FROM ast_nodes WHERE version_id = $1', [versionId]),
      db.query('SELECT * FROM semantic_markers WHERE version_id = $1', [versionId])
    ]);

    const index = {
      files: files.rows,
      nodes: nodes.rows,
      markers: markers.rows
    };

    this.indexCache.set(key, index);
    return index;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.queryCache.clear();
    this.indexCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      queryCache: this.queryCache.getStats(),
      indexCacheSize: this.indexCache.size
    };
  }
}

// ============================================================================
// 5. Worker Pool - Web Worker 池（用于重 CPU 任务）
// ============================================================================

class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers = 0;
  }

  /**
   * 初始化 Worker 池
   */
  async initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      this.workers.push({
        worker,
        busy: false
      });
    }
    console.log(`[WorkerPool] 初始化了 ${this.poolSize} 个 Workers`);
  }

  /**
   * 执行任务
   */
  async execute(data) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ data, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * 处理任务队列
   */
  processQueue() {
    if (this.taskQueue.length === 0) return;

    // 查找空闲 Worker
    const workerEntry = this.workers.find(w => !w.busy);

    if (!workerEntry) return;

    const task = this.taskQueue.shift();
    workerEntry.busy = true;
    this.activeWorkers++;

    const { worker } = workerEntry;

    const onMessage = (e) => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      workerEntry.busy = false;
      this.activeWorkers--;
      task.resolve(e.data);
      this.processQueue();
    };

    const onError = (e) => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      workerEntry.busy = false;
      this.activeWorkers--;
      task.reject(e);
      this.processQueue();
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage(task.data);
  }

  /**
   * 终止所有 Workers
   */
  terminate() {
    this.workers.forEach(({ worker }) => worker.terminate());
    this.workers = [];
    console.log('[WorkerPool] 所有 Workers 已终止');
  }
}

// ============================================================================
// 6. Logger - 性能日志记录器
// ============================================================================

class PerformanceLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  /**
   * 记录性能日志
   */
  log(category, action, duration, metadata = {}) {
    const entry = {
      timestamp: Date.now(),
      category,
      action,
      duration,
      metadata
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 如果超过阈值，输出警告
    if (duration > 1000) {
      console.warn(`[Performance] 慢操作: ${category}.${action} (${duration}ms)`, metadata);
    }
  }

  /**
   * 获取性能报告
   */
  getReport(category = null) {
    let logs = this.logs;

    if (category) {
      logs = logs.filter(log => log.category === category);
    }

    if (logs.length === 0) return null;

    const durations = logs.map(log => log.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    return {
      count: logs.length,
      avgDuration: avg.toFixed(2) + 'ms',
      maxDuration: max.toFixed(2) + 'ms',
      minDuration: min.toFixed(2) + 'ms',
      logs: logs.slice(-10) // 最近 10 条
    };
  }

  /**
   * 导出日志（用于分析）
   */
  export() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs = [];
  }
}

// ============================================================================
// 7. Memory Manager - 内存管理器
// ============================================================================

class MemoryManager {
  constructor() {
    this.references = new WeakMap();
    this.monitoring = false;
  }

  /**
   * 开始内存监控
   */
  startMonitoring(interval = 5000) {
    if (this.monitoring) return;

    this.monitoring = true;
    this.monitoringInterval = setInterval(() => {
      const usage = PerformanceUtils.getMemoryUsage();
      if (usage) {
        console.log('[MemoryManager] 内存使用:', usage);
      }
    }, interval);
  }

  /**
   * 停止内存监控
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoring = false;
    }
  }

  /**
   * 清理未使用的资源
   */
  async cleanup() {
    console.log('[MemoryManager] 开始清理...');

    // 触发垃圾回收（如果可用）
    if (window.gc) {
      window.gc();
    }

    // 清理大型缓存
    if (window.caches) {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        if (name.includes('temp')) {
          await window.caches.delete(name);
        }
      }
    }

    console.log('[MemoryManager] 清理完成');
  }
}

// ============================================================================
// 导出模块
// ============================================================================

if (typeof window !== 'undefined') {
  window.CacheManager = CacheManager;
  window.PerformanceUtils = PerformanceUtils;
  window.DOMUtils = DOMUtils;
  window.QueryOptimizer = QueryOptimizer;
  window.WorkerPool = WorkerPool;
  window.PerformanceLogger = PerformanceLogger;
  window.MemoryManager = MemoryManager;
}
