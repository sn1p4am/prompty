import { useEffect, useRef } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import DOMPurify from 'dompurify'
import 'highlight.js/styles/github-dark.min.css'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('python', python)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' })
hljs.registerAliases(['html', 'svg'], { languageName: 'xml' })
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' })
hljs.registerAliases(['md'], { languageName: 'markdown' })
hljs.registerAliases(['py'], { languageName: 'python' })
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' })

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

let mermaidPromise = null

function getMermaid() {
    if (!mermaidPromise) {
        mermaidPromise = import('mermaid').then(module => {
            const mermaid = module.default
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: 'dark',
                themeVariables: {
                    primaryColor: '#667eea',
                    secondaryColor: '#f093fb',
                    tertiaryColor: '#4facfe'
                }
            })
            return mermaid
        })
    }

    return mermaidPromise
}

export function MarkdownRenderer({ content, className }) {
    const containerRef = useRef(null)

    useEffect(() => {
        if (!containerRef.current) return

        if (!content) {
            containerRef.current.textContent = ''
            return
        }

        const renderContent = async () => {
            try {
                // 解析 Markdown
                let html = marked.parse(content)

                // 处理 Mermaid 代码块
                html = html.replace(
                    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
                    '<div class="mermaid">$1</div>'
                )

                // 更新 DOM
                containerRef.current.innerHTML = DOMPurify.sanitize(html, {
                    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
                })

                // 渲染所有 Mermaid 图表
                const mermaidDivs = containerRef.current.querySelectorAll('.mermaid')
                if (mermaidDivs.length > 0) {
                    try {
                        const mermaid = await getMermaid()
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
