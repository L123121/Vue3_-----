/**
 * 编辑器上下文 composable
 *
 * 使用 provide/inject 替代 eventBus 中编辑器内部的事件：
 * - move / unmove   → MarkLine 吸附线
 * - hideArea        → 框选区域
 * - runAnimation / stopAnimation → 动画播放
 *
 * 父组件（Editor/index.vue）调用 provideEditorContext()
 * 子组件（Shape、MarkLine、Area）调用 useEditorContext() 获取共享状态
 */

import { provide, inject, reactive, type InjectionKey } from 'vue'

/**
 * 移动状态
 */
export interface MoveState {
  isMoving: boolean
  isDownward: boolean
  isRightward: boolean
}

/**
 * 编辑器上下文接口
 */
export interface EditorContext {
  /** 移动状态 —— MarkLine 读取此状态来显示吸附线 */
  moveState: MoveState
  /** 通知开始移动 */
  startMove(isDownward: boolean, isRightward: boolean): void
  /** 通知停止移动 */
  stopMove(): void

  /** 隐藏框选区域 */
  hideArea(): void
  /** 注册 hideArea 的回调（Area 组件注册，Editor 调用） */
  onHideArea(callback: () => void): void

  /** 触发动画播放 */
  runAnimation(): void
  /** 触发动画停止 */
  stopAnimation(): void
  /** 注册动画回调（Shape 组件注册） */
  onRunAnimation(callback: () => void): void
  onStopAnimation(callback: () => void): void
}

const EDITOR_CONTEXT_KEY: InjectionKey<EditorContext> = Symbol('EditorContext')

/**
 * 提供编辑器上下文（在 Editor/index.vue 中调用）
 */
export function provideEditorContext(): EditorContext {
    const moveState = reactive<MoveState>({
        isMoving: false,
        isDownward: false,
        isRightward: false,
    })

    const hideAreaCallbacks: Array<() => void> = []
    const runAnimationCallbacks: Array<() => void> = []
    const stopAnimationCallbacks: Array<() => void> = []

    const context: EditorContext = {
        moveState,

        startMove(isDownward, isRightward) {
            moveState.isMoving = true
            moveState.isDownward = isDownward
            moveState.isRightward = isRightward
        },

        stopMove() {
            moveState.isMoving = false
        },

        hideArea() {
            hideAreaCallbacks.forEach(cb => cb())
        },

        onHideArea(callback) {
            hideAreaCallbacks.push(callback)
        },

        runAnimation() {
            runAnimationCallbacks.forEach(cb => cb())
        },

        stopAnimation() {
            stopAnimationCallbacks.forEach(cb => cb())
        },

        onRunAnimation(callback) {
            runAnimationCallbacks.push(callback)
        },

        onStopAnimation(callback) {
            stopAnimationCallbacks.push(callback)
        },
    }

    provide(EDITOR_CONTEXT_KEY, context)
    return context
}

/**
 * 注入编辑器上下文（在子组件中调用）
 */
export function useEditorContext(): EditorContext {
    const context = inject(EDITOR_CONTEXT_KEY)
    if (!context) {
        throw new Error('useEditorContext() 必须在 provideEditorContext() 的子组件中使用')
    }
    return context
}
