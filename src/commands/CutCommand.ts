import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentData, CopyData } from '@/types'
import { nanoid } from 'nanoid'

function cloneComponent(component: ComponentData): ComponentData {
    return structuredClone(component)
}

function cloneCopyData(copyData: CopyData): CopyData {
    return {
        data: cloneComponent(copyData.data),
        index: copyData.index,
        isCut: copyData.isCut,
    }
}

interface CutData {
    componentId: string
    index?: number
    /** 撤销所需的运行时快照 */
    previousCopyData: CopyData | null
    restoredPreviousCut: boolean
    restoredComponentId: string | null
    deletedComponent: ComponentData | null
    deletedIndex: number
    /** 剪切后写入剪贴板的数据(用于 undo 还原剪贴板) */
    newCopyData: CopyData | null
}

/**
 * 剪切命令（复合操作）：
 * 1. 若存在上一次未粘贴的剪切数据，则先还原
 * 2. 删除当前目标组件并写入新的剪贴板数据
 *
 * 注意:copyData 是纯本地状态,不参与协同同步(剪贴板不该共享给他人)。
 */
export class CutCommand extends BaseCommand {
    type = CommandType.CUT_COMPONENT
    description = '剪切组件'
    mergeable = false

    private cutData: CutData

    constructor(componentId: string, index?: number) {
        super()
        this.id = nanoid()
        this.cutData = {
            componentId,
            index,
            previousCopyData: null,
            restoredPreviousCut: false,
            restoredComponentId: null,
            deletedComponent: null,
            deletedIndex: -1,
            newCopyData: null,
        }
        this.data = this.cutData as unknown as Record<string, unknown>
    }

    execute(): void {
        const ctx = getContext()

        this.cutData.previousCopyData = ctx.clipboard ? cloneCopyData(ctx.clipboard) : null
        this.cutData.restoredPreviousCut = false
        this.cutData.restoredComponentId = null
        this.cutData.deletedComponent = null
        this.cutData.deletedIndex = -1

        let targetIndex = this.cutData.index ?? ctx.indexOf(this.cutData.componentId)
        if (targetIndex < 0 || targetIndex >= ctx.getAll().length) return

        const previousCut = ctx.clipboard?.isCut ? cloneCopyData(ctx.clipboard) : null
        if (previousCut) {
            ctx.insert(previousCut.data, previousCut.index)
            this.cutData.restoredPreviousCut = true
            this.cutData.restoredComponentId = previousCut.data.id

            if (targetIndex >= previousCut.index) {
                targetIndex += 1
            }
        }

        const target = ctx.getAll()[targetIndex]
        if (!target) return

        this.cutData.deletedComponent = target
        this.cutData.deletedIndex = targetIndex
        ctx.removeAt(targetIndex)

        if (ctx.curComponent?.id === target.id) {
            ctx.setCurComponent(null)
        }

        this.cutData.newCopyData = {
            data: cloneComponent(target),
            index: targetIndex,
            isCut: true,
        }
        ctx.setClipboard(this.cutData.newCopyData)

        // 同步快照到 data(供序列化)
        this.data = { ...this.cutData } as unknown as Record<string, unknown>
    }

    undo(): void {
        const ctx = getContext()
        if (!this.cutData.deletedComponent || this.cutData.deletedIndex === -1) return

        ctx.insert(this.cutData.deletedComponent, this.cutData.deletedIndex)

        if (this.cutData.restoredPreviousCut && this.cutData.restoredComponentId) {
            ctx.remove(this.cutData.restoredComponentId)
        }

        ctx.setClipboard(this.cutData.previousCopyData ? cloneCopyData(this.cutData.previousCopyData) : null)
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.CUT_COMPONENT, (env: CommandEnvelope) => {
    const d = env.data as unknown as CutData
    const cmd = new CutCommand(d.componentId, d.index)
    cmd.id = env.id
    ;(cmd as unknown as { cutData: CutData }).cutData = {
        ...d,
        // 深拷贝恢复快照,避免后续 undo 时共享引用
        previousCopyData: d.previousCopyData ? cloneCopyData(d.previousCopyData) : null,
        deletedComponent: d.deletedComponent ? cloneComponent(d.deletedComponent) : null,
        newCopyData: d.newCopyData ? cloneCopyData(d.newCopyData) : null,
    }
    cmd.data = (cmd as unknown as { cutData: CutData }).cutData as unknown as Record<string, unknown>
    return cmd
})
