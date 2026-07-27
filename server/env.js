import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(currentDirectory, '.env') })

export function envNumber(name, fallback, limits = {}) {
    const value = Number(process.env[name])
    if (!Number.isFinite(value)) return fallback
    const minimum = Number.isFinite(limits.min) ? limits.min : Number.NEGATIVE_INFINITY
    const maximum = Number.isFinite(limits.max) ? limits.max : Number.POSITIVE_INFINITY
    return Math.min(maximum, Math.max(minimum, value))
}

export function envBoolean(name, fallback = false) {
    const value = String(process.env[name] || '').trim().toLowerCase()
    if (!value) return fallback
    return ['1', 'true', 'yes', 'on'].includes(value)
}

export function envList(name, fallback = []) {
    const value = String(process.env[name] || '').trim()
    if (!value) return fallback
    return value.split(',').map(item => item.trim()).filter(Boolean)
}
