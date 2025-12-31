import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"

export function ConfigPanel({
    systemPrompt,
    onSystemPromptChange,
    userPrompt,
    onUserPromptChange,
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-border">
            {/* System Prompt (1/3 width) - Left Pane */}
            <div className="lg:col-span-1 flex flex-col h-full border-b lg:border-b-0 lg:border-r border-border p-4 bg-primary/5">
                <Label className="flex items-center gap-2 text-secondary">
                    // 系统预设 (System Prompt)
                </Label>
                <Textarea
                    className="flex-1 min-h-[150px] lg:min-h-[200px] bg-transparent border-none focus-visible:ring-0 p-0 text-sm leading-relaxed"
                    placeholder="# 在此定义系统角色..."
                    value={systemPrompt}
                    onChange={(e) => onSystemPromptChange(e.target.value)}
                />
            </div>

            {/* User Prompt (2/3 width) - Right Pane */}
            <div className="lg:col-span-2 flex flex-col h-full p-4">
                <Label className="flex items-center gap-2">
                    // 用户输入 (User Prompt)
                </Label>
                <Textarea
                    className="flex-1 min-h-[150px] lg:min-h-[200px] bg-transparent border-none focus-visible:ring-0 p-0 text-base leading-relaxed"
                    placeholder="> 输入提示词..."
                    value={userPrompt}
                    onChange={(e) => onUserPromptChange(e.target.value)}
                />
            </div>
        </div>
    )
}
