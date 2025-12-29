import { useState } from 'react'
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
  const [selectedModels, setSelectedModels] = useState([])
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
  const [modalContent, setModalContent] = useState(null)

  // 开始测试
  const handleStartTest = () => {
    batchTest.startBatchTest({
      prompt,
      models: selectedModels,
      temperature,
      topP,
      maxTokens,
      concurrency,
      interval,
    })
  }

  // 停止测试
  const handleStopTest = () => {
    batchTest.stopAllRequests()
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-[1400px] w-[90%] px-5 py-5">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl font-bold mb-3">
            <span className="inline-block mr-2">🧪</span>
            <span className="bg-primary-gradient bg-clip-text text-transparent">
              AI提示词批量测试工具
            </span>
          </h1>
          <p className="text-text-secondary">v3.0.0 - React + Vite + Tailwind CSS</p>

          {/* 版本徽章 */}
          <div className="absolute top-0 left-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/15 border border-primary/30 rounded-full text-sm cursor-help hover:bg-primary/25 transition-all">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              v3.0.0
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
                selectedModels={selectedModels}
                onModelsChange={setSelectedModels}
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
        />

        {/* Toast 通知 */}
        {toast && <Toast message={toast} />}

        {/* 模态框 */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="详细内容"
        >
          {modalContent && (
            <div className="p-6">
              <pre className="whitespace-pre-wrap text-sm">{modalContent}</pre>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}

export default App
