/**
 * 安全工具函数
 * 用于防止 XSS 攻击和数据注入
 */

import DOMPurify from 'dompurify'

/**
 * 净化 HTML 内容，防止 XSS 攻击
 * 允许基本格式化标签，但移除脚本和事件处理器
 */
export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
            'span', 'div', 'u', 's', 'sub', 'sup',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
        ],
        ALLOWED_ATTR: ['href', 'target', 'class', 'style'],
        ALLOW_DATA_ATTR: false,
    })
}

/**
 * 转义 HTML 特殊字符，用于安全地将文本插入 HTML
 */
export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
}

/**
 * 验证 URL 是否安全（防止 javascript: 协议等）
 */
export function isSafeUrl(url: string): boolean {
    if (!url) return false
    try {
        const parsed = new URL(url, window.location.origin)
        return ['http:', 'https:', 'data:'].includes(parsed.protocol) || url.startsWith('/')
    } catch {
        return false
    }
}

/**
 * 验证是否为有效的图片 URL
 */
export function isValidImageUrl(url: string): boolean {
    if (!url) return false
    return /^(https?:\/\/|data:image\/)/.test(url)
}

/**
 * 验证是否为有效的 CSS 颜色值
 */
export function isValidCssColor(color: string): boolean {
    if (!color) return false
    return /^#[0-9a-fA-F]{3,8}$/.test(color) ||
    /^(rgb|hsl)a?\(/.test(color) ||
    /^[a-zA-Z]+$/.test(color)
}
