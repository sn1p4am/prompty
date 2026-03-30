import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "./ui/card"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"

const TOOL_PLACEHOLDER = `[
  {
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get weather by city name",
      "parameters": {
        "type": "object",
        "properties": {
          "city": {
            "type": "string",
            "description": "Target city"
          }
        },
        "required": ["city"]
      }
    }
  }
]`

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
                <CardTitle className="text-sm">Vertex 扩展参数</CardTitle>
                <CardDescription className="text-xs">
                    OpenAI 兼容层专属能力：推理强度、结构化输出、工具调用与 Web Search。
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Reasoning Effort</Label>
                        <Select
                            value={options.reasoningEffort}
                            onChange={(e) => updateOption('reasoningEffort', e.target.value)}
                        >
                            <option value="">默认</option>
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                            与上方 Thinking 互斥；设置后 Vertex 会走 `reasoning_effort`，不再返回 thoughts。
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tool Choice</Label>
                        <Select
                            value={options.toolChoice}
                            onChange={(e) => updateOption('toolChoice', e.target.value)}
                        >
                            <option value="auto">auto</option>
                            <option value="none">none</option>
                            <option value="required">required</option>
                            <option value="validated">validated</option>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                            `validated` 会强制模型输出符合工具定义的调用参数。
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Parallel Tool Calls</Label>
                        <Select
                            value={options.parallelToolCalls ? 'true' : 'false'}
                            onChange={(e) => updateOption('parallelToolCalls', e.target.value === 'true')}
                        >
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Response Format</Label>
                        <Select
                            value={options.responseFormatType}
                            onChange={(e) => updateOption('responseFormatType', e.target.value)}
                        >
                            <option value="">默认</option>
                            <option value="text">text</option>
                            <option value="json_object">json_object</option>
                            <option value="json_schema">json_schema</option>
                            <option value="custom_mime">自定义 MIME</option>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Web Search</Label>
                        <Select
                            value={options.webSearchEnabled ? 'true' : 'false'}
                            onChange={(e) => updateOption('webSearchEnabled', e.target.value === 'true')}
                        >
                            <option value="false">关闭</option>
                            <option value="true">开启</option>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                            对应 Vertex 的 `web_search_options`，用于启用官方搜索工具。
                        </p>
                    </div>
                </div>

                {options.responseFormatType === 'custom_mime' && (
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Custom MIME Type</Label>
                        <Input
                            value={options.customMimeType}
                            onChange={(e) => updateOption('customMimeType', e.target.value)}
                            placeholder="例如: application/json"
                        />
                    </div>
                )}

                {options.responseFormatType === 'json_schema' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Schema Name</Label>
                                <Input
                                    value={options.responseSchemaName}
                                    onChange={(e) => updateOption('responseSchemaName', e.target.value)}
                                    placeholder="structured_output"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Strict Mode</Label>
                                <Select
                                    value={options.responseSchemaStrict ? 'true' : 'false'}
                                    onChange={(e) => updateOption('responseSchemaStrict', e.target.value === 'true')}
                                >
                                    <option value="false">false</option>
                                    <option value="true">true</option>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">JSON Schema</Label>
                            <Textarea
                                value={options.responseSchemaJson}
                                onChange={(e) => updateOption('responseSchemaJson', e.target.value)}
                                placeholder={RESPONSE_SCHEMA_PLACEHOLDER}
                                className="min-h-[180px]"
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tools JSON</Label>
                    <Textarea
                        value={options.toolsJson}
                        onChange={(e) => updateOption('toolsJson', e.target.value)}
                        placeholder={TOOL_PLACEHOLDER}
                        className="min-h-[220px]"
                    />
                    <p className="text-[11px] text-muted-foreground">
                        按 OpenAI `tools` 数组格式填写；`function.parameters` 使用 JSON Schema / OpenAPI 风格对象。
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
