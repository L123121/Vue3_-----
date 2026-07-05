import { useStore } from '@/store'
import eventBus from '@/utils/eventBus'
import {
    undo,
    redo,
    pasteWithCommand,
    cutWithCommand,
    composeWithCommand,
    decomposeWithCommand,
    deleteComponentWithCommand,
} from '@/composables/useCommandActions'

// 操作函数
function copy(): void {
    const store = useStore()
    store.copy()
}

const paste = pasteWithCommand
const cut = cutWithCommand

const compose = (): void => {
    const store = useStore()
    if (store.areaData.components.length) {
        composeWithCommand()
    }
}

const decompose = (): void => {
    const store = useStore()
    const curComponent = store.curComponent
    if (curComponent && !curComponent.isLock && curComponent.component === 'Group') {
        decomposeWithCommand()
    }
}

function save(): void {
    eventBus.emit('save')
}

function preview(): void {
    eventBus.emit('preview', true)
}

function clearCanvas(): void {
    eventBus.emit('clearCanvas')
}

function lock(): void {
    const store = useStore()
    store.lock()
}

function unlock(): void {
    const store = useStore()
    store.unlock()
}

// 快捷键映射类型
type KeyHandler = () => void
type KeyMap = Record<string, KeyHandler>

// 与组件状态无关的操作
const basemap: KeyMap = {
    'v': paste,
    'y': redo,
    'z': undo,
    's': save,
    'p': preview,
    'e': clearCanvas,
}

// 组件锁定状态下可以执行的操作
const lockMap: KeyMap = {
    ...basemap,
    'u': unlock,
}

// 组件未锁定状态下可以执行的操作
const unlockMap: KeyMap = {
    ...basemap,
    'c': copy,
    'x': cut,
    'g': compose,
    'b': decompose,
    'd': deleteComponentWithCommand,
    'l': lock,
}

let isCtrlOrCommandDown = false

/**
 * 监听全局键盘事件
 * @returns 清理函数
 */
export function listenGlobalKeyDown(): () => void {
    const handleKeyDown = (e: KeyboardEvent): void => {
        const store = useStore()
        if (!store.isInEditor) return

        const { curComponent } = store
        const key = e.key.toLowerCase()

        if (key === 'control' || key === 'meta') {
            isCtrlOrCommandDown = true
        } else if (key === 'delete' || key === 'backspace') {
            if (curComponent) {
                deleteComponentWithCommand()
            }
        } else if (isCtrlOrCommandDown) {
            if (unlockMap[key] && (!curComponent || !curComponent.isLock)) {
                e.preventDefault()
                unlockMap[key]()
            } else if (lockMap[key] && curComponent && curComponent.isLock) {
                e.preventDefault()
                lockMap[key]()
            }
        }
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
        const key = e.key.toLowerCase()
        if (key === 'control' || key === 'meta') {
            isCtrlOrCommandDown = false
        }
    }

    const handleMouseDown = (): void => {
        const store = useStore()
        store.setInEditorStatus(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleMouseDown)

    return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        window.removeEventListener('mousedown', handleMouseDown)
    }
}