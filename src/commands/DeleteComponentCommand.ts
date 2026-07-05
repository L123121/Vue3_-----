import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentData } from '@/types'
import { nanoid } from 'nanoid'

interface DeleteData {
    componentId: string
    index?: number
    /** 撤销恢复所需的快照 */
    deletedComponent: ComponentData | null
    deletedIndex: number
    deletedChildren: ComponentData[]
    deletedChildIndices: number[]
}

/**
 * 删除组件命令
 * 若删除的是容器组件，会同时删除其所有子组件（parentId 指向该容器）
 */
export class DeleteComponentCommand extends BaseCommand {
    type = CommandType.DELETE_COMPONENT
    description = '删除组件'
    mergeable = false

    private deleteData: DeleteData

    constructor(componentId: string, index?: number) {
        super()
        this.id = nanoid()
        this.deleteData = {
            componentId,
            index,
            deletedComponent: null,
            deletedIndex: -1,
            deletedChildren: [],
            deletedChildIndices: [],
        }
        this.data = this.deleteData as unknown as Record<string, unknown>
    }

    execute(): void {
        const ctx = getContext()
        const all = ctx.getAll()
        const idx = this.deleteData.index ?? ctx.indexOf(this.deleteData.componentId)
        if (idx < 0 || idx >= all.length) return

        this.deleteData.deletedIndex = idx
        this.deleteData.deletedComponent = structuredClone(all[idx])

        // 级联收集子组件(通过 parentId 关联)
        this.deleteData.deletedChildren = []
        this.deleteData.deletedChildIndices = []
        const collectChildren = (parentId: string): void => {
            for (let i = all.length - 1; i >= 0; i--) {
                const c = all[i]
                if (c.parentId === parentId) {
                    this.deleteData.deletedChildren.push(structuredClone(c))
                    this.deleteData.deletedChildIndices.push(i)
                    collectChildren(c.id)
                }
            }
        }
        collectChildren(this.deleteData.componentId)

        // 从后往前删除(避免索引错乱)
        const allIndices = [idx, ...this.deleteData.deletedChildIndices].sort((a, b) => b - a)
        for (const i of allIndices) {
            ctx.removeAt(i)
        }

        if (ctx.curComponent?.id === this.deleteData.componentId) {
            ctx.setCurComponent(null)
        }

        // 同步快照到 data
        this.data = { ...this.deleteData } as unknown as Record<string, unknown>
    }

    undo(): void {
        const ctx = getContext()
        if (!this.deleteData.deletedComponent || this.deleteData.deletedIndex < 0) return

        ctx.insert(structuredClone(this.deleteData.deletedComponent), this.deleteData.deletedIndex)

        for (let i = 0; i < this.deleteData.deletedChildren.length; i++) {
            const childIdx = this.deleteData.deletedChildIndices[i]
            if (childIdx >= 0) {
                ctx.insert(structuredClone(this.deleteData.deletedChildren[i]), childIdx)
            }
        }
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.DELETE_COMPONENT, (env: CommandEnvelope) => {
    const d = env.data as unknown as DeleteData
    const cmd = new DeleteComponentCommand(d.componentId, d.index)
    cmd.id = env.id
    ;(cmd as unknown as { deleteData: DeleteData }).deleteData = {
        ...d,
        deletedComponent: d.deletedComponent ? structuredClone(d.deletedComponent) : null,
        deletedChildren: (d.deletedChildren ?? []).map(c => structuredClone(c)),
    }
    cmd.data = (cmd as unknown as { deleteData: DeleteData }).deleteData as unknown as Record<string, unknown>
    return cmd
})
