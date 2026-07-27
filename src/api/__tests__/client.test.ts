import { describe, expect, it } from 'vitest'
import { buildApiUrl, normalizeApiBaseUrl } from '@/api/client'

describe('API client configuration', () => {
    it('normalizes trailing slashes', () => {
        expect(normalizeApiBaseUrl('https://api.example.com///')).toBe('https://api.example.com')
    })

    it('builds same-origin URLs when no base URL is configured', () => {
        expect(buildApiUrl('/api/health')).toBe('/api/health')
    })
})
