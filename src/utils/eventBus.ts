/**
 * 事件总线 - 类型安全的发布订阅模式实现
 * Vue 3 移除了 $on $off $emit，使用此类替代
 */

/**
 * 事件映射表：事件名 → 回调参数类型
 * 新增事件只需在此添加一行即可获得类型提示
 */
export interface EventMap {
  runAnimation: []
  stopAnimation: []
  preview: [screenshot: boolean]
  save: []
  clearCanvas: []
  hideArea: []
  componentClick: []
  move: [isDown: boolean, isRight: boolean]
  unmove: []
  'v-click': [id: string]
  'v-hover': [id: string]
}

type EventName = keyof EventMap
type EventCallback<T extends EventName> = (...args: EventMap[T]) => void

class EventBus {
    private events = new Map<string, Array<(...args: unknown[]) => void>>()

    /**
   * 订阅事件
   */
    on<T extends EventName>(event: T, callback: EventCallback<T>): void {
        const list = this.events.get(event)
        const cb = callback as (...args: unknown[]) => void
        if (list) {
            list.push(cb)
        } else {
            this.events.set(event, [cb])
        }
    }

    /**
   * 取消订阅事件
   * 不传 callback 则清空该事件所有监听器
   */
    off<T extends EventName>(event: T, callback?: EventCallback<T>): void {
        const list = this.events.get(event)
        if (!list) return

        if (!callback) {
            this.events.set(event, [])
        } else {
            const cb = callback as (...args: unknown[]) => void
            this.events.set(event, list.filter(c => c !== cb))
        }
    }

    /**
   * 触发事件
   */
    emit<T extends EventName>(event: T, ...args: EventMap[T]): void {
        const list = this.events.get(event)
        if (!list) return
        list.forEach(cb => cb(...args))
    }

    /**
   * 一次性订阅事件（触发后自动取消）
   */
    once<T extends EventName>(event: T, callback: EventCallback<T>): void {
        const wrapper = (...args: EventMap[T]): void => {
            this.off(event, wrapper as EventCallback<T>)
            callback(...args)
        }
        this.on(event, wrapper as EventCallback<T>)
    }
}

export default new EventBus()
