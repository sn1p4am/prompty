import { useState } from 'react'

function App() {
  const [prompt, setPrompt] = useState('')

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl px-5 py-5">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">
            <span className="inline-block mr-2">🧪</span>
            <span className="bg-primary-gradient bg-clip-text text-transparent">
              AI提示词批量测试工具
            </span>
          </h1>
          <p className="text-text-secondary">v3.0.0 - React + Vite + Tailwind CSS</p>
        </header>

        {/* Controls */}
        <div className="bg-card backdrop-blur-lg border border-card rounded-card p-6 mb-8 shadow-card">
          <div className="mb-5">
            <label className="block mb-2 font-semibold">提示词</label>
            <textarea
              className="w-full min-h-[120px] p-4 bg-white/5 border border-card rounded-card text-text-primary resize-vertical focus:outline-none focus:border-primary transition-all"
              placeholder="输入你的提示词..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-center">
            <button className="px-8 py-3 bg-primary-gradient text-white font-semibold rounded-card hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              开始批量测试
            </button>
            <button className="px-8 py-3 bg-secondary-gradient text-white font-semibold rounded-card hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              停止所有请求
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card backdrop-blur-lg border border-card rounded-card p-6 mb-8 shadow-card">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-5xl font-bold bg-primary-gradient bg-clip-text text-transparent">0</div>
              <div className="text-sm text-text-secondary mt-2 uppercase tracking-wider">成功</div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-error-gradient bg-clip-text text-transparent">0</div>
              <div className="text-sm text-text-secondary mt-2 uppercase tracking-wider">失败</div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-success-gradient bg-clip-text text-transparent">0</div>
              <div className="text-sm text-text-secondary mt-2 uppercase tracking-wider">进行中</div>
            </div>
          </div>
        </div>

        {/* Results placeholder */}
        <div className="text-center text-text-secondary py-12">
          <p>暂无测试结果</p>
          <p className="text-sm mt-2">输入提示词并点击"开始批量测试"开始</p>
        </div>
      </div>
    </div>
  )
}

export default App
