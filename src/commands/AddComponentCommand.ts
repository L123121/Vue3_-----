import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentData } from '@/types'
import { nanoid } from 'nanoid'

interface AddData {
    component: ComponentData
    index?: number
}

/**
 * 新增组件命令
 */
export class AddComponentCommand extends BaseCommand {
    type = CommandType.ADD_COMPONENT
    description = '添加组件'
    mergeable = false

    private addData: AddData

    constructor(component: ComponentData, index?: number) {
        super()
        this.id = nanoid()
        this.addData = {
            component: structuredClone(component),
            index,
        }
        this.data = this.addData as unknown as Record<string, unknown>
    }

    execute(): void {
        const ctx = getContext()
        if (this.addData.index !== undefined) {
            ctx.insert(this.addData.component, this.addData.index)
        } else {
            ctx.insert(this.addData.component)
        }
    }

    undo(): void {
        const ctx = getContext()
        ctx.remove(this.addData.component.id)
        if (ctx.curComponent?.id === this.addData.component.id) {
            ctx.setCurComponent(null)
        }
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.ADD_COMPONENT, (env: CommandEnvelope) => {
    const d = env.data as unknown as AddData
    const cmd = new AddComponentCommand(d.component, d.index)
    cmd.id = env.id
    return cmd
})
