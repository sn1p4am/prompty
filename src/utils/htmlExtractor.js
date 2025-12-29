/**
 * 提取 HTML 内容
 * @param {string} content - 包含 HTML 的文本
 * @returns {string|null} - 提取的 HTML 或 null
 */
export function extractHtml(content) {
    if (!content) return null

    // 匹配 <!DOCTYPE html>...</html>
    const htmlMatch = content.match(/<!DOCTYPE\s+html>[\s\S]*?<\/html>/i)
    if (htmlMatch) {
        return htmlMatch[0]
    }

    // 匹配 <html>...</html>
    const htmlTagMatch = content.match(/<html[\s\S]*?<\/html>/i)
    if (htmlTagMatch) {
        return htmlTagMatch[0]
    }

    return null
}

/**
 * 检查 HTML 是否被截断
 * @param {string} html - HTML 字符串
 * @returns {boolean}
 */
export function isHtmlTruncated(html) {
    if (!html) return false

    const normalizedHtml = html.toLowerCase().trim()

    // 检查是否以 </html> 结尾
    if (!normalizedHtml.endsWith('</html>')) {
        return true
    }

    // 检查关键标签是否完整
    const hasHtmlOpen = /<html/i.test(html)
    const hasHtmlClose = /<\/html>/i.test(html)
    const hasBodyOpen = /<body/i.test(html)
    const hasBodyClose = /<\/body>/i.test(html)

    if (hasHtmlOpen && !hasHtmlClose) return true
    if (hasBodyOpen && !hasBodyClose) return true

    return false
}

/**
 * 修复被截断的 HTML
 * @param {string} html - 可能被截断的 HTML
 * @returns {string} - 修复后的 HTML
 */
export function repairHtml(html) {
    if (!html) return ''

    let repairedHtml = html

    // 检查并补全标签
    const hasHtmlOpen = /<html/i.test(repairedHtml)
    const hasHtmlClose = /<\/html>/i.test(repairedHtml)
    const hasBodyOpen = /<body/i.test(repairedHtml)
    const hasBodyClose = /<\/body>/i.test(repairedHtml)
    const hasHeadClose = /<\/head>/i.test(repairedHtml)

    // 补全 </body>
    if (hasBodyOpen && !hasBodyClose) {
        repairedHtml += '\n</body>'
    }

    // 补全 </html>
    if (hasHtmlOpen && !hasHtmlClose) {
        repairedHtml += '\n</html>'
    }

    return repairedHtml
}

/**
 * 生成唯一 ID
 * @returns {string}
 */
export function generateId() {
    return 'card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}
