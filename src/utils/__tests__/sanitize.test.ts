import { describe, it, expect } from 'vitest'
import { escapeHtml, isSafeUrl, isValidImageUrl, isValidCssColor } from '@/utils/sanitize'

describe('escapeHtml - HTML 转义', () => {
    it('转义 & < > " \'', () => {
        expect(escapeHtml('<script>alert("xss")</script>'))
            .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('& 最先转义', () => {
        expect(escapeHtml('a&b')).toBe('a&amp;b')
    })

    it('普通文本不受影响', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World')
    })

    it('空字符串返回空', () => {
        expect(escapeHtml('')).toBe('')
    })

    it('单引号被转义', () => {
        expect(escapeHtml('it\'s')).toBe('it&#x27;s')
    })
})

describe('isSafeUrl - URL 安全验证', () => {
    it('https URL 通过', () => {
        expect(isSafeUrl('https://example.com')).toBe(true)
    })

    it('http URL 通过', () => {
        expect(isSafeUrl('http://example.com')).toBe(true)
    })

    it('data: URL 通过', () => {
        expect(isSafeUrl('data:image/png;base64,abc')).toBe(true)
    })

    it('相对路径通过', () => {
        expect(isSafeUrl('/path/to/page')).toBe(true)
    })

    it('javascript: 协议被阻止', () => {
        expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    })

    it('空字符串不通过', () => {
        expect(isSafeUrl('')).toBe(false)
    })

    it('ftp 协议不通过', () => {
        expect(isSafeUrl('ftp://example.com')).toBe(false)
    })
})

describe('isValidImageUrl - 图片 URL 验证', () => {
    it('https 图片 URL 通过', () => {
        expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true)
    })

    it('http 图片 URL 通过', () => {
        expect(isValidImageUrl('http://example.com/image.png')).toBe(true)
    })

    it('base64 data URL 通过', () => {
        expect(isValidImageUrl('data:image/png;base64,iVBOR')).toBe(true)
    })

    it('空字符串不通过', () => {
        expect(isValidImageUrl('')).toBe(false)
    })

    it('javascript: URL 不通过', () => {
        expect(isValidImageUrl('javascript:alert(1)')).toBe(false)
    })

    it('ftp URL 不通过', () => {
        expect(isValidImageUrl('ftp://example.com/image.jpg')).toBe(false)
    })
})

describe('isValidCssColor - CSS 颜色验证', () => {
    it('3 位 hex 通过', () => {
        expect(isValidCssColor('#fff')).toBe(true)
    })

    it('6 位 hex 通过', () => {
        expect(isValidCssColor('#ff0000')).toBe(true)
    })

    it('8 位 hex(含 alpha)通过', () => {
        expect(isValidCssColor('#ff0000ff')).toBe(true)
    })

    it('rgb 格式通过', () => {
        expect(isValidCssColor('rgb(255,0,0)')).toBe(true)
    })

    it('rgba 格式通过', () => {
        expect(isValidCssColor('rgba(255,0,0,0.5)')).toBe(true)
    })

    it('hsl 格式通过', () => {
        expect(isValidCssColor('hsl(0,100%,50%)')).toBe(true)
    })

    it('颜色名称通过', () => {
        expect(isValidCssColor('red')).toBe(true)
        expect(isValidCssColor('transparent')).toBe(true)
    })

    it('空字符串不通过', () => {
        expect(isValidCssColor('')).toBe(false)
    })

    it('无效格式不通过', () => {
        expect(isValidCssColor('#ggg')).toBe(false)
        expect(isValidCssColor('not-a-color')).toBe(false)
    })
})