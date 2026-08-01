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
 * 验证 URL 是否安全（防止 javascript: 协议、data: 脚本、协议相对地址等）
 */
export function isSafeUrl(url: string): boolean {
    if (!url) return false
    // 禁止协议相对地址（//host），避免绕过协议白名单
    if (url.startsWith('//')) return false
    try {
        const parsed = new URL(url, window.location.origin)
        // data: 仅放行图片类型，data:text/html 等可执行脚本
        if (parsed.protocol === 'data:') {
            return /^data:image\//i.test(url)
        }
        return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
        return false
    }
}

/**
 * 验证是否为有效的图片 URL
 */
export function isValidImageUrl(url: string): boolean {
    if (!url) return false
    return /^(https?:\/\/|data:image\/)/i.test(url)
}

/**
 * 标准 CSS 颜色关键字（含 transparent / currentColor）
 */
const CSS_COLOR_KEYWORDS = new Set([
    'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
    'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
    'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue',
    'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
    'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon',
    'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise',
    'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick',
    'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
    'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo',
    'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue',
    'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey',
    'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
    'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta',
    'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
    'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
    'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite',
    'navy', 'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
    'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink',
    'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue',
    'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver',
    'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue',
    'tan', 'teal', 'thistle', 'tomato', 'transparent', 'turquoise', 'violet', 'wheat',
    'white', 'whitesmoke', 'yellow', 'yellowgreen', 'currentColor',
])

/**
 * 验证是否为有效的 CSS 颜色值
 */
export function isValidCssColor(color: string): boolean {
    if (!color) return false
    const trimmed = color.trim()
    return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ||
    /^(rgb|hsl)a?\(/.test(trimmed) ||
    CSS_COLOR_KEYWORDS.has(trimmed.toLowerCase())
}
