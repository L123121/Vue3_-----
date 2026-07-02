/**
 * Yjs Provider 管理:WebSocket(实时协同) + IndexedDB(离线持久化)
 *
 * - WebsocketProvider: 连接 server/index.js 提供的 ws 服务,实时同步 + awareness
 * - IndexeddbProvider: 浏览器本地持久化,断网时仍可编辑,联网后自动合并
 *
 * 用法:
 *   const { provider, awareness } = createProvider(collabDoc, roomName, wsUrl)
 *   ... 编辑期间 ...
 *   provider.destroy()  // 组件卸载时
 */

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { CollabDoc } from './yDoc'

export interface CollabProvider {
    provider: WebsocketProvider
    awareness: WebsocketProvider['awareness']
    persistence: IndexeddbPersistence
    /** 销毁所有 provider(组件卸载时调用) */
    destroy(): void
}

export interface ProviderOptions {
    /** ws 服务地址,默认本地 */
    wsUrl?: string
    /** 房间名,同房间协同 */
    roomName: string
    /** 是否启用 IndexedDB 离线持久化,默认 true */
    persist?: boolean
    /** 连接状态回调 */
    onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void
    /** 同步完成回调 */
    onSynced?: () => void
}

const DEFAULT_WS_URL = 'ws://localhost:1234'

export function createProvider(collabDoc: CollabDoc, options: ProviderOptions): CollabProvider {
    const { doc } = collabDoc
    const wsUrl = options.wsUrl ?? DEFAULT_WS_URL
    const roomName = options.roomName
    const persist = options.persist ?? true

    // 1. IndexedDB 持久化(先于 ws,确保 ws 同步时本地已有数据)
    let persistence: IndexeddbPersistence | null = null
    if (persist) {
        try {
            persistence = new IndexeddbPersistence(`yjs-${roomName}`, doc)
        } catch (e) {
            // IndexedDB 不可用(如隐私模式)时降级为纯 ws
            console.warn('[collab] IndexedDB 不可用,降级为纯 WebSocket:', e)
            persistence = null
        }
    }

    // 2. WebSocket provider(实时同步 + awareness)
    const provider = new WebsocketProvider(wsUrl, roomName, doc, {
        // y-websocket 会自动管理 awareness 心跳
        connect: true,
    })

    if (options.onStatus) {
        provider.on('status', (event: { status: string }) => {
            options.onStatus!(event.status as 'connecting' | 'connected' | 'disconnected')
        })
    }

    if (options.onSynced) {
        provider.on('sync', () => options.onSynced!())
    }

    return {
        provider,
        awareness: provider.awareness,
        persistence: persistence as IndexeddbPersistence,
        destroy() {
            provider.destroy()
            persistence?.destroy()
        },
    }
}

/** 生成一个房间名(基于 URL query 或随机) */
export function resolveRoomName(): string {
    if (typeof window === 'undefined') return 'default'
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    if (room) return room
    // 默认共享一个房间,便于演示;可改为随机以隔离
    return 'default'
}
