/**
 * useCommandActions composable
 *
 * 命令操作统一入口。将 CommandManager 及所有命令相关操作从 Pinia store 中剥离，
 * 使 store 专注于纯状态管理。
 *
 * 使用:
 *   const { undo, redo, moveComponent, ... } = useCommandActions()
 *
 * CommandManager 为模块级单例，跨组件共享同一 undo/redo 栈。
 * 所有命令通过此 composable 执行，自动标记 store 数据为脏。
 */

import { useStore } from '@/store'
import type { Command } from '@/commands/types'
import { CommandManager } from '@/commands/CommandManager'
import { setCommandContext, getContext } from '@/commands/BaseCommand'
import { createLocalCommandContext } from '@/commands/localContext'
import type { ComponentData, ComponentStyle, CanvasStyleData } from '@/types'
import eventBus from '@/utils/eventBus'
import {
    MoveCommand,
    ResizeCommand,
    RotateCommand,
    AddComponentCommand,
    DeleteComponentCommand,
    LayerCommand,
    ComposeCommand,
    DecomposeCommand,
    ClearCanvasCommand,
    ImportDataCommand,
    CutCommand,
    PasteCommand,
} from '@/commands'
import type { CommandEnvelope } from '@/commands/types'

// ==================== 命令管理器单例 ====================

const commandManager = new CommandManager({ mergeTimeWindow: 300 })

/**
 * 注入命令上下文(本地实现,不涉及 Yjs)。
 * 命令经 ctx 直接操作 Pinia store 的 componentData 数组。
 */
export function initCommandContext(): void {
    setCommandContext(createLocalCommandContext())
}

/**
 * useCommandActions composable
 *
 * 返回所有命令相关操作方法。
 * 在组件的 setup() 中调用:
 *   const { undo, redo } = useCommandActions()
 *
 * 在非 setup 环境(如 shortcutKey.ts)中直接调用模块级函数:
 *   undo()
 *   redo()
 */
export function useCommandActions() {
    const store = useStore()

    // ==================== 撤销重做核心 ====================

    function executeCommand(command: Command): void {
        commandManager.execute(command)
        store.markDataDirty()
    }

    function undo(): void {
        commandManager.undo()
        refreshCurComponent()
        store.markDataDirty()
    }

    function redo(): void {
        commandManager.redo()
        refreshCurComponent()
        store.markDataDirty()
    }

    function canUndo(): boolean {
        return commandManager.canUndo()
    }

    function canRedo(): boolean {
        return commandManager.canRedo()
    }

    function clearCommandHistory(): void {
        commandManager.clear()
    }

    function exportCommandStack(): CommandEnvelope[] {
        return commandManager.exportStack()
    }

    function importCommandStack(envelopes: CommandEnvelope[]): void {
        commandManager.importStack(envelopes)
    }

    function getCommandTimeline(): Array<{ id: string; description: string; timestamp: number }> {
        return commandManager.getUndoDescriptions()
    }

    function undoUntil(targetId: string): void {
        while (commandManager.canUndo()) {
            const timeline = commandManager.getUndoDescriptions()
            const top = timeline[timeline.length - 1]
            if (!top || top.id === targetId) break
            undo()
        }
    }

    function refreshCurComponent(): void {
        if (store.curComponent) {
            const idx = store.componentData.findIndex(c => c.id === store.curComponent!.id)
            if (idx !== -1) {
                store.setCurComponent({ component: store.componentData[idx], index: idx })
            } else {
                store.setCurComponent({ component: null, index: null })
            }
        }
    }

    // ==================== 带命令的操作方法 ====================

    function moveComponent(componentId: string, oldStyle: Partial<ComponentStyle>, newStyle: Partial<ComponentStyle>): void {
        executeCommand(new MoveCommand(componentId, oldStyle, newStyle))
    }

    function resizeComponent(componentId: string, oldStyle: Partial<ComponentStyle>, newStyle: Partial<ComponentStyle>): void {
        executeCommand(new ResizeCommand(componentId, oldStyle, newStyle))
    }

    function rotateComponent(componentId: string, oldRotate: number, newRotate: number): void {
        executeCommand(new RotateCommand(componentId, oldRotate, newRotate))
    }

    function addComponentWithCommand(component: ComponentData, index?: number): void {
        executeCommand(new AddComponentCommand(component, index))
    }

    function deleteComponentWithCommand(id?: string, index?: number): void {
        const componentId = id ?? store.curComponent?.id
        if (!componentId) return
        executeCommand(new DeleteComponentCommand(componentId, index))
    }

    function layerOperation(componentId: string, action: 'up' | 'down' | 'top' | 'bottom'): void {
        executeCommand(new LayerCommand(componentId, action))
    }

    function composeWithCommand(): void {
        const componentIds = store.areaData.components.map(c => c.id)
        if (componentIds.length > 0) {
            executeCommand(new ComposeCommand(componentIds))
            eventBus.emit('hideArea')
        }
    }

    function decomposeWithCommand(): void {
        if (store.curComponent && store.curComponent.component === 'Group') {
            executeCommand(new DecomposeCommand(store.curComponent.id))
        }
    }

    function clearCanvasWithCommand(): void {
        executeCommand(new ClearCanvasCommand())
    }

    function cutWithCommand(id?: string, index?: number): void {
        const componentId = id ?? store.curComponent?.id
        if (!componentId) return
        executeCommand(new CutCommand(componentId, index))
    }

    function importDataWithCommand(componentData: ComponentData[], canvasStyle?: CanvasStyleData): void {
        executeCommand(new ImportDataCommand(componentData, canvasStyle))
    }

    function pasteWithCommand(isMouse?: boolean): void {
        if (!store.copyData) return
        executeCommand(new PasteCommand(store.copyData.data, isMouse, store.menuTop, store.menuLeft))
    }

    return {
        executeCommand,
        undo,
        redo,
        canUndo,
        canRedo,
        clearCommandHistory,
        exportCommandStack,
        importCommandStack,
        getCommandTimeline,
        undoUntil,
        refreshCurComponent,
        moveComponent,
        resizeComponent,
        rotateComponent,
        addComponentWithCommand,
        deleteComponentWithCommand,
        layerOperation,
        composeWithCommand,
        decomposeWithCommand,
        clearCanvasWithCommand,
        cutWithCommand,
        importDataWithCommand,
        pasteWithCommand,
    }
}

// ==================== 模块级便捷函数（非 setup 环境使用） ====================
// 用于 shortcutKey.ts 等无法调用 useCommandActions() 的环境。
// 通过 store.markDataDirty() 触发自动保存。

export function undo(): void {
    const store = useStore()
    commandManager.undo()
    refreshCurComponent()
    store.markDataDirty()
}

export function redo(): void {
    const store = useStore()
    commandManager.redo()
    refreshCurComponent()
    store.markDataDirty()
}

export function canUndo(): boolean {
    return commandManager.canUndo()
}

export function canRedo(): boolean {
    return commandManager.canRedo()
}

export function clearCommandHistory(): void {
    commandManager.clear()
}

export function exportCommandStack(): CommandEnvelope[] {
    return commandManager.exportStack()
}

export function importCommandStack(envelopes: CommandEnvelope[]): void {
    commandManager.importStack(envelopes)
}

export function getCommandTimeline(): Array<{ id: string; description: string; timestamp: number }> {
    return commandManager.getUndoDescriptions()
}

export function undoUntil(targetId: string): void {
    while (commandManager.canUndo()) {
        const timeline = commandManager.getUndoDescriptions()
        const top = timeline[timeline.length - 1]
        if (!top || top.id === targetId) break
        undo()
    }
}

export function moveComponent(componentId: string, oldStyle: Partial<ComponentStyle>, newStyle: Partial<ComponentStyle>): void {
    const store = useStore()
    commandManager.execute(new MoveCommand(componentId, oldStyle, newStyle))
    store.markDataDirty()
}

export function resizeComponent(componentId: string, oldStyle: Partial<ComponentStyle>, newStyle: Partial<ComponentStyle>): void {
    const store = useStore()
    commandManager.execute(new ResizeCommand(componentId, oldStyle, newStyle))
    store.markDataDirty()
}

export function rotateComponent(componentId: string, oldRotate: number, newRotate: number): void {
    const store = useStore()
    commandManager.execute(new RotateCommand(componentId, oldRotate, newRotate))
    store.markDataDirty()
}

export function addComponentWithCommand(component: ComponentData, index?: number): void {
    const store = useStore()
    commandManager.execute(new AddComponentCommand(component, index))
    store.markDataDirty()
}

export function deleteComponentWithCommand(id?: string, index?: number): void {
    const store = useStore()
    const componentId = id ?? store.curComponent?.id
    if (!componentId) return
    commandManager.execute(new DeleteComponentCommand(componentId, index))
    store.markDataDirty()
}

export function layerOperation(componentId: string, action: 'up' | 'down' | 'top' | 'bottom'): void {
    const store = useStore()
    commandManager.execute(new LayerCommand(componentId, action))
    store.markDataDirty()
}

export function composeWithCommand(): void {
    const store = useStore()
    const componentIds = store.areaData.components.map(c => c.id)
    if (componentIds.length > 0) {
        commandManager.execute(new ComposeCommand(componentIds))
        store.markDataDirty()
        eventBus.emit('hideArea')
    }
}

export function decomposeWithCommand(): void {
    const store = useStore()
    if (store.curComponent && store.curComponent.component === 'Group') {
        commandManager.execute(new DecomposeCommand(store.curComponent.id))
        store.markDataDirty()
    }
}

export function clearCanvasWithCommand(): void {
    const store = useStore()
    store.componentData.splice(0, store.componentData.length)
    store.curComponent = null
    store.curComponentIndex = null
    store.markDataDirty()
}

export function cutWithCommand(id?: string, index?: number): void {
    const store = useStore()
    const componentId = id ?? store.curComponent?.id
    if (!componentId) return
    commandManager.execute(new CutCommand(componentId, index))
    store.markDataDirty()
}

export function importDataWithCommand(componentData: ComponentData[], canvasStyle?: CanvasStyleData): void {
    const store = useStore()
    commandManager.execute(new ImportDataCommand(componentData, canvasStyle))
    store.markDataDirty()
}

export function pasteWithCommand(isMouse?: boolean): void {
    const store = useStore()
    if (!store.copyData) return
    commandManager.execute(new PasteCommand(store.copyData.data, isMouse, store.menuTop, store.menuLeft))
    store.markDataDirty()
}

export { CommandManager } from '@/commands/CommandManager'
export { BatchOperation } from '@/commands/CommandManager'

/** 刷新当前组件引用（撤销重做后需要）—— 模块级版本 */
function refreshCurComponent(): void {
    const store = useStore()
    if (store.curComponent) {
        const idx = store.componentData.findIndex(c => c.id === store.curComponent!.id)
        if (idx !== -1) {
            store.curComponent = store.componentData[idx]
            store.curComponentIndex = idx
        } else {
            store.curComponent = null
            store.curComponentIndex = null
        }
    }
}

export { refreshCurComponent }