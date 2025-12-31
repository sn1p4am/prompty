import { useState, useEffect } from 'react'
import { useApiConfig } from './hooks/useApiConfig'
import { useBatchTest } from './hooks/useBatchTest'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useToast, Toast } from './components/Toast'
import { ApiKeyManager } from './components/ApiKeyManager'
import { ModelSelector } from './components/ModelSelector'
import { ConfigPanel } from './components/ConfigPanel'
import { AdvancedSettings } from './components/AdvancedSettings'
import { ResultsGrid } from './components/ResultsGrid'
import { Modal } from './components/Modal'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { VersionBadge } from './components/VersionBadge'
import { STORAGE_KEYS, DEFAULT_CONFIG, DISPLAY_MODES } from './constants/providers'
import { Button } from "./components/ui/button"
import { Badge } from "./components/ui/badge"
import { Card } from "./components/ui/card"
import { cn } from "./lib/utils"
// Icons
import { Play, Square, Monitor, FileCode, Terminal, FileText, Code, Eye } from "lucide-react"

function App() {
  const apiConfig = useApiConfig()
  const { toast, showToast } = useToast()
  const batchTest = useBatchTest({ apiConfig, onToast: showToast })

  // UI States
  const [displayMode, setDisplayMode] = useLocalStorage(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODES.CARD)

  // Inputs
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useLocalStorage(STORAGE_KEYS.LAST_SELECTED_MODEL, '')

  // Settings
  const [batchSize, setBatchSize] = useState(DEFAULT_CONFIG.batchSize)
  const [temperature, setTemperature] = useState(DEFAULT_CONFIG.temperature)
  const [topP, setTopP] = useState(DEFAULT_CONFIG.topP)
  const [maxTokens, setMaxTokens] = useLocalStorage(STORAGE_KEYS.MAX_TOKENS, DEFAULT_CONFIG.maxTokens)
  const [concurrency, setConcurrency] = useState(DEFAULT_CONFIG.concurrency)
  const [interval, setInterval] = useState(DEFAULT_CONFIG.interval)
  const [streamMode, setStreamMode] = useState(DEFAULT_CONFIG.streamMode)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalViewMode, setModalViewMode] = useState('raw') // 'raw' | 'markdown' | 'html'
  const [modalRawContent, setModalRawContent] = useState('')

  const handleStartTest = () => {
    batchTest.startBatchTest({
      systemPrompt, userPrompt, model: selectedModel,
      batchSize, temperature, topP, maxTokens: maxTokens || undefined,
      concurrency, interval, streamMode,
    })
  }

  /* Full Screen Preview Handler */
  const handleViewFull = (result) => {
    setModalTitle(result.model.toUpperCase())
    setModalRawContent(result.content || result.error || '<NULL_OUTPUT>')
    setModalViewMode('raw') // 默认显示原始内容
    setModalOpen(true)
  }

  /* 提取 HTML 内容 */
  const getHtmlContent = (content) => {
    if (!content) return null
    const match = content.match(/<!DOCTYPE html>[\s\S]*<\/html>/i) || content.match(/<html[\s\S]*<\/html>/i)
    return match ? match[0] : null
  }

  /* 渲染 Modal 内容 */
  const renderModalContent = () => {
    if (modalViewMode === 'raw') {
      return (
        <div className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-primary">
          {modalRawContent}
        </div>
      )
    } else if (modalViewMode === 'markdown') {
      return <MarkdownRenderer content={modalRawContent} />
    } else if (modalViewMode === 'html') {
      const htmlContent = getHtmlContent(modalRawContent)
      return htmlContent ? (
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-none bg-white"
          title="HTML Preview"
          sandbox="allow-scripts"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-destructive">
          <span className="text-xl">无法预览</span>
          <span className="text-sm opacity-50 mt-2">未检测到有效的 HTML 内容</span>
        </div>
      )
    }
    return null
  }


  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        if (!batchTest.isRunning && (systemPrompt || userPrompt) && selectedModel) handleStartTest()
      }
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [batchTest.isRunning, systemPrompt, userPrompt, selectedModel])

  return (
    <div className="min-h-screen font-mono p-4 pb-20 selection:bg-primary selection:text-black">
      {/* CRT Overlay */}
      <div className="scanlines"></div>

      <div className="max-w-[1920px] mx-auto space-y-6 relative z-10">

        {/* Header Section */}
        <header className="flex flex-col lg:flex-row gap-6 border-b-2 border-double border-border pb-6">
          <div className="flex flex-col justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-primary animate-pulse flex items-end gap-3 leading-none">
                PROMPTY_CLI<span className="text-xl opacity-70 mb-1">v3.1</span>
              </h1>
              <p className="text-secondary text-xs uppercase tracking-[0.2em] mt-1">
                                // 高级提示词测试环境
              </p>
            </div>
            <div className="mt-auto pt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">系统状态: 在线</Badge>
              <VersionBadge />
            </div>
          </div>

          <div className="flex-1 border-l border-dashed border-border pl-6">
            <ApiKeyManager apiConfig={apiConfig} onToast={showToast} />
          </div>
        </header>

        {/* Main Control Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column: Configuration */}
          <div className="xl:col-span-1 space-y-6">
            <ModelSelector
              apiConfig={apiConfig}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />

            <AdvancedSettings
              batchSize={batchSize} onBatchSizeChange={setBatchSize}
              interval={interval} onIntervalChange={setInterval}
              concurrency={concurrency} onConcurrencyChange={setConcurrency}
              temperature={temperature} onTemperatureChange={setTemperature}
              topP={topP} onTopPChange={setTopP}
              maxTokens={maxTokens} onMaxTokensChange={setMaxTokens}
              streamMode={streamMode} onStreamModeChange={setStreamMode}
            />

            {/* Action Buttons */}
            <div className="pt-4 space-y-4">
              <Button
                size="lg"
                className="w-full text-base h-16 border-2 border-primary hover:bg-primary hover:text-black transition-none"
                onClick={handleStartTest}
                disabled={batchTest.isRunning || (!systemPrompt && !userPrompt) || !selectedModel}
              >
                {batchTest.isRunning ? (
                  <span className="animate-pulse">{`>> 执行中...`}</span>
                ) : (
                  <span>启动序列</span>
                )}
              </Button>

              {batchTest.isRunning && (
                <Button
                  variant="destructive" size="lg"
                  onClick={batchTest.stopAllRequests}
                  className="w-full border-2 border-destructive"
                >
                  终止任务
                </Button>
              )}
            </div>
          </div>

          {/* Right Column: Prompt Input */}
          <div className="xl:col-span-3 h-full">
            <ConfigPanel
              systemPrompt={systemPrompt} onSystemPromptChange={setSystemPrompt}
              userPrompt={userPrompt} onUserPromptChange={setUserPrompt}
            />

            {/* Progress Bar (ASCII Style) */}
            {batchTest.isRunning && (
              <div className="mt-4 font-mono text-xs text-primary">
                <div className="flex justify-between mb-1">
                  <span>进度_线程_1</span>
                  <span>{Math.round(batchTest.progress)}%</span>
                </div>
                <div className="h-4 w-full border border-primary p-0.5">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${batchTest.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="text-border select-none overflow-hidden whitespace-nowrap text-xs opacity-50 my-8">
          ====================================================================================================================================================================================
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-widest text-secondary">
              <Terminal className="w-5 h-5" />
              {`>> 输出流缓冲区`}
            </h2>

            {/* Display Mode Switcher */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={displayMode === DISPLAY_MODES.CARD ? 'default' : 'outline'}
                onClick={() => setDisplayMode(DISPLAY_MODES.CARD)}
                className="h-8 text-xs"
              >
                <Monitor className="w-3 h-3 mr-2" /> 网格视图
              </Button>
              <Button
                size="sm"
                variant={displayMode === DISPLAY_MODES.HTML ? 'default' : 'outline'}
                onClick={() => setDisplayMode(DISPLAY_MODES.HTML)}
                className="h-8 text-xs"
              >
                <FileCode className="w-3 h-3 mr-2" /> HTML预览
              </Button>
            </div>
          </div>

          <ResultsGrid
            results={batchTest.results}
            displayMode={displayMode}
            onViewFull={handleViewFull}
            onCopy={(text) => {
              navigator.clipboard.writeText(text)
              showToast('缓冲区已复制到剪贴板')
            }}
          />
        </div>
      </div>

      {/* Modal & Toast */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        className={modalViewMode === 'html' ? "max-w-[95vw] h-[95vh]" : ""}
      >
        {/* 视图切换按钮栏 */}
        <div className="flex gap-2 mb-4 pb-4 border-b border-primary/30">
          <Button
            size="sm"
            variant={modalViewMode === 'raw' ? 'default' : 'outline'}
            onClick={() => setModalViewMode('raw')}
            className="h-7 text-xs"
          >
            <Code className="w-3 h-3 mr-1" /> 原始内容
          </Button>
          <Button
            size="sm"
            variant={modalViewMode === 'markdown' ? 'default' : 'outline'}
            onClick={() => setModalViewMode('markdown')}
            className="h-7 text-xs"
          >
            <FileText className="w-3 h-3 mr-1" /> Markdown
          </Button>
          <Button
            size="sm"
            variant={modalViewMode === 'html' ? 'default' : 'outline'}
            onClick={() => setModalViewMode('html')}
            className="h-7 text-xs"
          >
            <Eye className="w-3 h-3 mr-1" /> HTML预览
          </Button>
        </div>
        {/* 内容区域 */}
        <div className={modalViewMode === 'html' ? 'flex-1 h-full' : ''}>
          {renderModalContent()}
        </div>
      </Modal>
      <Toast message={toast} />
    </div>
  )
}

export default App
