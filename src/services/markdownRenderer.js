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

let mermaidPromise = null

function getMermaid() {
    if (!mermaidPromise) {
        mermaidPromise = import('mermaid').then(module => {
            const mermaid = module.default
            mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'strict',
            })
            return mermaid
        })
    }

    return mermaidPromise
}

// 配置 marked
marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value
            } catch (err) {
                console.error('代码高亮失败:', err)
            }
        }
        return code
    },
    breaks: true,
    gfm: true,
})

/**
 * 渲染 Markdown
 * @param {HTMLElement} element - 目标 DOM 元素
 * @param {string} content - Markdown 内容
 */
export async function renderMarkdown(element, content) {
    if (!element || !content) return

    // 保存原始内容
    if (!element.hasAttribute('data-raw-content')) {
        element.setAttribute('data-raw-content', content)
    }

    // 解析 Markdown
    let html = marked.parse(content)

    // 处理 Mermaid 代码块
    html = html.replace(
        /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
        '<div class="mermaid">$1</div>'
    )

    element.innerHTML = DOMPurify.sanitize(html, {
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    })
    element.classList.add('markdown-body')

    // 渲染 Mermaid 图表
    const mermaidDivs = element.querySelectorAll('.mermaid')
    if (mermaidDivs.length > 0) {
        try {
            const mermaid = await getMermaid()
            await mermaid.run({
                nodes: mermaidDivs,
                suppressErrors: true,
            })
        } catch (err) {
            console.error('Mermaid 渲染失败:', err)
        }
    }
}

/**
 * 简化版: 只解析 Markdown 返回 HTML 字符串
 * @param {string} content - Markdown 内容
 * @returns {string} - HTML 字符串
 */
export function parseMarkdown(content) {
    if (!content) return ''
    return DOMPurify.sanitize(marked.parse(content), {
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    })
}
