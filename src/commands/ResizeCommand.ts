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
 * 缩放组件命令
 */
export class ResizeCommand extends BaseCommand {
    type = CommandType.RESIZE_COMPONENT
    description = '缩放组件'
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
            oldStyle: {
                width: oldStyle.width,
                height: oldStyle.height,
                top: oldStyle.top,
                left: oldStyle.left,
            },
            newStyle: {
                width: newStyle.width,
                height: newStyle.height,
                top: newStyle.top,
                left: newStyle.left,
            },
        }
        this.data = this.positionData as unknown as Record<string, unknown>
    }

    execute(): void {
        getContext().setStyle(this.positionData.componentId, stripUndefined(this.positionData.newStyle) as Partial<ComponentStyle>)
    }

    undo(): void {
        getContext().setStyle(this.positionData.componentId, stripUndefined(this.positionData.oldStyle) as Partial<ComponentStyle>)
    }

    canMergeWith(other: Command, _mergeTimeWindow: number): boolean {
        if (other.type !== CommandType.RESIZE_COMPONENT) return false
        if (!(other instanceof ResizeCommand)) return false

        return this.positionData.componentId === other.positionData.componentId
    }

    merge(other: Command): ResizeCommand {
        if (!(other instanceof ResizeCommand)) return this

        return new ResizeCommand(
            this.positionData.componentId,
            this.positionData.oldStyle,
            other.positionData.newStyle,
        )
    }
}

register(CommandType.RESIZE_COMPONENT, (env: CommandEnvelope) => {
    const d = env.data as unknown as PositionData
    const cmd = new ResizeCommand(d.componentId, d.oldStyle, d.newStyle)
    cmd.id = env.id
    return cmd
})
