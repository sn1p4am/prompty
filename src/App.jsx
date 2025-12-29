import { useState, useEffect } from 'react'
import { useApiConfig } from './hooks/useApiConfig'
import { useBatchTest } from './hooks/useBatchTest'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useToast, Toast } from './components/Toast'
import { ApiKeyManager } from './components/ApiKeyManager'
import { ModelSelector } from './components/ModelSelector'
import { ConfigPanel } from './components/ConfigPanel'
import { AdvancedSettings } from './components/AdvancedSettings'
import { DisplayModeSwitcher } from './components/DisplayModeSwitcher'
import { StatsPanel } from './components/StatsPanel'
import { ResultsGrid } from './components/ResultsGrid'
import { Modal } from './components/Modal'
import { STORAGE_KEYS, DEFAULT_CONFIG, DISPLAY_MODES } from './constants/providers'

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
  const [activeTab, setActiveTab] = useState('basic')
  const [displayMode, setDisplayMode] = useLocalStorage(
    STORAGE_KEYS.DISPLAY_MODE,
    DISPLAY_MODES.CARD
  )

  // 表单状态
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useLocalStorage(
    STORAGE_KEYS.LAST_SELECTED_MODEL,
    ''
  )
  const [batchSize, setBatchSize] = useState(DEFAULT_CONFIG.batchSize)
  const [temperature, setTemperature] = useState(DEFAULT_CONFIG.temperature)
  const [topP, setTopP] = useState(DEFAULT_CONFIG.topP)
  const [maxTokens, setMaxTokens] = useLocalStorage(
    STORAGE_KEYS.MAX_TOKENS,
    DEFAULT_CONFIG.maxTokens
  )
  const [concurrency, setConcurrency] = useState(DEFAULT_CONFIG.concurrency)
  const [interval, setInterval] = useState(DEFAULT_CONFIG.interval)
  const [streamMode, setStreamMode] = useState(DEFAULT_CONFIG.streamMode)

  // Modal 状态
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalContent, setModalContent] = useState(null)

  // 开始测试
  const handleStartTest = () => {
    batchTest.startBatchTest({
      systemPrompt,
      userPrompt,
      model: selectedModel,
      batchSize,
      temperature,
      topP,
      maxTokens: maxTokens || undefined,
      concurrency,
      interval,
      streamMode,
    })
  }

  // 查看完整内容
  const handleViewFull = (result) => {
    setModalTitle(`响应详情 - ${result.model}`)
    setModalContent(
      <div className="whitespace-pre-wrap text-sm">{result.content || result.error || '(空)'}</div>
    )
    setModalOpen(true)
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        if (!batchTest.isRunning && (systemPrompt || userPrompt) && selectedModel) {
          handleStartTest()
        }
      }
      if (e.key === 'Escape') {
        setModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [batchTest.isRunning, systemPrompt, userPrompt, selectedModel])

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-5 py-5">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-clip-text text-transparent bg-primary-gradient">
              AI 提示词批量测试工具
            </span>
          </h1>
          <p className="text-text-secondary">
            支持多种 AI 供应商，批量测试提示词效果
          </p>
        </header>

        {/* 控制面板 */}
        <div className="bg-card-bg border border-card rounded-card p-6 mb-8">
          {/* 标签导航 */}
          <div className="flex gap-2 mb-6 border-b border-card pb-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'basic'
                  ? 'bg-primary-gradient text-white'
                  : 'bg-white/5 hover:bg-white/10'
                }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              基础配置
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'advanced'
                  ? 'bg-primary-gradient text-white'
                  : 'bg-white/5 hover:bg-white/10'
                }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z" />
              </svg>
              高级参数
            </button>
            <button
              onClick={() => setActiveTab('display')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'display'
                  ? 'bg-primary-gradient text-white'
                  : 'bg-white/5 hover:bg-white/10'
                }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
              </svg>
              显示选项
            </button>
          </div>

          {/* 标签内容 */}
          {activeTab === 'basic' && (
            <div>
              {/* API Key 配置 */}
              <ApiKeyManager apiConfig={apiConfig} onToast={showToast} />

              {/* 提示词配置 */}
              <ConfigPanel
                systemPrompt={systemPrompt}
                onSystemPromptChange={setSystemPrompt}
                userPrompt={userPrompt}
                onUserPromptChange={setUserPrompt}
              />

              {/* 供应商和模型选择 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                <ModelSelector
                  apiConfig={apiConfig}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4">
                <button
                  onClick={handleStartTest}
                  disabled={batchTest.isRunning || (!systemPrompt && !userPrompt) || !selectedModel}
                  className="flex-1 px-6 py-3 bg-primary-gradient text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  🚀 开始生成
                </button>
                <button
                  onClick={batchTest.stopAllRequests}
                  disabled={!batchTest.isRunning}
                  className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  ⏹ 停止所有
                </button>
              </div>

              {/* 进度条 */}
              {batchTest.isRunning && (
                <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-gradient transition-all duration-300"
                    style={{ width: `${batchTest.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <AdvancedSettings
              batchSize={batchSize}
              onBatchSizeChange={setBatchSize}
              interval={interval}
              onIntervalChange={setInterval}
              concurrency={concurrency}
              onConcurrencyChange={setConcurrency}
              temperature={temperature}
              onTemperatureChange={setTemperature}
              topP={topP}
              onTopPChange={setTopP}
              maxTokens={maxTokens}
              onMaxTokensChange={setMaxTokens}
              streamMode={streamMode}
              onStreamModeChange={setStreamMode}
            />
          )}

          {activeTab === 'display' && (
            <DisplayModeSwitcher
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
            />
          )}
        </div>

        {/* 统计面板 */}
        {batchTest.stats.total > 0 && (
          <StatsPanel
            total={batchTest.stats.total}
            success={batchTest.stats.success}
            failed={batchTest.stats.failed}
            running={batchTest.stats.running}
          />
        )}

        {/* 结果展示 */}
        <ResultsGrid
          results={batchTest.results}
          displayMode={displayMode}
          onViewFull={handleViewFull}
          onCopy={(text) => {
            navigator.clipboard.writeText(text)
            showToast('已复制到剪贴板')
          }}
        />
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
      >
        {modalContent}
      </Modal>

      {/* Toast */}
      <Toast message={toast} />
    </div>
  )
}

export default App
