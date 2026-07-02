/**
 * Awareness:协同中的"软状态"——光标位置、选区、在线用户
 *
 * 与 Yjs 文档(componentData)不同,awareness 是临时状态:
 * - 不持久化(刷新即重置)
 * - 客户端断开后自动超时清除(由 y-protocols/awareness 管理)
 * - 用于实时展示"他人正在做什么"
 *
 * state 结构: { user: {name,color}, cursor: {x,y}|null, selection: string[] }
 */

import type { Awareness } from 'y-protocols/awareness'

export interface CollabUser {
    name: string
    color: string
}

export interface CursorState {
    x: number
    y: number
}

export interface AwarenessState {
    user: CollabUser
    cursor: CursorState | null
    selection: string[]
}

// 协同用户配色盘(awareness 不持久化,每次刷新重新分配)
const COLORS = [
    '#f56c6c', '#e6a23c', '#67c23a', '#409eff',
    '#9b59b6', '#1abc9c', '#34495e', '#f39c12',
]

const NAMES = ['狐狸', '海豚', '云雀', '青松', '橙柚', '蓝鲸', '紫薇', '翠竹']

export interface AwarenessHandle {
    /** 设置本地光标(null 表示离开) */
    setCursor(cursor: CursorState | null): void
    /** 设置本地选区 */
    setSelection(ids: string[]): void
    /** 获取所有远端用户的状态(不含自己) */
    getRemoteStates(): Array<{ clientId: number; state: AwarenessState }>
    /** 订阅远端状态变化 */
    onChange(cb: (states: Array<{ clientId: number; state: AwarenessState }>) => void): () => void
    /** 当前本地用户信息 */
    readonly localUser: CollabUser
}

export function createAwareness(awareness: Awareness): AwarenessHandle {
    // 为本客户端分配一个稳定的用户身份(本会话内)
    const clientId = awareness.clientID
    const idx = Math.abs(clientId) % COLORS.length
    const localUser: CollabUser = {
        name: NAMES[idx] ?? `用户${clientId}`,
        color: COLORS[idx] ?? '#409eff',
    }

    // 初始化本地 awareness state
    const initialState: AwarenessState = {
        user: localUser,
        cursor: null,
        selection: [],
    }
    awareness.setLocalState(initialState)

    function getRemoteStates(): Array<{ clientId: number; state: AwarenessState }> {
        const result: Array<{ clientId: number; state: AwarenessState }> = []
        awareness.getStates().forEach((state, cid) => {
            if (cid === clientId) return
            if (state && (state as AwarenessState).user) {
                result.push({ clientId: cid, state: state as AwarenessState })
            }
        })
        return result
    }

    return {
        setCursor(cursor) {
            const current = (awareness.getLocalState() as AwarenessState) ?? initialState
            awareness.setLocalState({ ...current, cursor })
        },
        setSelection(ids) {
            const current = (awareness.getLocalState() as AwarenessState) ?? initialState
            awareness.setLocalState({ ...current, selection: ids })
        },
        getRemoteStates,
        onChange(cb) {
            const handler = (): void => {
                cb(getRemoteStates())
            }
            awareness.on('change', handler)
            return () => awareness.off('change', handler)
        },
        localUser,
    }
}
