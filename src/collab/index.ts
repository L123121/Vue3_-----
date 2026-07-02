/**
 * 协同编辑模块入口
 *
 * 使用:
 *   import { initCollab, applyLocalChange, getCollab } from '@/collab'
 *
 * 初始化(在 App.vue onMounted 或 main.ts mount 后):
 *   initCollab()
 */

export {
    initCollab,
    applyLocalChange,
    getCollab,
    type CollabState,
} from './useCollabStore'

export {
    createCollabDoc,
    toComponentData,
    fromComponentData,
    readAllComponents,
    replaceAllComponents,
    findYMapIndex,
    readCanvas,
    writeCanvas,
    type CollabDoc,
} from './yDoc'

export {
    createProvider,
    resolveRoomName,
    type CollabProvider,
    type ProviderOptions,
} from './provider'

export {
    createAwareness,
    type AwarenessHandle,
    type AwarenessState,
    type CollabUser,
    type CursorState,
} from './awareness'

export {
    LOCAL_ORIGIN,
    createLocalUndoManager,
    setApplyingRemote,
    isApplyingRemote,
} from './undoOrigin'
