/**
 * 协同下的 origin 管理
 *
 * 在 Yjs 中,每次 transact 可带一个 origin 参数,标识变更来源。
 * 本地命令产生的变更带 localOrigin;远端推来的变更带对方 clientID。
 *
 * 用途:
 * 1. Y.UndoManager(trackedOrigins: [doc.clientID]) 只跟踪本地变更——
 *    若将来需要用 Y.UndoManager 做自动撤销(如富文本逐字符),它不会撤到他人的操作。
 * 2. isApplyingRemote 守护:store 在应用远端变更时设此标志,避免 observe 回调又触发本地命令。
 *
 * 注意:本项目主撤销语义走 CommandManager(可序列化、跨会话、时间线 UI)。
 * Y.UndoManager 仅作为"协同 origin 隔离"的护栏与未来扩展点,不接管主撤销。
 */

import * as Y from 'yjs'
import type { CollabDoc } from './yDoc'

/** 本地命令变更的 origin 标识 */
export const LOCAL_ORIGIN = 'local-command'

/** 创建一个只跟踪本地 origin 的 Y.UndoManager(护栏 + 扩展点) */
export function createLocalUndoManager(collabDoc: CollabDoc): Y.UndoManager {
    const { doc, yComponents, yCanvas } = collabDoc
    return new Y.UndoManager([yComponents, yCanvas], {
        // 只跟踪本地 clientID 发起的变更,他人变更不进栈
        trackedOrigins: new Set([doc.clientID]),
        // 拖拽期间产生的细碎 style 变更不进 Yjs undo 栈(由 CommandManager 管)
        captureTimeout: 0,
    })
}

/** 远端变更应用期间的标志位(由 useCollabStore 在 observe 回调中维护) */
let _isApplyingRemote = false

export function setApplyingRemote(v: boolean): void {
    _isApplyingRemote = v
}

export function isApplyingRemote(): boolean {
    return _isApplyingRemote
}
