import { marked } from 'marked'
import mermaid from 'mermaid'
import hljs from 'highlight.js'

// 初始化 Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
})

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

    element.innerHTML = html
    element.classList.add('markdown-body')

    // 渲染 Mermaid 图表
    const mermaidDivs = element.querySelectorAll('.mermaid')
    if (mermaidDivs.length > 0) {
        try {
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
    return marked.parse(content)
}
