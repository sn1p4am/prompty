import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "./ui/card"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"

const RESPONSE_SCHEMA_PLACEHOLDER = `{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "keywords": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["summary", "keywords"]
}`

export function VertexAdvancedSettings({ options, onChange }) {
    const updateOption = (key, value) => {
        onChange(prev => ({
            ...prev,
            [key]: value,
        }))
    }

    return (
        <Card className="border-border bg-black">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm">Vertex 原生参数</CardTitle>
                <CardDescription className="text-xs">
                    文本生成场景下的原生 Gemini 参数：thinkingConfig 与 responseMimeType / responseSchema。
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Thinking Level</Label>
                        <Select
                            value={options.thinkingLevel}
                            onChange={(e) => updateOption('thinkingLevel', e.target.value)}
                        >
                            <option value="">默认</option>
                            <option value="LOW">LOW</option>
                            <option value="HIGH">HIGH</option>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                            原生 `generationConfig.thinkingConfig.thinkingLevel`，仅 Gemini 2.5+ 有效。
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Thinking Budget</Label>
                        <Input
                            type="number"
                            min="0"
                            step="256"
                            value={options.thinkingBudget}
                            onChange={(e) => updateOption('thinkingBudget', e.target.value)}
                            placeholder="例如: 8192"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            留空时让模型自动控制；设置 `0` 等价于关闭思考预算。
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Response MIME Type</Label>
                        <Select
                            value={options.responseMimeType}
                            onChange={(e) => updateOption('responseMimeType', e.target.value)}
                        >
                            <option value="">默认</option>
                            <option value="text/plain">text/plain</option>
                            <option value="application/json">application/json</option>
                            <option value="text/x.enum">text/x.enum</option>
                        </Select>
                    </div>
                </div>

                {options.responseMimeType && options.responseMimeType !== 'text/plain' && (
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Response Schema</Label>
                        <Textarea
                            value={options.responseSchemaJson}
                            onChange={(e) => updateOption('responseSchemaJson', e.target.value)}
                            placeholder={RESPONSE_SCHEMA_PLACEHOLDER}
                            className="min-h-[180px]"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            对应原生 `generationConfig.responseSchema`。启用结构化输出时必须提供合法 JSON Schema。
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
