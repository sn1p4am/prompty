export function ConfigPanel({
    systemPrompt,
    onSystemPromptChange,
    userPrompt,
    onUserPromptChange,
}) {
    return (
        <div>
            {/* System Prompt */}
            <div className="mb-5">
                <label className="flex items-center gap-2 mb-2 font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z" />
                    </svg>
                    System Prompt (系统提示词)
                    <span className="text-xs font-normal opacity-70">定义 AI 的角色、行为规范和输出格式</span>
                </label>
                <textarea
                    className="w-full min-h-[100px] p-4 bg-white/5 border border-card rounded-card text-text-primary resize-vertical focus:outline-none focus:border-primary transition-all"
                    placeholder="例如：你是一位专业的文案撰写专家，擅长创作吸引人的营销文案..."
                    value={systemPrompt}
                    onChange={(e) => onSystemPromptChange(e.target.value)}
                />
            </div>

            {/* User Prompt */}
            <div className="mb-5">
                <label className="flex items-center gap-2 mb-2 font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                    </svg>
                    User Prompt (用户提示词)
                    <span className="text-xs font-normal opacity-70">具体的任务需求或问题</span>
                </label>
                <textarea
                    className="w-full min-h-[120px] p-4 bg-white/5 border border-card rounded-card text-text-primary resize-vertical focus:outline-none focus:border-primary transition-all"
                    placeholder="请输入您要测试的具体任务或问题...&#10;支持多行输入，可以包含复杂的指令和上下文信息。"
                    value={userPrompt}
                    onChange={(e) => onUserPromptChange(e.target.value)}
                />
            </div>
        </div>
    )
}
