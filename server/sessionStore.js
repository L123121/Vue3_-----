/**
 * Agent Session 存储。
 * 配置 REDIS_URL 时使用 Redis 跨实例持久化，未配置时回退到进程内存。
 */

import './env.js'
import { createClient } from 'redis'
import { envNumber } from './env.js'

const SESSION_TTL_MS = envNumber('SESSION_TTL_MS', 30 * 60 * 1000, { min: 60 * 1000 })
const SESSION_TTL_SECONDS = Math.ceil(SESSION_TTL_MS / 1000)
const CLEANUP_INTERVAL = Math.min(5 * 60 * 1000, SESSION_TTL_MS)
const REDIS_PREFIX = process.env.REDIS_SESSION_PREFIX || 'lowcode:agent:'

class SessionStore {
    constructor() {
        this.sessions = new Map()
        this.redisClient = null
        this.redisPromise = this.initializeRedis()
    }

    async initializeRedis() {
        const url = String(process.env.REDIS_URL || '').trim()
        if (!url) return null

        try {
            const client = createClient({ url })
            client.on('error', error => console.error('[Redis]', error.message))
            await client.connect()
            this.redisClient = client
            return client
        } catch (error) {
            console.error('[Redis] 连接失败，使用内存会话:', error.message)
            return null
        }
    }

    create() {
        const id = this.generateId()
        const now = Date.now()
        const session = {
            id,
            createdAt: now,
            updatedAt: now,
            history: [],
            decisions: {},
            currentCanvas: [],
            canvasStyle: {
                width: 375,
                height: 667,
                scale: 100,
                color: '#000',
                opacity: 1,
                backgroundColor: '#ffffff',
                fontSize: 14,
            },
            currentDimension: '',
            selectedComponentIds: [],
            viewport: { width: 0, height: 0, scale: 100 },
            sourceDataVersion: undefined,
            round: 0,
            status: 'active',
        }
        this.sessions.set(id, session)
        this.persist(session)
        return session
    }

    async get(id) {
        const cached = this.sessions.get(id)
        if (cached && Date.now() - cached.updatedAt <= SESSION_TTL_MS) return cached
        if (cached) this.sessions.delete(id)

        const client = await this.redisPromise
        if (!client) return null
        const raw = await client.get(this.redisKey(id))
        if (!raw) return null
        const session = JSON.parse(raw)
        this.sessions.set(id, session)
        return session
    }

    update(id, patch) {
        const session = this.sessions.get(id)
        if (!session) return
        Object.assign(session, patch, { updatedAt: Date.now() })
        this.persist(session)
    }

    saveBreakpoint(id, breakpoint) {
        const session = this.sessions.get(id)
        if (!session) return
        session.pendingSteps = breakpoint.pendingSteps
        session.pendingStepIndex = breakpoint.pendingStepIndex
        session.pendingContext = breakpoint.pendingContext
        session.updatedAt = Date.now()
        this.persist(session)
    }

    async takeBreakpoint(id) {
        const session = await this.get(id)
        if (!session) return null
        const breakpoint = {
            pendingSteps: session.pendingSteps,
            pendingStepIndex: session.pendingStepIndex,
            pendingContext: session.pendingContext,
        }
        session.pendingSteps = undefined
        session.pendingStepIndex = undefined
        session.pendingContext = undefined
        session.updatedAt = Date.now()
        this.persist(session)
        return breakpoint
    }

    persist(session) {
        void this.redisPromise.then(client => {
            if (!client) return
            return client.set(this.redisKey(session.id), JSON.stringify(session), {
                EX: SESSION_TTL_SECONDS,
            })
        }).catch(error => console.error('[Redis] 会话保存失败:', error.message))
    }

    cleanup() {
        const now = Date.now()
        for (const [id, session] of this.sessions) {
            if (now - session.updatedAt > SESSION_TTL_MS) this.sessions.delete(id)
        }
    }

    async close() {
        const client = await this.redisPromise
        if (client?.isOpen) await client.quit()
    }

    redisKey(id) {
        return `${REDIS_PREFIX}${id}`
    }

    generateId() {
        return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    }
}

export const sessionStore = new SessionStore()

const cleanupTimer = setInterval(() => sessionStore.cleanup(), CLEANUP_INTERVAL)
cleanupTimer.unref?.()

export default sessionStore
