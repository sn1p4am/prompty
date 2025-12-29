import { useState, useEffect } from 'react'
import { useApiConfig } from './hooks/useApiConfig'
import { useBatchTest } from './hooks/useBatchTest'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useToast, Toast } from './components/Toast'
import { ApiKeyManager } from './components/ApiKeyManager'
import { ModelSelector } from './components/ModelSelector'
import { ConfigPanel } from './components/ConfigPanel'
import { AdvancedSettings } from './components/AdvancedSettings'
import { TabNavigation } from './components/TabNavigation'
import { DisplayModeSwitcher } from './components/DisplayModeSwitcher'
import { StatsPanel } from './components/StatsPanel'
import { ResultsGrid } from './components/ResultsGrid'
import { Modal } from './components/Modal'
import { DEFAULT_CONFIG, STORAGE_KEYS } from './constants/providers'
import { renderMarkdown } from './services/markdownRenderer'

function App() {
  // API 配置
  const apiConfig = useApiConfig()

  // Toast 通知
  const { toast, showToast } = useToast()

  // 批量测试
  const batchTest = useBatchTest({
    apiConfig,
    onToast: showToast,
  })

  // UI 状态
  const [activeTab, setActiveTab] = useState('config')
  const [displayMode, setDisplayMode] = useLocalStorage(
    STORAGE_KEYS.DISPLAY_MODE,
    'card'
  )

  // 表单状态
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('') // 单选模型
  const [temperature, setTemperature] = useState(DEFAULT_CONFIG.temperature)
  const [topP, setTopP] = useState(DEFAULT_CONFIG.topP)
  const [maxTokens, setMaxTokens] = useLocalStorage(
    STORAGE_KEYS.MAX_TOKENS,
    DEFAULT_CONFIG.maxTokens
  )
  const [concurrency, setConcurrency] = useState(DEFAULT_CONFIG.concurrency)
  const [interval, setInterval] = useState(DEFAULT_CONFIG.interval)

  // 模态框
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalContent, setModalContent] = useState(null)
  const [modalIsMarkdown, setModalIsMarkdown] = useState(false)

  // 开始测试
  const handleStartTest = () => {
    if (!selectedModel) {
      showToast('请先选择模型')
      return
    }

    batchTest.startBatchTest({
      prompt,
      models: [selectedModel], // 转为数组，保持接口一致
      temperature,
      topP,
      maxTokens: maxTokens || undefined, // 空字符串转为 undefined
      concurrency,
      interval,
    })
  }

  // 停止测试
  const handleStopTest = () => {
    batchTest.stopAllRequests()
  }

  // 查看完整内容
  const handleViewFull = (result) => {
    setModalTitle(`完整内容 - ${result.model}`)
    setModalContent(result.content)
    setModalIsMarkdown(true)
    setModalOpen(true)
  }

  // HTML 全屏预览
  const handleViewHtmlFullscreen = (result) => {
    setModalTitle(`HTML 预览 - ${result.model}`)
    setModalContent(result.content)
    setModalIsMarkdown(false)
    setModalOpen(true)
  }

  // 调试信息
  const handleDebug = (result) => {
    const debugInfo = `
模型: ${result.model}
状态: ${result.status}
${result.error ? `错误信息: ${result.error}` : ''}
内容长度: ${result.content?.length || 0} 字符
    `.trim()

    alert(debugInfo)
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + Enter 开始测试
      if (e.ctrlKey && e.key === 'Enter') {
        if (!batchTest.isRunning && selectedModel && prompt) {
          handleStartTest()
        }
      }
      // Esc 关闭模态框
      if (e.key === 'Escape') {
        setModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [batchTest.isRunning, selectedModel, prompt])

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-5 py-5">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl font-bold mb-3">
            <span className="inline-block mr-2">🧪</span>
            <span className="bg-primary-gradient bg-clip-text text-transparent">
              AI提示词批量测试工具
            </span>
          </h1>
          <p className="text-text-secondary text-sm">支持快捷键：Ctrl + Enter 开始测试 | Esc 关闭弹窗</p>

          {/* 版本徽章（带 Tooltip） */}
          <div className="absolute top-0 left-0 group">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/15 border border-primary/30 rounded-full text-sm cursor-help hover:bg-primary/25 transition-all">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              v3.0.0
            </div>

            {/* Tooltip */}
            <div className="absolute top-full left-0 mt-2 min-w-[320px] max-w-[400px] bg-secondary-bg border border-card rounded-card p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[9999]">
              <h4 className="font-semibold mb-2 pb-2 border-b border-card flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                版本 3.0.0 - React 重构版
              </h4>
              <ul className="text-sm text-text-secondary space-y-1.5 list-none">
                <li>✨ 全新 React + Vite + Tailwind 架构</li>
                <li>📦 模块化组件设计</li>
                <li>⚡ 性能优化和代码分割</li>
                <li>🎨 完整保留所有功能</li>
                <li>🚀 GitHub Actions 自动部署</li>
              </ul>
            </div>
          </div>
        </header>

        {/* API Key Manager */}
        <ApiKeyManager apiConfig={apiConfig} onToast={showToast} />

        {/* 标签页控制面板 */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === 'config' ? (
            <>
              <ConfigPanel
                prompt={prompt}
                onPromptChange={setPrompt}
                temperature={temperature}
                onTemperatureChange={setTemperature}
                topP={topP}
                onTopPChange={setTopP}
                maxTokens={maxTokens}
                onMaxTokensChange={setMaxTokens}
              />

              <ModelSelector
                apiConfig={apiConfig}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />

              {/* 操作按钮 */}
              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={handleStartTest}
                  disabled={batchTest.isRunning}
                  className="px-8 py-3 bg-primary-gradient text-white font-semibold rounded-card hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  开始批量测试
                </button>
                <button
                  onClick={handleStopTest}
                  disabled={!batchTest.isRunning}
                  className="px-8 py-3 bg-secondary-gradient text-white font-semibold rounded-card hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  停止所有请求
                </button>
              </div>
            </>
          ) : (
            <AdvancedSettings
              concurrency={concurrency}
              onConcurrencyChange={setConcurrency}
              interval={interval}
              onIntervalChange={setInterval}
            />
          )}
        </TabNavigation>

        {/* 统计面板 */}
        {batchTest.results.length > 0 && (
          <StatsPanel stats={batchTest.stats} />
        )}

        {/* 显示模式切换 */}
        {batchTest.results.length > 0 && (
          <DisplayModeSwitcher
            displayMode={displayMode}
            onModeChange={setDisplayMode}
          />
        )}

        {/* 结果展示 */}
        <ResultsGrid
          results={batchTest.results}
          displayMode={displayMode}
          onViewFull={handleViewFull}
          onViewHtmlFullscreen={handleViewHtmlFullscreen}
          onDebug={handleDebug}
        />

        {/* Toast 通知 */}
        {toast && <Toast message={toast} />}

        {/* 模态框 */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalTitle}
        >
          <div className="p-6">
            {modalIsMarkdown ? (
              <div
                className="markdown-body prose prose-invert max-w-none"
                ref={(el) => {
                  if (el && modalContent) {
                    renderMarkdown(el, modalContent)
                  }
                }}
              />
            ) : (
              <div className="bg-white rounded overflow-hidden" style={{ height: '70vh' }}>
                <iframe
                  srcDoc={modalContent}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  title="html-preview-fullscreen"
                />
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default App
