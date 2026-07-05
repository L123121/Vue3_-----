import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import { nanoid } from 'nanoid'

/**
 * 图层操作类型
 */
export type LayerAction = 'up' | 'down' | 'top' | 'bottom'

interface LayerData {
    componentId: string
    action: LayerAction
    oldIndex: number
    newIndex: number
}

const ACTION_TO_TYPE: Record<LayerAction, CommandType> = {
    up: CommandType.LAYER_UP,
    down: CommandType.LAYER_DOWN,
    top: CommandType.LAYER_TOP,
    bottom: CommandType.LAYER_BOTTOM,
}

const ACTION_TO_DESC: Record<LayerAction, string> = {
    up: '上移图层',
    down: '下移图层',
    top: '置顶图层',
    bottom: '置底图层',
}

/**
 * 图层操作命令
 *
 * 注意:实际数组位置移动在 execute 时计算并写入 data(oldIndex/newIndex),
 * 反序列化重建的命令会从 data 读已计算的索引,无需重新计算。
 */
export class LayerCommand extends BaseCommand {
    type = CommandType.LAYER_UP
    description = '图层操作'
    mergeable = false

    private layerData: LayerData

    constructor(componentId: string, action: LayerAction) {
        super()
        this.id = nanoid()
        this.type = ACTION_TO_TYPE[action]
        this.description = ACTION_TO_DESC[action]
        this.layerData = { componentId, action, oldIndex: -1, newIndex: -1 }
        this.data = this.layerData as unknown as Record<string, unknown>
    }

    execute(): void {
        const ctx = getContext()
        const currentIndex = ctx.indexOf(this.layerData.componentId)
        if (currentIndex === -1) return

        this.layerData.oldIndex = currentIndex
        const all = ctx.getAll()
        let newIndex = currentIndex

        switch (this.layerData.action) {
            case 'up':
                if (currentIndex < all.length - 1) newIndex = currentIndex + 1
                break
            case 'down':
                if (currentIndex > 0) newIndex = currentIndex - 1
                break
            case 'top':
                if (currentIndex < all.length - 1) newIndex = all.length - 1
                break
            case 'bottom':
                if (currentIndex > 0) newIndex = 0
                break
        }

        if (newIndex !== currentIndex) {
            this.layerData.newIndex = newIndex
            ctx.moveIndex(currentIndex, newIndex)
            if (ctx.curComponent?.id === this.layerData.componentId) {
                ctx.setCurComponent(this.layerData.componentId)
            }
        }
        // 同步 data(供序列化)
        this.data = { ...this.layerData } as unknown as Record<string, unknown>
    }

    undo(): void {
        const ctx = getContext()
        if (this.layerData.oldIndex !== -1 && this.layerData.newIndex !== -1) {
            // 反向交换
            ctx.moveIndex(this.layerData.newIndex, this.layerData.oldIndex)
            if (ctx.curComponent?.id === this.layerData.componentId) {
                ctx.setCurComponent(this.layerData.componentId)
            }
        }
    }

    canMergeWith(): boolean {
        return false // 图层操作不可合并
    }

    merge(other: Command): Command {
        return other
    }
}

// 反序列化:从 data 恢复 action 与索引,undo 直接用已计算索引
register(CommandType.LAYER_UP, (env: CommandEnvelope) => rebuildLayer(env))
register(CommandType.LAYER_DOWN, (env: CommandEnvelope) => rebuildLayer(env))
register(CommandType.LAYER_TOP, (env: CommandEnvelope) => rebuildLayer(env))
register(CommandType.LAYER_BOTTOM, (env: CommandEnvelope) => rebuildLayer(env))

function rebuildLayer(env: CommandEnvelope): LayerCommand {
    const d = env.data as unknown as LayerData
    const cmd = new LayerCommand(d.componentId, d.action)
    cmd.id = env.id
    // 恢复已计算的索引,使 undo 在跨会话恢复后仍可用
    ;(cmd as unknown as { layerData: LayerData }).layerData = { ...d }
    cmd.data = { ...d } as unknown as Record<string, unknown>
    return cmd
}
