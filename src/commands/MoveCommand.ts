import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type PositionData, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentStyle } from '@/types'
import { nanoid } from 'nanoid'

/** 去掉 patch 中值为 undefined 的字段,避免 Object.assign 用 undefined 覆盖现有值 */
function stripUndefined(style: Partial<ComponentStyle>): Partial<ComponentStyle> {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(style)) {
        if (v !== undefined) result[k] = v
    }
    return result as Partial<ComponentStyle>
}

/**
 * 移动组件命令
 */
export class MoveCommand extends BaseCommand {
    type = CommandType.MOVE_COMPONENT
    description = '移动组件'
    mergeable = true

    private positionData: PositionData

    constructor(
        componentId: string,
        oldStyle: Partial<ComponentStyle>,
        newStyle: Partial<ComponentStyle>,
    ) {
        super()
        this.id = nanoid()
        this.positionData = {
            componentId,
            oldStyle: { top: oldStyle.top, left: oldStyle.left },
            newStyle: { top: newStyle.top, left: newStyle.left },
        }
        this.data = this.positionData as unknown as Record<string, unknown>
    }

    execute(): void {
        getContext().setStyle(this.positionData.componentId, stripUndefined({
            top: this.positionData.newStyle.top,
            left: this.positionData.newStyle.left,
        }))
    }

    undo(): void {
        getContext().setStyle(this.positionData.componentId, stripUndefined({
            top: this.positionData.oldStyle.top,
            left: this.positionData.oldStyle.left,
        }))
    }

    canMergeWith(other: Command, _mergeTimeWindow: number): boolean {
        if (other.type !== CommandType.MOVE_COMPONENT) return false
        if (!(other instanceof MoveCommand)) return false

        return this.positionData.componentId === other.positionData.componentId
    }

    merge(other: Command): MoveCommand {
        if (!(other instanceof MoveCommand)) return this

        return new MoveCommand(
            this.positionData.componentId,
            this.positionData.oldStyle,
            other.positionData.newStyle,
        )
    }
}

// 反序列化工厂:从信封重建 MoveCommand
register(CommandType.MOVE_COMPONENT, (env: CommandEnvelope) => {
    const d = env.data as unknown as PositionData
    const cmd = new MoveCommand(d.componentId, d.oldStyle, d.newStyle)
    cmd.id = env.id
    return cmd
})
