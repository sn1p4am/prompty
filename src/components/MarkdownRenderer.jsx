import { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import 'highlight.js/styles/github-dark.min.css'

// 配置 marked
marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value
            } catch (err) {
                console.error('Highlight error:', err)
            }
        }
        return hljs.highlightAuto(code).value
    },
    breaks: true,
    gfm: true
})

// 配置 mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#667eea',
        secondaryColor: '#f093fb',
        tertiaryColor: '#4facfe'
    }
})

export function MarkdownRenderer({ content, className }) {
    const containerRef = useRef(null)
    const [isRendering, setIsRendering] = useState(true)

    useEffect(() => {
        if (!content || !containerRef.current) return

        const renderContent = async () => {
            setIsRendering(true)

            try {
                // 解析 Markdown
                let html = marked.parse(content)

                // 处理 Mermaid 代码块
                html = html.replace(
                    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
                    '<div class="mermaid">$1</div>'
                )

                // 更新 DOM
                containerRef.current.innerHTML = html

                // 渲染所有 Mermaid 图表
                const mermaidDivs = containerRef.current.querySelectorAll('.mermaid')
                if (mermaidDivs.length > 0) {
                    try {
                        await mermaid.run({
                            nodes: mermaidDivs,
                            suppressErrors: true
                        })
                    } catch (err) {
                        console.error('Mermaid 渲染失败:', err)
                    }
                }
            } catch (err) {
                console.error('Markdown 渲染失败:', err)
                if (containerRef.current) {
                    containerRef.current.textContent = content
                }
            }

            setIsRendering(false)
        }

        renderContent()
    }, [content])

    return (
        <div
            ref={containerRef}
            className={`markdown-body ${className || ''}`}
            data-raw-content={content}
        />
    )
}
