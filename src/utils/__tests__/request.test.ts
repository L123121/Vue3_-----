import { describe, it, expect } from 'vitest'
import { getURL, isValidRequestUrl, urlRE } from '@/utils/request'

describe('getURL - URL 规范化', () => {
    it('http(s) URL 原样返回', () => {
        expect(getURL('https://example.com')).toBe('https://example.com')
        expect(getURL('http://example.com')).toBe('http://example.com')
    })

    it('相对路径原样返回', () => {
        expect(getURL('/api/data')).toBe('/api/data')
    })

    it('协议相对地址补 https', () => {
        expect(getURL('//cdn.example.com/x')).toBe('https://cdn.example.com/x')
    })

    it('裸域名补 https', () => {
        expect(getURL('example.com')).toBe('https://example.com')
    })
})

describe('isValidRequestUrl - URL 校验', () => {
    it('合法 https URL 通过', () => {
        expect(isValidRequestUrl('https://example.com/api')).toBe(true)
    })

    it('合法 http URL 通过', () => {
        expect(isValidRequestUrl('http://example.com')).toBe(true)
    })

    it('相对路径通过', () => {
        expect(isValidRequestUrl('/api/data')).toBe(true)
    })

    it('空字符串不通过', () => {
        expect(isValidRequestUrl('')).toBe(false)
    })

    it('纯数字地址不通过', () => {
        expect(isValidRequestUrl('8080')).toBe(false)
    })

    it('无协议裸域名通过（自动补全）', () => {
        expect(isValidRequestUrl('example.com')).toBe(true)
    })
})

describe('urlRE - URL 正则', () => {
    it('匹配完整 http(s) URL', () => {
        expect(urlRE.test('https://example.com/path?q=1')).toBe(true)
    })

    it('不匹配无协议字符串', () => {
        expect(urlRE.test('example.com')).toBe(false)
    })
})
